import { NextResponse } from "next/server"

// Mock data for when API connections fail
const mockMessages = [
  {
    id: "msg-8",
    executionId: "langflow-exec-10",
    workflowId: "6491cae3-136c-4af1-b00c-ba5b9b7ebe36",
    workflowName: "Classifier Agent",
    engine: "langflow",
    direction: "outgoing",
    recipient: "router@internal",
    content: "Input classified as 'invoice-related'. Routing to PDF Agent for extraction.",
    timestamp: "13.06.2025 10:16:01",
    folderId: "langflow",
    metadata: {
      category: "invoice",
      confidence: 0.94,
      source: "email-attachment",
    },
  },
  {
    id: "msg-9",
    executionId: "langflow-exec-11",
    workflowId: "bcd1136b-b975-4697-8118-b5a9124c164f",
    workflowName: "Email Agent",
    engine: "langflow",
    direction: "incoming",
    sender: "inbox@company.com",
    content: "New customer email received. Subject: 'Pricing inquiry for enterprise plan'.",
    timestamp: "13.06.2025 10:14:43",
    folderId: "langflow",
    metadata: {
      subject: "Pricing inquiry for enterprise plan",
      priority: "high",
      threadId: "email-thread-9821",
    },
  },
  {
    id: "msg-10",
    executionId: "langflow-exec-12",
    workflowId: "bdc81e87-c9d6-4430-8f5f-52e4ea5225a0",
    workflowName: "JSON Agent",
    engine: "langflow",
    direction: "outgoing",
    recipient: "storage@internal",
    content: "Validated and stored 42 JSON records from API payload into the internal DB.",
    timestamp: "13.06.2025 10:13:57",
    folderId: "langflow",
    metadata: {
      recordsProcessed: 42,
      source: "api-external-v2",
      schemaVersion: "1.3.7",
    },
  },
];


// Function to extract messages from Langflow execution data
function extractMessagesFromLangflowExecution(execution: any): any[] {
  const messages: any[] = []

  try {
    if (!execution || !execution.executionData || !execution.executionData.outputs) {
      return []
    }

    const { outputs } = execution.executionData

    // Look for chat nodes or message outputs
    Object.entries(outputs).forEach(([nodeName, nodeData]: [string, any]) => {
      if (nodeData && typeof nodeData === "object") {
        // Chat message detection
        if (nodeData.messages || nodeData.message || nodeData.content || nodeData.text) {
          const content = nodeData.messages?.[0]?.content || nodeData.message || nodeData.content || nodeData.text

          if (content) {
            messages.push({
              id: `msg-${execution.id}-${nodeName}-${Date.now()}`,
              executionId: execution.id,
              workflowId: execution.workflowId,
              workflowName: execution.workflowName || "Unknown Flow",
              engine: "langflow",
              direction: nodeName.toLowerCase().includes("input") ? "incoming" : "outgoing",
              content: content,
              timestamp: new Date().toLocaleString("de-DE"),
              folderId: execution.folderId || "unassigned",
              metadata: {
                node: nodeName,
                type: nodeData.type || "unknown",
                role: nodeData.messages?.[0]?.role || "system",
              },
            })
          }
        }

        // API call detection
        if (nodeData.status === "success" && nodeData.data && (nodeData.data.url || nodeData.data.endpoint)) {
          messages.push({
            id: `msg-${execution.id}-${nodeName}-${Date.now()}`,
            executionId: execution.id,
            workflowId: execution.workflowId,
            workflowName: execution.workflowName || "Unknown Flow",
            engine: "langflow",
            direction: "outgoing",
            recipient: nodeData.data.url || nodeData.data.endpoint,
            content: `API call to ${nodeData.data.url || nodeData.data.endpoint} completed successfully.`,
            timestamp: new Date().toLocaleString("de-DE"),
            folderId: execution.folderId || "unassigned",
            metadata: {
              method: nodeData.data.method || "GET",
              statusCode: nodeData.data.status || 200,
              responseSize: JSON.stringify(nodeData.data.response || {}).length,
            },
          })
        }
      }
    })
  } catch (error) {
    console.error("Error extracting messages from Langflow execution:", error)
  }

  return messages
}

// Fetch executions and extract messages
async function fetchMessagesFromExecutions() {
  try {
    // Fetch executions from the API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/executions`)

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const executions = data.executions || []
    const usingMockData = data.usingMockData || false

    // If we're using mock data, return mock messages
    if (usingMockData) {
      return { messages: mockMessages, usingMockData: true }
    }

    // Extract messages from executions
    let allMessages: any[] = []

    executions.forEach((execution: any) => {
      if (execution.engine === "langflow") {
        const messages = extractMessagesFromLangflowExecution(execution)
        allMessages = [...allMessages, ...messages]
      }
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
    return { messages: mockMessages, usingMockData: true, error: (error as Error).message }
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
      messages: mockMessages,
      usingMockData: true,
      error: "An unexpected error occurred while fetching messages",
    })
  }
}
