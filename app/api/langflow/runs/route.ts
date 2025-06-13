import { NextResponse } from "next/server"

// Mock data for when API connections fail
const mockLangflowRuns = Array.from({ length: 50 }, (_, i) => ({
  id: `langflow-run-${i + 1}`,
  flow_id: `flow-${Math.floor(i / 10) + 1}`,
  flow_name: `${["Customer Support Bot", "Data Analysis Pipeline", "Content Generator", "Document Processor", "Knowledge Base QA"][Math.floor(Math.random() * 5)]}`,
  status: ["SUCCESS", "ERROR", "RUNNING"][Math.floor(Math.random() * 3)],
  duration: Math.random() * 60,
  timestamp: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
  inputs: { query: "Sample input query" },
}))

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

export async function GET(request: Request) {
  try {
    // Check if environment variables are set
    const langflowBaseUrl = process.env.LANGFLOW_BASE_URL
    const langflowApiKey = process.env.LANGFLOW_API_KEY

    if (!langflowBaseUrl || !langflowApiKey) {
      console.log("Langflow environment variables not configured, using mock data")
      return NextResponse.json({ runs: mockLangflowRuns, usingMockData: true })
    }

    // Get query parameters
    const url = new URL(request.url)
    const limit = url.searchParams.get("limit") || "50"
    const flowId = url.searchParams.get("flow_id") || undefined

    // Build the API URL
    let apiUrl = `${langflowBaseUrl}/api/v1/runs?limit=${limit}`
    if (flowId) {
      apiUrl += `&flow_id=${flowId}`
    }

    console.log(`Fetching Langflow runs from: ${apiUrl}`)

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
    return NextResponse.json({ runs: data, usingMockData: false })
  } catch (error) {
    console.error("Error fetching Langflow runs:", error)
    return NextResponse.json({ runs: mockLangflowRuns, usingMockData: true, error: (error as Error).message })
  }
}
