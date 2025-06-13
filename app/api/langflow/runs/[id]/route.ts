import { NextResponse } from "next/server"
import { getExecution } from "@/lib/db"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const runId = params.id

    console.log(`Fetching execution details for ID: ${runId}`)

    // Get execution from the database
    const execution = await getExecution(runId)

    if (!execution) {
      return NextResponse.json(
        {
          error: `Execution with ID ${runId} not found`,
        },
        { status: 404 },
      )
    }

    return NextResponse.json({ run: execution, usingMockData: false })
  } catch (error) {
    console.error("Error fetching execution details:", error)
    return NextResponse.json(
      {
        error: `Failed to fetch execution details: ${(error as Error).message}`,
      },
      { status: 500 },
    )
  }
}
