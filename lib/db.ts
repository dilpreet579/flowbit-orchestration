import sqlite3 from "sqlite3"
import { open, type Database } from "sqlite"
import path from "path"
import fs from "fs"
import { v4 as uuidv4 } from "uuid"

// Types
export interface ExecutionData {
  id?: string
  flow_id: string
  flow_name: string
  status: string
  duration?: number | null
  timestamp?: string
  trigger_type?: string
  inputs?: Record<string, any>
  outputs?: Record<string, any>
  error?: string | null
  tags?: string[] | null
  logs?: Array<{
    level: string
    message: string
    timestamp?: string
  }>
}

export interface Execution extends ExecutionData {
  id: string
  timestamp: string
  trigger_type: string
}

interface DbExecution {
  id: string
  flow_id: string
  flow_name: string
  status: string
  duration: number | null
  timestamp: string
  trigger_type: string
  inputs: string | null
  outputs: string | null
  error: string | null
  tags: string | null
}

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), "data")
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, "flowbit.db")

// Database connection singleton
let dbPromise: Promise<Database> | null = null

export async function getDb() {
  if (!dbPromise) {
    dbPromise = open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    const db = await dbPromise
    
    // Enable foreign keys
    await db.run("PRAGMA foreign_keys = ON")

    // Create tables if they don't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS executions (
        id TEXT PRIMARY KEY,
        flow_id TEXT NOT NULL,
        flow_name TEXT NOT NULL,
        status TEXT NOT NULL,
        duration REAL,
        timestamp TEXT NOT NULL,
        trigger_type TEXT DEFAULT 'manual',
        inputs TEXT,
        outputs TEXT,
        error TEXT,
        tags TEXT
      );

      CREATE TABLE IF NOT EXISTS execution_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        execution_id TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS execution_nodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        execution_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        node_name TEXT NOT NULL,
        status TEXT NOT NULL,
        data TEXT,
        error TEXT,
        FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE
      );
    `)
  }

  return dbPromise
}

// Function to store a new execution
export async function storeExecution(executionData: ExecutionData): Promise<string> {
  const db = await getDb()
  const executionId = executionData.id || uuidv4()

  try {
    await db.run("BEGIN TRANSACTION")

    // Store main execution data
    await db.run(
      `INSERT INTO executions (
        id, flow_id, flow_name, status, duration, timestamp, trigger_type, inputs, outputs, error, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        executionId,
        executionData.flow_id,
        executionData.flow_name,
        executionData.status || "RUNNING",
        executionData.duration || null,
        executionData.timestamp || new Date().toISOString(),
        executionData.trigger_type || "manual",
        executionData.inputs ? JSON.stringify(executionData.inputs) : null,
        executionData.outputs ? JSON.stringify(executionData.outputs) : null,
        executionData.error || null,
        executionData.tags ? JSON.stringify(executionData.tags) : null,
      ],
    )

    // Store logs if available
    if (executionData.logs && Array.isArray(executionData.logs)) {
      const logStmt = await db.prepare(
        `INSERT INTO execution_logs (execution_id, level, message, timestamp) VALUES (?, ?, ?, ?)`,
      )

      for (const log of executionData.logs) {
        await logStmt.run([executionId, log.level, log.message, log.timestamp || new Date().toISOString()])
      }

      await logStmt.finalize()
    }

    // Store node data if available
    if (executionData.outputs && typeof executionData.outputs === "object") {
      const nodeStmt = await db.prepare(
        `INSERT INTO execution_nodes (execution_id, node_id, node_name, status, data, error) VALUES (?, ?, ?, ?, ?, ?)`,
      )

      for (const [nodeName, nodeData] of Object.entries(executionData.outputs)) {
        const nodeStatus = (nodeData as any).error ? "ERROR" : "SUCCESS"

        await nodeStmt.run([
          executionId,
          `node-${nodeName}-${executionId.substring(0, 8)}`,
          nodeName,
          nodeStatus,
          JSON.stringify((nodeData as any).data || {}),
          (nodeData as any).error ? JSON.stringify((nodeData as any).error) : null,
        ])
      }

      await nodeStmt.finalize()
    }

    await db.run("COMMIT")
    return executionId
  } catch (error) {
    await db.run("ROLLBACK")
    console.error("Error storing execution:", error)
    throw new Error(`Failed to store execution: ${(error as Error).message}`)
  }
}

