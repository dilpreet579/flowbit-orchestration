import { NextResponse } from "next/server"
import { scheduleJob } from "@/lib/cron"
import { storeExecution, updateExecution } from "@/lib/db"
import { v4 as uuidv4 } from "uuid"

// Create a timeout promise
function createTimeoutPromise(ms: number) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Request timeout")), ms)
  })
}

// Fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 7000) {
  try {
    const fetchPromise = fetch(url, options)
    const timeoutPromise = createTimeoutPromise(timeoutMs)

    return (await Promise.race([fetchPromise, timeoutPromise])) as Response
  } catch (error) {
    throw error
  }
}

async function triggerLangflowWorkflow(flowId: string, payload?: any, triggerType?: string) {
  // Check if environment variables are set
  const langflowBaseUrl = process.env.LANGFLOW_BASE_URL
  const langflowApiKey = process.env.LANGFLOW_API_KEY

  if (!langflowBaseUrl || !langflowApiKey) {
    console.log("Langflow environment variables not configured")
    throw new Error("Langflow API not configured")
  }

  try {
    // First, get the flow details to get the flow name
    const flowDetailsUrl = `${langflowBaseUrl}/api/v1/flows/${flowId}`
    console.log(`Fetching flow details from: ${flowDetailsUrl}`)

    const flowDetailsResponse = await fetchWithTimeout(flowDetailsUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": langflowApiKey,
      },
    })

    if (!flowDetailsResponse.ok) {
      throw new Error(`Langflow API error: ${flowDetailsResponse.status} ${flowDetailsResponse.statusText}`)
    }

    const flowDetails = await flowDetailsResponse.json()
    const flowName = flowDetails.name || "Unknown Flow"

    //the nodes
    const nodeIds: { [key: string]: { status: string } } = {}
    flowDetails.data.nodes.forEach((node: any) => {
      const id = node.data.id
      nodeIds[id] = { status: "success" }
    })

    // Create a new execution record with initial status
    const executionId = uuidv4()
    const timestamp = new Date().toISOString()

    await storeExecution({
      id: executionId,
      flow_id: flowId,
      flow_name: flowName,
      status: "RUNNING",
      timestamp: timestamp,
      trigger_type: triggerType || "manual",
      inputs: payload?.inputPayload || {},
      tags: flowDetails.tags || [],
      logs: [
        {
          level: "INFO",
          message: "Flow execution started",
          timestamp: timestamp,
        },
      ],
    })

    // Now trigger the flow
    const triggerUrl = `${langflowBaseUrl}/api/v1/run/${flowId}`
    console.log(`Triggering Langflow workflow at: ${triggerUrl}`)

    // Use the provided payload or a default one
    const requestBody = payload?.inputPayload || {
      input_value: payload?.input || "Manual trigger from FlowBit Dashboard",
      input_type: "chat",
      output_type: "chat",
    }

    console.log("Request body:", requestBody)

    const response = await fetchWithTimeout(triggerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": langflowApiKey,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      // Update execution with error status
      await updateExecution(executionId, {
        status: "ERROR",
        error: `Langflow API error: ${response.status} ${response.statusText}`,
        logs: [
          {
            level: "ERROR",
            message: `Flow execution failed: ${response.status} ${response.statusText}`,
            timestamp: new Date().toISOString(),
          },
        ],
      })

      throw new Error(`Langflow API error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()

    // Extract outputs from the response
    // const outputs = result.outputs?.[0]?.outputs?.[0]?.outputs || {}

    // Update the execution with success status and outputs
    await updateExecution(executionId, {
      status: "SUCCESS",
      duration: (new Date().getTime() - new Date(timestamp).getTime()) / 1000,
      outputs: nodeIds,
      logs: [
        {
          level: "INFO",
          message: "Flow execution completed successfully",
          timestamp: new Date().toISOString(),
        },
      ],
    })

    return {
      success: true,
      run_id: executionId,
      message: "Flow triggered successfully",
      result,
    }
  } catch (error) {
    console.error("Error triggering Langflow workflow:", error)
    throw error
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

// Handle webhook triggers
export async function triggerWorkflow(workflowId: string, engine: string, triggerType: string, payload?: any) {
  // Handle different trigger types
  if (engine === "langflow") {
    return await triggerLangflowWorkflow(workflowId, payload, triggerType)
  } else {
    throw new Error("Unsupported engine or trigger type")
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
      console.log("Scheduling workflow:", workflowId, engine, cronExpression, payload)
      result = await scheduleWorkflow(workflowId, engine, cronExpression, payload)
    } else if (engine === "langflow") {
      result = await triggerLangflowWorkflow(workflowId, payload, triggerType)
    } else {
      return NextResponse.json({ error: "Unsupported engine" }, { status: 400 })
    }

    console.log("Result:", result)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error("Error triggering workflow:", error)
    return NextResponse.json(
      { error: "Failed to trigger workflow", message: (error as Error).message },
      { status: 500 },
    )
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
