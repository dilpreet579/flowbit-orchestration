import { NextResponse } from "next/server"

// Mock execution details for when API connections fail
const mockExecutionDetails = {
  langflow: {
    "langflow-exec-1": {
      id: "langflow-exec-1",
      flow_name: "ETL Pipeline",
      status: "SUCCESS",
      timestamp: "2024-01-15T14:20:08.000Z",
      duration: 45.2,
      trigger_type: "schedule",
      logs: [
        { level: "INFO", timestamp: "2024-01-15T14:20:08.000Z", message: "Flow execution started" },
        { level: "INFO", timestamp: "2024-01-15T14:20:53.000Z", message: "Flow execution completed" },
      ],
      outputs: {
        "Data Source": {
          status: "success",
          data: { records: 1250, source: "postgres://localhost:5432/source_db" },
        },
        Transform: {
          status: "success",
          data: { transformations: ["join", "filter"], records_processed: 1250 },
        },
      },
    }
  },
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

async function fetchLangflowExecutionDetails(runId: string) {
  // Check if environment variables are set
  const langflowBaseUrl = process.env.LANGFLOW_BASE_URL
  const langflowApiKey = process.env.LANGFLOW_API_KEY

  if (!langflowBaseUrl || !langflowApiKey) {
    console.log("Langflow environment variables not configured, using mock data")
    return mockExecutionDetails.langflow[runId as keyof typeof mockExecutionDetails.langflow] || null
  }

  try {
    const url = `${langflowBaseUrl}/api/v1/runs/${runId}`
    console.log(`Fetching Langflow execution details from: ${url}`)

    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          "x-api-key": langflowApiKey,
          "Content-Type": "application/json",
        },
      },
      5000,
    )

    if (!response.ok) {
      throw new Error(`Langflow API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching Langflow execution details:", error)
    console.log("Using mock Langflow execution details")
    return mockExecutionDetails.langflow[runId as keyof typeof mockExecutionDetails.langflow] || null
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const engine = searchParams.get("engine")
    const executionId = params.id

    console.log(`Fetching execution details for ID: ${executionId}, engine: ${engine}`)

    let executionDetails = null

    executionDetails = await fetchLangflowExecutionDetails(executionId)

    if (!executionDetails) {
      console.log(`No execution details found for ID: ${executionId}`)
      return NextResponse.json({ error: "Execution not found" }, { status: 404 })
    }

    return NextResponse.json({ execution: executionDetails })
  } catch (error) {
    console.error("Error fetching execution details:", error)
    return NextResponse.json({ error: "Failed to fetch execution details" }, { status: 500 })
  }
}
