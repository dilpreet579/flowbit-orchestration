import { NextResponse } from "next/server"
import { scheduleJob } from "@/lib/cron"

// Mock response for when API connections fail
const mockTriggerResponse = {
  n8n: {
    success: true,
    executionId: "mock-execution-id",
    message: "Workflow triggered successfully (mock)",
  },
  langflow: {
    success: true,
    run_id: "mock-run-id",
    message: "Flow triggered successfully (mock)",
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

async function triggerN8nWorkflow(workflowId: string, payload?: any, triggerType?: string) {
  // Check if environment variables are set
  const n8nBaseUrl = process.env.N8N_BASE_URL
  const n8nApiKey = process.env.N8N_API_KEY

  if (!n8nBaseUrl || !n8nApiKey) {
    console.log("N8N environment variables not configured, using mock response")
    return mockTriggerResponse.n8n
  }

  try {
    let url = `${n8nBaseUrl}/rest/workflows/${workflowId}/run`

    // If it's a webhook trigger, use the webhook URL instead
    if (triggerType === "webhook") {
      url = `${n8nBaseUrl}/webhook/${workflowId}`
    }

    console.log(`Triggering n8n workflow at: ${url}`)

    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${n8nApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload || {}),
      },
      5000,
    )

    if (!response.ok) {
      throw new Error(`n8n API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error triggering n8n workflow:", error)
    console.log("Using mock n8n trigger response")
    return mockTriggerResponse.n8n
  }
}

async function triggerLangflowWorkflow(flowId: string, payload?: any) {
  // Check if environment variables are set
  const langflowBaseUrl = process.env.LANGFLOW_BASE_URL
  const langflowApiKey = process.env.LANGFLOW_API_KEY

  if (!langflowBaseUrl || !langflowApiKey) {
    console.log("Langflow environment variables not configured, using mock response")
    return mockTriggerResponse.langflow
  }

  try {
    const url = `${langflowBaseUrl}/api/v1/run/${flowId}`
    console.log(`Triggering Langflow workflow at: ${url}`)

    // Use the provided payload or a default one
    const requestBody = payload?.inputPayload || {
      input_value: payload?.input || "Manual trigger from FlowBit Dashboard",
      input_type: "chat",
      output_type: "chat",
    }

    console.log("Request body:", requestBody)

    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": langflowApiKey,
        },
        body: JSON.stringify(requestBody),
      },
      5000,
    )

    if (!response.ok) {
      throw new Error(`Langflow API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error triggering Langflow workflow:", error)
    console.log("Using mock Langflow trigger response")
    return mockTriggerResponse.langflow
  }
}

// Handle schedule triggers
async function scheduleWorkflow(workflowId: string, engine: string, cronExpression: string, payload?: any) {
  try {
    const jobId = `${engine}-${workflowId}`

    // Schedule the job with the cron expression
    await scheduleJob({
      id: jobId,
      cronExpression,
      workflowId,
      engine,
      payload,
    })

    return {
      success: true,
      scheduled: true,
      jobId,
      workflowId,
      engine,
      cronExpression,
      message: "Workflow scheduled successfully",
    }
  } catch (error) {
    console.error("Error scheduling workflow:", error)
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const { workflowId, engine, triggerType, payload, cronExpression } = await request.json()

    if (!workflowId || !engine) {
      return NextResponse.json({ error: "Missing workflowId or engine" }, { status: 400 })
    }

    console.log(`Triggering workflow: ${workflowId}, engine: ${engine}, type: ${triggerType || "manual"}`)

    let result = null

    // Handle different trigger types
    if (triggerType === "schedule" && cronExpression) {
      result = await scheduleWorkflow(workflowId, engine, cronExpression, payload)
    } else if (engine === "n8n") {
      result = await triggerN8nWorkflow(workflowId, payload, triggerType)
    } else if (engine === "langflow") {
      result = await triggerLangflowWorkflow(workflowId, payload)
    } else {
      return NextResponse.json({ error: "Unsupported engine" }, { status: 400 })
    }

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error("Error triggering workflow:", error)
    return NextResponse.json({ error: "Failed to trigger workflow" }, { status: 500 })
  }
}

// Add webhook endpoint support
export async function GET(request: Request) {
  const url = new URL(request.url)
  const pathParts = url.pathname.split("/")

  // Check if this is a webhook request
  if (pathParts.includes("webhook") && pathParts.length >= 5) {
    const engine = pathParts[pathParts.indexOf("webhook") + 1]
    const workflowId = pathParts[pathParts.indexOf("webhook") + 2]

    if (!workflowId || !engine) {
      return NextResponse.json({ error: "Invalid webhook URL" }, { status: 400 })
    }

    // Return webhook documentation
    return NextResponse.json({
      success: true,
      message: "Webhook endpoint is active",
      usage: {
        method: "POST",
        contentType: "application/json",
        url: `${url.origin}/api/webhook/${engine}/${workflowId}`,
      },
    })
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 })
}