// Function to update an existing execution
export async function updateExecution(executionId: string, updateData: Partial<ExecutionData>): Promise<boolean> {
  const db = await getDb()

  try {
    await db.run("BEGIN TRANSACTION")

    // Build the SET clause dynamically based on provided fields
    const updates: string[] = []
    const values: any[] = []

    if (updateData.status !== undefined) {
      updates.push("status = ?")
      values.push(updateData.status)
    }

    if (updateData.duration !== undefined) {
      updates.push("duration = ?")
      values.push(updateData.duration)
    }

    if (updateData.outputs !== undefined) {
      updates.push("outputs = ?")
      values.push(JSON.stringify(updateData.outputs))
    }

    if (updateData.error !== undefined) {
      updates.push("error = ?")
      values.push(updateData.error)
    }

    if (updates.length > 0) {
      // Add the execution ID to the values array
      values.push(executionId)

      // Execute the update
      const result = await db.run(`UPDATE executions SET ${updates.join(", ")} WHERE id = ?`, values)

      if (!result.changes || result.changes === 0) {
        throw new Error(`Execution with ID ${executionId} not found`)
      }
    }

    // Update node data if available
    if (updateData.outputs && typeof updateData.outputs === "object") {
      for (const [nodeName, nodeData] of Object.entries(updateData.outputs)) {
        const nodeStatus = (nodeData as any).error ? "ERROR" : "SUCCESS"

        // Check if node exists
        const existingNode = await db.get("SELECT id FROM execution_nodes WHERE execution_id = ? AND node_name = ?", [
          executionId,
          nodeName,
        ])

        if (existingNode) {
          // Update existing node
          await db.run(
            `UPDATE execution_nodes SET status = ?, data = ?, error = ? WHERE execution_id = ? AND node_name = ?`,
            [
              nodeStatus,
              JSON.stringify((nodeData as any).data || {}),
              (nodeData as any).error ? JSON.stringify((nodeData as any).error) : null,
              executionId,
              nodeName,
            ],
          )
        } else {
          // Insert new node
          await db.run(
            `INSERT INTO execution_nodes (execution_id, node_id, node_name, status, data, error) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              executionId,
              `node-${nodeName}-${executionId.substring(0, 8)}`,
              nodeName,
              nodeStatus,
              JSON.stringify((nodeData as any).data || {}),
              (nodeData as any).error ? JSON.stringify((nodeData as any).error) : null,
            ],
          )
        }
      }
    }

    // Add logs if available
    if (updateData.logs && Array.isArray(updateData.logs)) {
      const logStmt = await db.prepare(
        `INSERT INTO execution_logs (execution_id, level, message, timestamp) VALUES (?, ?, ?, ?)`,
      )

      for (const log of updateData.logs) {
        await logStmt.run([executionId, log.level, log.message, log.timestamp || new Date().toISOString()])
      }

      await logStmt.finalize()
    }

    await db.run("COMMIT")
    return true
  } catch (error) {
    await db.run("ROLLBACK")
    console.error("Error updating execution:", error)
    throw new Error(`Failed to update execution: ${(error as Error).message}`)
  }
}

// Function to get all executions
export async function getAllExecutions(limit = 50, flowId?: string): Promise<Execution[]> {
  const db = await getDb()

  try {
    let query = "SELECT * FROM executions ORDER BY timestamp DESC"
    const params: any[] = []

    if (flowId) {
      query = "SELECT * FROM executions WHERE flow_id = ? ORDER BY timestamp DESC"
      params.push(flowId)
    }

    if (limit) {
      query += " LIMIT ?"
      params.push(limit)
    }

    const executions = await db.all(query, params) as DbExecution[]

    return executions.map((execution) => ({
      ...execution,
      inputs: execution.inputs ? JSON.parse(execution.inputs) : undefined,
      outputs: execution.outputs ? JSON.parse(execution.outputs) : undefined,
      tags: execution.tags ? JSON.parse(execution.tags) : undefined,
    }))
  } catch (error) {
    console.error("Error fetching executions:", error)
    throw new Error(`Failed to fetch executions: ${(error as Error).message}`)
  }
}

// Function to get a specific execution by ID
export async function getExecution(executionId: string): Promise<Execution | null> {
  const db = await getDb()

  try {
    // Get the main execution data
    const execution = await db.get("SELECT * FROM executions WHERE id = ?", [executionId]) as DbExecution

    if (!execution) {
      return null
    }

    // Parse JSON fields
    const parsedExecution: Execution = {
      ...execution,
      inputs: execution.inputs ? JSON.parse(execution.inputs) : undefined,
      outputs: execution.outputs ? JSON.parse(execution.outputs) : undefined,
      tags: execution.tags ? JSON.parse(execution.tags) : undefined,
    }

    // Get logs
    const logs = await db.all(
      "SELECT level, message, timestamp FROM execution_logs WHERE execution_id = ? ORDER BY timestamp ASC",
      [executionId],
    ) as Array<{ level: string; message: string; timestamp: string }>

    // Get node data
    const nodes = await db.all("SELECT node_name, status, data, error FROM execution_nodes WHERE execution_id = ?", [
      executionId,
    ]) as Array<{ node_name: string; status: string; data: string | null; error: string | null }>

    // Format node data
    const formattedNodes: Record<string, any> = {}
    for (const node of nodes) {
      formattedNodes[node.node_name] = {
        status: node.status,
        data: node.data ? JSON.parse(node.data) : {},
        error: node.error ? JSON.parse(node.error) : null,
      }
    }

    return {
      ...parsedExecution,
      logs,
      outputs: formattedNodes,
    }
  } catch (error) {
    console.error("Error fetching execution:", error)
    throw new Error(`Failed to fetch execution: ${(error as Error).message}`)
  }
}

// Function to delete an execution
export async function deleteExecution(executionId: string): Promise<boolean> {
  const db = await getDb()

  try {
    await db.run("BEGIN TRANSACTION")

    // Delete related logs and nodes first (due to foreign key constraints)
    await db.run("DELETE FROM execution_logs WHERE execution_id = ?", [executionId])
    await db.run("DELETE FROM execution_nodes WHERE execution_id = ?", [executionId])

    // Delete the execution
    const result = await db.run("DELETE FROM executions WHERE id = ?", [executionId])

    await db.run("COMMIT")
    return Boolean(result.changes && result.changes > 0)
  } catch (error) {
    await db.run("ROLLBACK")
    console.error("Error deleting execution:", error)
    throw new Error(`Failed to delete execution: ${(error as Error).message}`)
  }
}
