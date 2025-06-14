import { NextResponse } from "next/server"
import { getAllExecutions } from "@/lib/db"

// Function to extract messages from Langflow execution data
function extractMessagesFromLangflowExecution(execution: any): any[] {
  const messages: any[] = []

  try {
    // Always add a trigger message for each execution
    messages.push({
      id: `trigger-${execution.id}`,
      executionId: execution.id,
      workflowId: execution.flow_id,
      workflowName: execution.flow_name,
      engine: "system",
      direction: "outgoing",
      content: `${execution.flow_name} was triggered. Trigger type: ${execution.trigger_type}.`,
      timestamp: new Date(execution.timestamp).toLocaleString("de-DE"),
      folderId: "system",
      metadata: {
        type: "trigger",
        triggerType: execution.trigger_type || "manual",
        status: execution.status,
      },
    })

    
  } catch (error) {
    console.error("Error extracting messages from execution:", error)
  }

  return messages
}

// Fetch executions and extract messages
async function fetchMessagesFromExecutions() {
  try {
    // Fetch executions from the database
    const executions = await getAllExecutions(50)

    // Extract messages from executions
    let allMessages: any[] = []

    executions.forEach((execution: any) => {
      const messages = extractMessagesFromLangflowExecution(execution)
      allMessages = [...allMessages, ...messages]
    })

    // Sort messages by timestamp (newest first)
    allMessages.sort((a, b) => {
      const dateA = a.timestamp.split(" ")[0].split(".").reverse().join("-") + " " + a.timestamp.split(" ")[1]
      const dateB = b.timestamp.split(" ")[0].split(".").reverse().join("-") + " " + b.timestamp.split(" ")[1]
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })

    return { messages: allMessages, usingMockData: false }
  } catch (error) {
    console.error("Error fetching messages from executions:", error)
    return { messages: [], usingMockData: false, error: (error as Error).message }
  }
}

export async function GET() {
  try {
    const { messages, usingMockData, error } = await fetchMessagesFromExecutions()

    return NextResponse.json({
      messages,
      usingMockData,
      error,
    })
  } catch (error) {
    console.error("Unexpected error in messages API route:", error)

    return NextResponse.json({
      messages: [],
      usingMockData: false,
      error: "An unexpected error occurred while fetching messages",
    })
  }
}
