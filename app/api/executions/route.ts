import { NextResponse } from "next/server"

// Mock data for when API connections fail

const mockLangflowExecutions = [
  {
    id: "langflow-exec-1",
    workflowId: "wf-5",
    workflowName: "ETL Pipeline",
    engine: "langflow",
    status: "success",
    duration: "45.2s",
    startTime: "15.01.2024 14:20:08",
    triggerType: "schedule",
    folderId: "data-processing",
    executionData: {
      outputs: {
        "Data Source": { status: "success", data: { records: 1250 } },
        Transform: { status: "success", data: { transformations: ["join", "filter"] } },
      },
    },
  }
]

// Create a timeout promise
function createTimeoutPromise(ms: number) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Request timeout")), ms)
  })
}

// Fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 50000) {
  try {
    const fetchPromise = fetch(url, options)
    const timeoutPromise = createTimeoutPromise(timeoutMs)

    return (await Promise.race([fetchPromise, timeoutPromise])) as Response
  } catch (error) {
    throw error
  }
}

// Langflow API integration with improved error handling
async function fetchLangflowExecutions() {
  // Check if environment variables are set
  const langflowBaseUrl = process.env.LANGFLOW_BASE_URL
  const langflowApiKey = process.env.LANGFLOW_API_KEY

  console.log("Langflow Configuration:", {
    baseUrl: langflowBaseUrl ? "Set" : "Not set",
    apiKey: langflowApiKey ? "Set" : "Not set",
  })

  if (!langflowBaseUrl || !langflowApiKey) {
    console.log("Langflow environment variables not configured, using mock data")
    return mockLangflowExecutions
  }

  try {
    const url = `${langflowBaseUrl}/api/v1/runs`
    console.log(`Attempting to fetch Langflow executions from: ${url}`)

    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          "x-api-key": langflowApiKey,
          "Content-Type": "application/json",
        },
      },
      5000,
    ) // 5 second timeout

    console.log(`Langflow API Response Status: ${response.status}`)

    if (!response.ok) {
      throw new Error(`Langflow API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`Langflow API returned ${data.runs?.length || 0} executions`)

    return data.runs.map((run: any) => ({
      id: run.id,
      workflowId: run.flow_id,
      workflowName: run.flow_name || "Unknown Flow",
      engine: "langflow",
      status: run.status === "SUCCESS" ? "success" : run.status === "ERROR" ? "error" : "running",
      duration: run.duration ? `${run.duration.toFixed(1)}s` : "N/A",
      startTime: new Date(run.timestamp)
        .toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
        .replace(",", ""),
      triggerType: run.trigger_type || "manual",
      folderId: run.tags?.[0] || "unassigned",
      executionData: run,
    }))
  } catch (error) {
    console.error("Error fetching Langflow executions:", error)
    console.log("Falling back to mock Langflow execution data")
    return mockLangflowExecutions
  }
}

export async function GET() {
  try {
    console.log("=== Fetching executions from all sources ===")

    // Use Promise.allSettled to handle cases where one API fails but the other succeeds
    const [langflowResult] = await Promise.allSettled([fetchLangflowExecutions()])

    // Extract results or use empty arrays for failed promises
    const langflowExecutions = langflowResult.status === "fulfilled" ? langflowResult.value : mockLangflowExecutions

    console.log(`Langflow executions: ${langflowExecutions.length}`)

    const allExecutions = [...langflowExecutions]
      .sort((a, b) => {
        // Parse dates for proper comparison
        const dateA = a.startTime.split(" ")[0].split(".").reverse().join("-") + " " + a.startTime.split(" ")[1]
        const dateB = b.startTime.split(" ")[0].split(".").reverse().join("-") + " " + b.startTime.split(" ")[1]
        return new Date(dateB).getTime() - new Date(dateA).getTime()
      })
      .slice(0, 50) // Last 50 executions

    console.log(`Returning ${allExecutions.length} total executions`)

    // Determine if we're using any mock data
    const usingMockData =
      langflowResult.status === "rejected" ||
      !process.env.LANGFLOW_BASE_URL ||
      !process.env.LANGFLOW_API_KEY

    return NextResponse.json({
      executions: allExecutions,
      usingMockData,
      message: usingMockData ? "Using mock data due to API configuration or connection issues" : "Live data",
    })
  } catch (error) {
    console.error("Unexpected error in executions API route:", error)

    // Return mock data as ultimate fallback
    const mockExecutions = [...mockLangflowExecutions].sort((a, b) => {
      const dateA = a.startTime.split(" ")[0].split(".").reverse().join("-") + " " + a.startTime.split(" ")[1]
      const dateB = b.startTime.split(" ")[0].split(".").reverse().join("-") + " " + b.startTime.split(" ")[1]
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })

    return NextResponse.json({
      executions: mockExecutions,
      usingMockData: true,
      message: "Using mock data due to unexpected error",
    })
  }
}
