import { NextResponse } from "next/server"
import { getExecution } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const runId = params.id

  // Set up SSE headers
  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  }

  try {
    // Create a TransformStream to handle the SSE
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    // Get the current execution state
    const execution = await getExecution(runId)

    if (!execution) {
      await writer.write(encoder.encode(`data: ${JSON.stringify({ error: "Execution not found" })}\n\n`))
      await writer.close()
      return new Response(stream.readable, { headers })
    }

    // Send the initial state
    await writer.write(
      encoder.encode(
        `data: ${JSON.stringify({
          type: "init",
          status: execution.status,
          timestamp: new Date().toISOString(),
        })}\n\n`,
      ),
    )

    // If the execution is already completed, send an end event
    if (execution.status !== "RUNNING") {
      await writer.write(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "end",
            status: execution.status,
            timestamp: new Date().toISOString(),
          })}\n\n`,
        ),
      )
      await writer.close()
      return new Response(stream.readable, { headers })
    }

    // Set up a polling interval to check for updates
    const intervalId = setInterval(async () => {
      try {
        const updatedExecution = await getExecution(runId)

        if (!updatedExecution) {
          clearInterval(intervalId)
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: "Execution not found",
                timestamp: new Date().toISOString(),
              })}\n\n`,
            ),
          )
          await writer.close()
          return
        }

        // Send an update
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "update",
              status: updatedExecution.status,
              timestamp: new Date().toISOString(),
            })}\n\n`,
          ),
        )

        // If the execution is completed, send an end event and close the stream
        if (updatedExecution.status !== "RUNNING") {
          clearInterval(intervalId)
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "end",
                status: updatedExecution.status,
                timestamp: new Date().toISOString(),
              })}\n\n`,
            ),
          )
          await writer.close()
        }
      } catch (error) {
        console.error("Error in SSE interval:", error)
        clearInterval(intervalId)
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              message: (error as Error).message,
              timestamp: new Date().toISOString(),
            })}\n\n`,
          ),
        )
        await writer.close()
      }
    }, 2000) // Poll every 2 seconds

    // Handle client disconnect
    request.signal.addEventListener("abort", () => {
      clearInterval(intervalId)
      writer.close()
    })

    return new Response(stream.readable, { headers })
  } catch (error) {
    console.error("Error setting up SSE:", error)
    return NextResponse.json({ error: "Failed to set up stream" }, { status: 500 })
  }
}

// Helper function to encode data
const encoder = new TextEncoder()
