import fs from "fs"
import path from "path"
import { schedule, type ScheduledTask } from "node-cron"

// Define the job structure
interface CronJob {
  id: string
  cronExpression: string
  workflowId: string
  engine: string
  payload?: any
  lastRun?: string
  nextRun?: string
  active: boolean
}

// Extended ScheduledTask type to include nextDate method
interface ExtendedScheduledTask extends ScheduledTask {
  nextDate(): Date
}

// Store for active cron jobs
const activeJobs: Record<string, ScheduledTask> = {}

// Path to the JSON file for persistence
const CRON_JOBS_FILE = path.join(process.cwd(), "data", "cron-jobs.json")

// Ensure the data directory exists
function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), "data")
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Load jobs from the JSON file
function loadJobs(): CronJob[] {
  ensureDataDirectory()

  try {
    if (fs.existsSync(CRON_JOBS_FILE)) {
      const data = fs.readFileSync(CRON_JOBS_FILE, "utf8")
      return JSON.parse(data)
    }
  } catch (error) {
    console.error("Error loading cron jobs:", error)
  }

  return []
}

// Save jobs to the JSON file
function saveJobs(jobs: CronJob[]) {
  ensureDataDirectory()

  try {
    fs.writeFileSync(CRON_JOBS_FILE, JSON.stringify(jobs, null, 2))
  } catch (error) {
    console.error("Error saving cron jobs:", error)
  }
}

// Execute a job
async function executeJob(job: CronJob) {
  console.log(`Executing cron job: ${job.id} for workflow: ${job.workflowId}`)

  try {
    // Update job's last run time
    const jobs = loadJobs()
    const jobIndex = jobs.findIndex((j) => j.id === job.id)

    if (jobIndex !== -1) {
      jobs[jobIndex].lastRun = new Date().toISOString()
      saveJobs(jobs)
    }

    // Trigger the workflow
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/trigger`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workflowId: job.workflowId,
        engine: job.engine,
        triggerType: "cron",
        payload: job.payload,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log(`Cron job ${job.id} executed successfully:`, result)

    return result
  } catch (error) {
    console.error(`Error executing cron job ${job.id}:`, error)
    throw error
  }
}

// Calculate the next run time for a cron expression
function calculateNextRun(cronExpression: string): string {
  try {
    const task = schedule(cronExpression, () => {}) as ExtendedScheduledTask
    const nextDate = task.nextDate()
    task.stop()
    return nextDate.toISOString()
  } catch (error) {
    console.error("Error calculating next run:", error)
    return new Date().toISOString()
  }
}

// Schedule a job
export async function scheduleJob(jobData: {
  id: string
  cronExpression: string
  workflowId: string
  engine: string
  payload?: any
}): Promise<CronJob> {
  // Cancel any existing job with the same ID
  if (activeJobs[jobData.id]) {
    activeJobs[jobData.id].stop()
    delete activeJobs[jobData.id]
  }

  // Create the new job
  const job: CronJob = {
    ...jobData,
    active: true,
    lastRun: undefined,
    nextRun: calculateNextRun(jobData.cronExpression),
  }

  // Schedule the job
  try {
    const task = schedule(job.cronExpression, () => {
      executeJob(job).catch(console.error)
    })

    activeJobs[job.id] = task

    // Save to persistent storage
    const jobs = loadJobs()
    const existingJobIndex = jobs.findIndex((j) => j.id === job.id)

    if (existingJobIndex !== -1) {
      jobs[existingJobIndex] = job
    } else {
      jobs.push(job)
    }

    saveJobs(jobs)

    return job
  } catch (error) {
    console.error(`Error scheduling job ${job.id}:`, error)
    throw error
  }
}

// Cancel a job
export function cancelJob(jobId: string): boolean {
  if (activeJobs[jobId]) {
    activeJobs[jobId].stop()
    delete activeJobs[jobId]

    // Update persistent storage
    const jobs = loadJobs()
    const jobIndex = jobs.findIndex((job) => job.id === jobId)

    if (jobIndex !== -1) {
      jobs[jobIndex].active = false
      saveJobs(jobs)
    }

    return true
  }

  return false
}

// Get all jobs
export function getAllJobs(): CronJob[] {
  return loadJobs()
}

// Get a specific job
export function getJob(jobId: string): CronJob | undefined {
  const jobs = loadJobs()
  return jobs.find((job) => job.id === jobId)
}

// Initialize all saved jobs on startup
export function initializeJobs() {
  console.log("Initializing cron jobs from persistent storage...")

  const jobs = loadJobs()
  let activeCount = 0

  for (const job of jobs) {
    if (job.active) {
      try {
        const task = schedule(job.cronExpression, () => {
          executeJob(job).catch(console.error)
        })

        activeJobs[job.id] = task
        job.nextRun = calculateNextRun(job.cronExpression)
        activeCount++
      } catch (error) {
        console.error(`Error scheduling saved job ${job.id}:`, error)
        job.active = false
      }
    }
  }

  saveJobs(jobs)
  console.log(`Initialized ${activeCount} active cron jobs`)
}

// Call this function during app initialization
// This would typically be called in a server.js file or similar
// For Next.js, you might need to use a custom server or a startup script
if (typeof window === "undefined") {
  // Only run on the server side
  try {
    initializeJobs()
  } catch (error) {
    console.error("Error initializing cron jobs:", error)
  }
}
