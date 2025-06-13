import { mockTriggerResponse } from "./mock-data"

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

async function triggerN8nWorkflow(workflowId: string, payload?: any, triggerType?: string) {
  // Check if environment variables are set
  const n8nBaseUrl = process.env.N8N_BASE_URL
  const n8nApiKey = process.env.N8N_API_KEY

  if (!n8nBaseUrl || !n8nApiKey) {
    console.log("N8N environment variables not configured, using mock response")
    return mockTriggerResponse.n8n
  }

  try {
    let url = `${n8nBaseUrl}/rest/workflows/${workflowId}/run`

    // If it's a webhook trigger, use the webhook URL instead
    if (triggerType === "webhook") {
      url = `${n8nBaseUrl}/webhook/${workflowId}`
    }

    console.log(`Triggering n8n workflow at: ${url}`)

    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${n8nApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload || {}),
      },
      5000,
    )

    if (!response.ok) {
      throw new Error(`n8n API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error triggering n8n workflow:", error)
    console.log("Using mock n8n trigger response")
    return mockTriggerResponse.n8n
  }
}

async function triggerLangflowWorkflow(flowId: string, payload?: any) {
  // Check if environment variables are set
  const langflowBaseUrl = process.env.LANGFLOW_BASE_URL
  const langflowApiKey = process.env.LANGFLOW_API_KEY

  if (!langflowBaseUrl || !langflowApiKey) {
    console.log("Langflow environment variables not configured, using mock response")
    return mockTriggerResponse.langflow
  }

  try {
    const url = `${langflowBaseUrl}/api/v1/run/${flowId}`
    console.log(`Triggering Langflow workflow at: ${url}`)

    const requestBody = payload || {
      input_value: "Manual trigger from FlowBit Dashboard",
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
      5000,
    )

    if (!response.ok) {
      throw new Error(`Langflow API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error triggering Langflow workflow:", error)
    console.log("Using mock Langflow trigger response")
    return mockTriggerResponse.langflow
  }
}

// Handle schedule triggers (in a real app, this would connect to a scheduler service)
async function scheduleWorkflow(workflowId: string, engine: string, cronExpression: string) {
  // This is a mock implementation - in a real app, you would connect to a scheduler service
  console.log(`Scheduling workflow ${workflowId} with cron expression: ${cronExpression}`)

  return {
    success: true,
    scheduled: true,
    workflowId,
    engine,
    cronExpression,
    message: "Workflow scheduled successfully (mock)",
  }
}

export async function triggerWorkflow(workflowId: string, engine: string, triggerType = "manual", payload?: any) {
  // Handle different trigger types
  if (triggerType === "schedule" && payload?.cronExpression) {
    return await scheduleWorkflow(workflowId, engine, payload.cronExpression)
  } else if (engine === "n8n") {
    return await triggerN8nWorkflow(workflowId, payload, triggerType)
  } else if (engine === "langflow") {
    return await triggerLangflowWorkflow(workflowId, payload)
  } else {
    throw new Error("Unsupported engine or trigger type")
  }
}
