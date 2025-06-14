import { NextResponse } from "next/server"
import { triggerWorkflow } from "@/app/api/trigger/route"
import { storeExecution, updateExecution } from "@/lib/db"
import { v4 as uuidv4 } from "uuid"

// Validate engine type 
// Add n8n here when we have it
function isValidEngine(engine: string): boolean {
  return ["langflow"].includes(engine.toLowerCase())
}

// Handle POST requests (webhook triggers)
export async function POST(request: Request, { params }: { params: { engine: string; id: string } }) {
  const startTime = Date.now()
  let executionId: string | null = null

  try {
    const { engine, id } = params

    // Validate parameters
    if (!engine || !id) {
      return NextResponse.json(
        { 
          success: false,
          error: "Missing engine or workflow ID" 
        }, 
        { status: 400 }
      )
    }

    // Validate engine type
    if (!isValidEngine(engine)) {
      return NextResponse.json(
        { 
          success: false,
          error: `Invalid engine type. Supported engines: langflow` 
        }, 
        { status: 400 }
      )
    }

    // Parse the request body
    let payload
    try {
      payload = await request.json()
    } catch (error) {
      console.error("Error parsing request body:", error)
      payload = { text: "Empty or invalid JSON payload" }
    }

    // Create initial execution record
    executionId = await storeExecution({
      flow_id: id,
      flow_name: `${engine.toUpperCase()} Workflow ${id}`,
      status: "RUNNING",
      trigger_type: "webhook",
      inputs: payload,
      logs: [
        {
          level: "info",
          message: `Webhook received for ${engine} workflow ${id}`,
          timestamp: new Date().toISOString(),
        },
      ],
    })

    console.log(`Processing webhook for ${engine} workflow ${id}`)

    // Trigger the workflow with the webhook payload
    const result = await triggerWorkflow(id, engine, "webhook", payload)

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
      execution_id: executionId,
      result,
    })
  } catch (error) {
    console.error("Error in webhook trigger:", error)
    
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
      { status: 500 }
    )
  }
}

// Handle GET requests (webhook documentation)
export async function GET(request: Request, { params }: { params: { engine: string; id: string } }) {
  const { engine, id } = params
  const url = new URL(request.url)

  // Validate engine type
  if (!isValidEngine(engine)) {
    return NextResponse.json(
      { 
        success: false,
        error: `Invalid engine type. Supported engines: langflow, n8n` 
      }, 
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    message: "Webhook endpoint is active",
    usage: {
      method: "POST",
      contentType: "application/json",
      url: `${url.origin}/api/webhook/${engine}/${id}`,
      workflowId: id,
      engine: engine,
      description: `Send any JSON payload to trigger this ${engine.toUpperCase()} workflow`,
      example: {
        curl: `curl -X POST ${url.origin}/api/webhook/${engine}/${id} \\
  -H "Content-Type: application/json" \\
  -d '{"key": "value"}'`,
      },
    },
  })
}
