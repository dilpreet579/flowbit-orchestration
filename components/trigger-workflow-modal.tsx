"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, AlertCircle, Check, Play, Clock, Webhook } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface TriggerWorkflowModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string | null
  workflowName: string | null
  engine: string | null
}

export function TriggerWorkflowModal({
  open,
  onOpenChange,
  workflowId,
  workflowName,
  engine,
}: TriggerWorkflowModalProps) {
  const [activeTab, setActiveTab] = useState("manual")
  const [jsonPayload, setJsonPayload] = useState('{\n  "data": {\n    "input": "value"\n  }\n}')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [cronExpression, setCronExpression] = useState("0 0 * * *")
  const [cronError, setCronError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  // Generate webhook URL based on workflow ID and engine
  const webhookUrl = workflowId
    ? `${window.location.origin}/api/webhook/${engine}/${workflowId}`
    : "https://example.com/api/webhook/undefined/undefined"

  const validateJson = (json: string): boolean => {
    try {
      JSON.parse(json)
      setJsonError(null)
      return true
    } catch (error) {
      if (error instanceof Error) {
        setJsonError(error.message)
      } else {
        setJsonError("Invalid JSON format")
      }
      return false
    }
  }

  const validateCron = (cron: string): boolean => {
    // Basic cron validation - this is simplified and doesn't cover all edge cases
    const cronRegex =
      /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/

    if (!cronRegex.test(cron)) {
      setCronError("Invalid cron expression")
      return false
    }

    setCronError(null)
    return true
  }

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleTriggerWorkflow = async () => {
    if (!workflowId || !engine) {
      toast({
        title: "Error",
        description: "Workflow ID or engine is missing",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      let payload = {}
      const triggerType = activeTab

      // Validate inputs based on active tab
      if (activeTab === "manual") {
        if (!validateJson(jsonPayload)) {
          setIsSubmitting(false)
          return
        }
        payload = JSON.parse(jsonPayload)
      } else if (activeTab === "schedule") {
        if (!validateCron(cronExpression)) {
          setIsSubmitting(false)
          return
        }
        payload = { cronExpression }
      }

      const response = await fetch("/api/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflowId,
          engine,
          triggerType,
          payload,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      toast({
        title: "Workflow Triggered",
        description: `${workflowName} has been triggered successfully`,
      })

      onOpenChange(false)
    } catch (error) {
      console.error("Error triggering workflow:", error)
      toast({
        title: "Error",
        description: "Failed to trigger workflow. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCronDescription = (cron: string): string => {
    const parts = cron.split(" ")
    if (parts.length !== 5) return "Invalid cron expression"

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

    if (minute === "0" && hour === "0" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
      return "Every day at midnight"
    }

    if (minute === "0" && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
      return "Every hour at the start of the hour"
    }

    if (minute === "0" && hour === "9" && dayOfMonth === "*" && month === "*" && dayOfWeek === "1-5") {
      return "Every weekday at 9:00 AM"
    }

    // Default description
    return `At ${minute === "*" ? "every minute" : `minute ${minute}`} of ${
      hour === "*" ? "every hour" : `hour ${hour}`
    } on ${dayOfMonth === "*" ? "every day" : `day ${dayOfMonth}`} of ${
      month === "*" ? "every month" : `month ${month}`
    } on ${dayOfWeek === "*" ? "every day of week" : `day ${dayOfWeek} of week`}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Trigger Workflow: {workflowName || "Unknown"}
            {engine && <Badge variant="outline">{engine}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="manual" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="webhook" className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Webhook
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Schedule
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="json-payload">JSON Payload</Label>
              <Textarea
                id="json-payload"
                value={jsonPayload}
                onChange={(e) => setJsonPayload(e.target.value)}
                className="font-mono h-48"
                placeholder="Enter JSON payload"
              />
              {jsonError && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{jsonError}</AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="webhook" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <div className="flex">
                <Input id="webhook-url" value={webhookUrl} readOnly className="font-mono flex-1 bg-muted" />
                <Button type="button" variant="outline" size="icon" className="ml-2" onClick={handleCopyWebhook}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Use this URL to trigger the workflow from external systems. Send a POST request with your payload.
              </p>
            </div>

            <Alert>
              <AlertDescription>
                <p className="font-medium">Example cURL command:</p>
                <pre className="mt-2 p-2 bg-muted rounded-md text-xs overflow-x-auto">
                  {`curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -d '{"data": {"input": "value"}}'`}
                </pre>
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cron-expression">Cron Expression</Label>
              <Input
                id="cron-expression"
                value={cronExpression}
                onChange={(e) => {
                  setCronExpression(e.target.value)
                  validateCron(e.target.value)
                }}
                className="font-mono"
                placeholder="* * * * *"
              />
              {!cronError && <div className="text-sm text-muted-foreground">{getCronDescription(cronExpression)}</div>}
              {cronError && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{cronError}</AlertDescription>
                </Alert>
              )}
            </div>

            <Alert>
              <AlertDescription>
                <p className="font-medium">Cron Format:</p>
                <div className="mt-2 grid grid-cols-5 gap-2 text-center text-xs">
                  <div className="bg-muted p-1 rounded">
                    Minute
                    <br />
                    (0-59)
                  </div>
                  <div className="bg-muted p-1 rounded">
                    Hour
                    <br />
                    (0-23)
                  </div>
                  <div className="bg-muted p-1 rounded">
                    Day
                    <br />
                    (1-31)
                  </div>
                  <div className="bg-muted p-1 rounded">
                    Month
                    <br />
                    (1-12)
                  </div>
                  <div className="bg-muted p-1 rounded">
                    Weekday
                    <br />
                    (0-6)
                  </div>
                </div>
                <div className="mt-4 text-sm">
                  <p className="font-medium">Common examples:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>
                      <code className="bg-muted px-1 rounded">0 0 * * *</code> - Every day at midnight
                    </li>
                    <li>
                      <code className="bg-muted px-1 rounded">0 9 * * 1-5</code> - Every weekday at 9:00 AM
                    </li>
                    <li>
                      <code className="bg-muted px-1 rounded">*/15 * * * *</code> - Every 15 minutes
                    </li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleTriggerWorkflow} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">◌</span>
                Triggering...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Trigger Workflow
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
