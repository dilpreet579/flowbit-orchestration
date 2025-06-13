import { NextResponse } from "next/server"

// Generate a mock run with detailed information
function generateMockRun(id: string) {
  const statuses = ["SUCCESS", "ERROR", "RUNNING"]
  const status = statuses[Math.floor(Math.random() * statuses.length)]
  const startTime = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000))
  const duration = Math.random() * 60

  // Generate mock logs
  const logs = Array.from({ length: Math.floor(Math.random() * 20) + 5 }, (_, i) => ({
    level: ["INFO", "WARNING", "ERROR"][Math.floor(Math.random() * 3)],
    message: `Log message ${i + 1} for run ${id}`,
    timestamp: new Date(startTime.getTime() + i * 1000).toISOString(),
  }))

  // Generate mock node outputs
  const nodeTypes = ["llm", "prompt", "memory", "vectorstore", "embedding", "parser", "tool"]
  const nodes = {}

  for (let i = 0; i < Math.floor(Math.random() * 5) + 3; i++) {
    const nodeType = nodeTypes[Math.floor(Math.random() * nodeTypes.length)]
    const nodeName = `${nodeType}_${i + 1}`

    nodes[nodeName] = {
      type: nodeType,
      status: status === "ERROR" && i === 0 ? "ERROR" : "SUCCESS",
      duration: Math.random() * 10,
      data: {
        input: { text: "Sample input" },
        output:
          nodeType === "llm"
            ? { text: "This is a sample response from the language model." }
            : { result: "Sample output data" },
      },
      error: status === "ERROR" && i === 0 ? "Error processing node" : null,
    }
  }

  // Generate mock messages for chat nodes
  const messages = []
  if (Math.random() > 0.5) {
    messages.push({
      role: "user",
      content: "What can you tell me about this data?",
      timestamp: new Date(startTime.getTime()).toISOString(),
    })

    if (status !== "RUNNING") {
      messages.push({
        role: "assistant",
        content: "Based on the data provided, I can see several trends emerging. The main points are...",
        timestamp: new Date(startTime.getTime() + 2000).toISOString(),
      })
    }
  }

  return {
    id,
    flow_id: `flow-${Math.floor(Math.random() * 5) + 1}`,
    flow_name: [
      "Customer Support Bot",
      "Data Analysis Pipeline",
      "Content Generator",
      "Document Processor",
      "Knowledge Base QA",
    ][Math.floor(Math.random() * 5)],
    status,
    duration,
    timestamp: startTime.toISOString(),
    inputs: { query: "Sample input query" },
    outputs: nodes,
    logs,
    messages,
    error: status === "ERROR" ? "Error occurred during flow execution" : null,
  }
}

// Create a timeout promise
function createTimeoutPromise(ms: number) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Request timeout")), ms)
  })
}

// Fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 5000) {
  try {
    const fetchPromise = fetch(url, options)
    const timeoutPromise = createTimeoutPromise(timeoutMs)

    return (await Promise.race([fetchPromise, timeoutPromise])) as Response
  } catch (error) {
    throw error
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const runId = params.id

    // Check if environment variables are set
    const langflowBaseUrl = process.env.LANGFLOW_BASE_URL
    const langflowApiKey = process.env.LANGFLOW_API_KEY

    if (!langflowBaseUrl || !langflowApiKey) {
      console.log("Langflow environment variables not configured, using mock data")
      return NextResponse.json({ run: generateMockRun(runId), usingMockData: true })
    }

    // Build the API URL
    const apiUrl = `${langflowBaseUrl}/api/v1/runs/${runId}`
    console.log(`Fetching Langflow run details from: ${apiUrl}`)

    const response = await fetchWithTimeout(
      apiUrl,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${langflowApiKey}`,
          "Content-Type": "application/json",
        },
      },
      5000,
    )

    if (!response.ok) {
      throw new Error(`Langflow API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json({ run: data, usingMockData: false })
  } catch (error) {
    console.error("Error fetching Langflow run details:", error)
    return NextResponse.json({
      run: generateMockRun(params.id),
      usingMockData: true,
      error: (error as Error).message,
    })
  }
}
