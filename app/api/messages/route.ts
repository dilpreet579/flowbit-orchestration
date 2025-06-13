import { NextResponse } from "next/server"

// Mock data for when API connections fail
const mockMessages = [
  {
    id: "msg-1",
    executionId: "n8n-exec-1",
    workflowId: "wf-1",
    workflowName: "Email Processor",
    engine: "n8n",
    direction: "outgoing",
    recipient: "customer@example.com",
    content: "Thank you for your inquiry. Your request has been received and will be processed shortly.",
    timestamp: "15.01.2024 14:32:10",
    folderId: "unassigned",
    metadata: {
      subject: "Request Confirmation",
      template: "inquiry-confirmation",
      attachments: 0,
    },
  },
  {
    id: "msg-2",
    executionId: "n8n-exec-2",
    workflowId: "wf-3",
    workflowName: "Lead Scoring",
    engine: "n8n",
    direction: "outgoing",
    recipient: "sales@company.com",
    content: "New lead scored at 85/100. High priority follow-up recommended.",
    timestamp: "15.01.2024 14:26:15",
    folderId: "marketing",
    metadata: {
      leadScore: 85,
      source: "website-form",
      tags: ["high-priority", "b2b"],
    },
  },
  {
    id: "msg-3",
    executionId: "langflow-exec-1",
    workflowId: "wf-5",
    workflowName: "ETL Pipeline",
    engine: "langflow",
    direction: "outgoing",
    recipient: "data-warehouse",
    content: "Daily data extraction complete. 1,245 records processed and loaded into the data warehouse.",
    timestamp: "15.01.2024 14:25:33",
    folderId: "data-processing",
    metadata: {
      recordsProcessed: 1245,
      tables: ["customers", "orders", "products"],
      duration: "5m 12s",
    },
  },
  {
    id: "msg-4",
    executionId: "n8n-exec-3",
    workflowId: "wf-6",
    workflowName: "Report Generator",
    engine: "n8n",
    direction: "incoming",
    sender: "scheduler@internal",
    content: "Scheduled report generation triggered. Generating monthly sales report.",
    timestamp: "15.01.2024 14:35:10",
    folderId: "data-processing",
    metadata: {
      reportType: "monthly-sales",
      format: "pdf",
      recipients: ["executive-team@company.com"],
    },
  },
  {
    id: "msg-5",
    executionId: "langflow-exec-2",
    workflowId: "wf-2",
    workflowName: "Data Sync",
    engine: "langflow",
    direction: "incoming",
    sender: "api@external-service.com",
    content: "Received 156 new customer records for synchronization.",
    timestamp: "15.01.2024 14:16:33",
    folderId: "unassigned",
    metadata: {
      source: "external-crm",
      recordType: "customer",
      count: 156,
    },
  },
  {
    id: "msg-6",
    executionId: "langflow-exec-3",
    workflowId: "wf-4",
    workflowName: "Campaign Tracker",
    engine: "langflow",
    direction: "outgoing",
    recipient: "marketing@company.com",
    content: "Campaign performance alert: Click-through rate below threshold (1.2%). Review recommended.",
    timestamp: "15.01.2024 14:11:15",
    folderId: "marketing",
    metadata: {
      campaignId: "summer-promo-2023",
      metrics: {
        impressions: 45000,
        clicks: 540,
        ctr: 0.012,
      },
      threshold: 0.015,
    },
  },
  {
    id: "msg-7",
    executionId: "n8n-exec-1",
    workflowId: "wf-1",
    workflowName: "Email Processor",
    engine: "n8n",
    direction: "incoming",
    sender: "customer@example.com",
    content: "I have a question about my recent order #12345. When can I expect it to be delivered?",
    timestamp: "15.01.2024 14:30:45",
    folderId: "unassigned",
    metadata: {
      category: "support",
      priority: "medium",
      orderReference: "12345",
    },
  },
]

// Function to extract messages from n8n execution data
function extractMessagesFromN8nExecution(execution: any): any[] {
  const messages: any[] = []

  try {
    if (!execution || !execution.executionData || !execution.executionData.data) {
      return []
    }

    const { resultData } = execution.executionData.data

    if (!resultData || !resultData.runData) {
      return []
    }

    // Look for email nodes
    Object.entries(resultData.runData).forEach(([nodeName, nodeData]: [string, any]) => {
      if (Array.isArray(nodeData) && nodeData.length > 0) {
        nodeData.forEach((execution: any) => {
          if (execution.data?.json) {
            // Email node detection
            if (nodeName.toLowerCase().includes("email") || nodeName.toLowerCase().includes("mail")) {
              const data = execution.data.json

              if (data.to || data.subject || data.html || data.text) {
                messages.push({
                  id: `msg-${execution.executionId}-${nodeName}-${Date.now()}`,
                  executionId: execution.executionId || execution.id,
                  workflowId: execution.workflowId,
                  workflowName: execution.workflowName || "Unknown Workflow",
                  engine: "n8n",
                  direction: "outgoing",
                  recipient: data.to || "unknown-recipient",
                  content: data.text || data.html || "No content",
                  timestamp: new Date().toLocaleString("de-DE"),
                  folderId: execution.folderId || "unassigned",
                  metadata: {
                    subject: data.subject || "No subject",
                    from: data.from || "system@flowbit.ai",
                    cc: data.cc,
                    bcc: data.bcc,
                    attachments: data.attachments?.length || 0,
                  },
                })
              }
            }

            // Slack message detection
            if (nodeName.toLowerCase().includes("slack")) {
              const data = execution.data.json

              if (data.text || data.blocks) {
                messages.push({
                  id: `msg-${execution.executionId}-${nodeName}-${Date.now()}`,
                  executionId: execution.executionId || execution.id,
                  workflowId: execution.workflowId,
                  workflowName: execution.workflowName || "Unknown Workflow",
                  engine: "n8n",
                  direction: "outgoing",
                  recipient: data.channel || "unknown-channel",
                  content: data.text || JSON.stringify(data.blocks) || "No content",
                  timestamp: new Date().toLocaleString("de-DE"),
                  folderId: execution.folderId || "unassigned",
                  metadata: {
                    channel: data.channel,
                    username: data.username,
                    blocks: data.blocks?.length || 0,
                  },
                })
              }
            }

            // Generic message detection
            if (data.message || data.content || data.body) {
              messages.push({
                id: `msg-${execution.executionId}-${nodeName}-${Date.now()}`,
                executionId: execution.executionId || execution.id,
                workflowId: execution.workflowId,
                workflowName: execution.workflowName || "Unknown Workflow",
                engine: "n8n",
                direction: data.incoming ? "incoming" : "outgoing",
                recipient: data.recipient || data.to || "unknown-recipient",
                sender: data.sender || data.from,
                content: data.message || data.content || data.body || "No content",
                timestamp: new Date().toLocaleString("de-DE"),
                folderId: execution.folderId || "unassigned",
                metadata: {
                  ...data,
                  // Remove redundant fields from metadata
                  message: undefined,
                  content: undefined,
                  body: undefined,
                  recipient: undefined,
                  to: undefined,
                  sender: undefined,
                  from: undefined,
                },
              })
            }
          }
        })
      }
    })
  } catch (error) {
    console.error("Error extracting messages from n8n execution:", error)
  }

  return messages
}

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
      if (execution.engine === "n8n") {
        const messages = extractMessagesFromN8nExecution(execution)
        allMessages = [...allMessages, ...messages]
      } else if (execution.engine === "langflow") {
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
