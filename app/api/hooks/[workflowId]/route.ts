import { NextResponse } from "next/server"
import { storeExecution, updateExecution } from "@/lib/db"

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

// Forward request to LangFlow
async function forwardToLangflow(workflowId: string, payload: any) {
  // Check if environment variables are set
  const langflowBaseUrl = process.env.LANGFLOW_BASE_URL
  const langflowApiKey = process.env.LANGFLOW_API_KEY

  if (!langflowBaseUrl || !langflowApiKey) {
    throw new Error("Langflow environment variables not configured")
  }

  try {
    const url = `${langflowBaseUrl}/api/v1/run/${workflowId}`
    console.log(`Forwarding webhook to Langflow at: ${url}`)

    // Prepare the request body
    const requestBody = {
      input_value: payload,
      input_type: "chat",
      output_type: "chat",
    }

    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${langflowApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
      10000, // Longer timeout for webhook forwarding
    )

    if (!response.ok) {
      throw new Error(`Langflow API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error forwarding to Langflow:", error)
    throw error
  }
}

// Handle GET requests (webhook documentation)
export async function GET(request: Request, { params }: { params: { workflowId: string } }) {
  const workflowId = params.workflowId
  const url = new URL(request.url)

  return NextResponse.json({
    success: true,
    message: "Webhook endpoint is active",
    workflowId,
    usage: {
      method: "POST",
      contentType: "application/json",
      url: `${url.origin}/api/hooks/${workflowId}`,
      description: "Send any JSON payload to trigger this LangFlow workflow",
    },
  })
}

// Handle POST requests (actual webhook triggers)
export async function POST(request: Request, { params }: { params: { workflowId: string } }) {
  const startTime = Date.now()
  let executionId: string | null = null

  try {
    const workflowId = params.workflowId

    // Parse the request body
    let payload
    try {
      payload = await request.json()
    } catch (error) {
      console.error("Error parsing request body:", error)
      payload = { text: "Empty or invalid JSON payload" }
    }

    console.log(`Webhook received for workflow ${workflowId}`)

    // Create initial execution record
    executionId = await storeExecution({
      flow_id: workflowId,
      flow_name: `Webhook Triggered Flow ${workflowId}`,
      status: "RUNNING",
      trigger_type: "webhook",
      inputs: payload,
      logs: [
        {
          level: "info",
          message: "Webhook received and processing started",
          timestamp: new Date().toISOString(),
        },
      ],
    })

    // Forward the request to LangFlow
    const result = await forwardToLangflow(workflowId, payload)

    // Calculate duration
    const duration = Date.now() - startTime

    // Update execution with success status
    await updateExecution(executionId, {
      status: "COMPLETED",
      duration,
      outputs: result,
      logs: [
        {
          level: "info",
          message: "Webhook processing completed successfully",
          timestamp: new Date().toISOString(),
        },
      ],
    })

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      execution_id: executionId,
      run_id: result.run_id,
      result,
    })
  } catch (error) {
    console.error("Error processing webhook:", error)
    
    // If we have an execution ID, update it with error status
    if (executionId) {
      try {
        await updateExecution(executionId, {
          status: "ERROR",
          duration: Date.now() - startTime,
          error: (error as Error).message,
          logs: [
            {
              level: "error",
              message: `Webhook processing failed: ${(error as Error).message}`,
              timestamp: new Date().toISOString(),
            },
          ],
        })
      } catch (updateError) {
        console.error("Error updating execution status:", updateError)
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        execution_id: executionId,
      },
      { status: 500 },
    )
  }
}
