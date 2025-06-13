import { NextResponse } from "next/server"
import { getAllExecutions } from "@/lib/db"

export async function GET(request: Request) {
  try {
    // Get query parameters
    const url = new URL(request.url)
    const limit = Number.parseInt(url.searchParams.get("limit") || "50", 10)
    const flowId = url.searchParams.get("flow_id") || undefined

    console.log(`Fetching executions with limit: ${limit}, flowId: ${flowId || "all"}`)

    // Get executions from the database
    const executions = await getAllExecutions(limit, flowId)

    return NextResponse.json({ runs: executions, usingMockData: false })
  } catch (error) {
    console.error("Error fetching executions:", error)
    return NextResponse.json(
      {
        runs: [],
        usingMockData: false,
        error: (error as Error).message,
      },
      { status: 500 },
    )
  }
}
