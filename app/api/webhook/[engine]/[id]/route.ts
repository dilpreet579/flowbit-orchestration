import { NextResponse } from "next/server"
import { triggerWorkflow } from "@/app/api/trigger/actions"

export async function POST(request: Request, { params }: { params: { engine: string; id: string } }) {
  try {
    const { engine, id } = params

    if (!engine || !id) {
      return NextResponse.json({ error: "Missing engine or workflow ID" }, { status: 400 })
    }

    // Parse the request body
    let payload
    try {
      payload = await request.json()
    } catch (e) {
      payload = {}
    }

    // Trigger the workflow with the webhook payload
    const result = await triggerWorkflow(id, engine, "webhook", payload)

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error("Error in webhook trigger:", error)
    return NextResponse.json({ error: "Failed to trigger workflow via webhook" }, { status: 500 })
  }
}

export async function GET(request: Request, { params }: { params: { engine: string; id: string } }) {
  const { engine, id } = params
  const url = new URL(request.url)

  return NextResponse.json({
    success: true,
    message: "Webhook endpoint is active",
    usage: {
      method: "POST",
      contentType: "application/json",
      url: `${url.origin}/api/webhook/${engine}/${id}`,
      workflowId: id,
      engine: engine,
    },
  })
}
