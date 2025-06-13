// Create a timeout promise
function createTimeoutPromise(ms: number) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Request timeout")), ms)
  })
}

// Fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 10000) {
  try {
    const fetchPromise = fetch(url, options)
    const timeoutPromise = createTimeoutPromise(timeoutMs)

    return (await Promise.race([fetchPromise, timeoutPromise])) as Response
  } catch (error) {
    throw error
  }
}

// Generate mock stream data
function generateMockStreamData(runId: string) {
  const events = [
    { type: "start", data: { run_id: runId, status: "RUNNING" } },
    { type: "log", data: { level: "INFO", message: "Starting execution" } },
    { type: "node_start", data: { node_id: "node_1", node_name: "llm_1", node_type: "llm" } },
    {
      type: "node_end",
      data: { node_id: "node_1", node_name: "llm_1", status: "SUCCESS", output: { text: "Processing data..." } },
    },
    { type: "log", data: { level: "INFO", message: "Processing intermediate results" } },
    { type: "node_start", data: { node_id: "node_2", node_name: "parser_1", node_type: "parser" } },
    {
      type: "node_end",
      data: { node_id: "node_2", node_name: "parser_1", status: "SUCCESS", output: { result: "Parsed data" } },
    },
    {
      type: "message",
      data: { role: "assistant", content: "I've analyzed your request and found the following insights..." },
    },
    { type: "log", data: { level: "INFO", message: "Execution completed successfully" } },
    { type: "end", data: { run_id: runId, status: "SUCCESS" } },
  ]

  return events
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const runId = params.id

  // Check if environment variables are set
  const langflowBaseUrl = process.env.LANGFLOW_BASE_URL
  const langflowApiKey = process.env.LANGFLOW_API_KEY

  // If we're using mock data, return a ReadableStream that emits mock events
  if (!langflowBaseUrl || !langflowApiKey) {
    console.log("Langflow environment variables not configured, using mock stream")

    const mockEvents = generateMockStreamData(runId)

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          `data: ${JSON.stringify({ type: "mock_mode", data: { message: "Using mock data stream" } })}\n\n`,
        )

        for (const event of mockEvents) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          controller.enqueue(`data: ${JSON.stringify(event)}\n\n`)
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  }

  try {
    // Build the API URL for the stream
    const apiUrl = `${langflowBaseUrl}/api/v1/runs/${runId}/stream`
    console.log(`Connecting to Langflow stream at: ${apiUrl}`)

    const response = await fetchWithTimeout(
      apiUrl,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${langflowApiKey}`,
          "Content-Type": "application/json",
        },
      },
      10000,
    )

    if (!response.ok) {
      throw new Error(`Langflow API error: ${response.status} ${response.statusText}`)
    }

    // Forward the stream from Langflow to the client
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("Error connecting to Langflow stream:", error)

    // If there's an error, return a stream with an error message and then mock data
    const mockEvents = generateMockStreamData(runId)

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          `data: ${JSON.stringify({ type: "error", data: { message: (error as Error).message } })}\n\n`,
        )
        controller.enqueue(
          `data: ${JSON.stringify({ type: "mock_mode", data: { message: "Switching to mock data stream" } })}\n\n`,
        )

        for (const event of mockEvents) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          controller.enqueue(`data: ${JSON.stringify(event)}\n\n`)
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  }
}
