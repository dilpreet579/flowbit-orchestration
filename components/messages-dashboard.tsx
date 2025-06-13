"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RefreshCw, AlertTriangle, MessageSquare } from "lucide-react"
import { MessagesView, type Message } from "@/components/messages-view"

interface MessagesDashboardProps {
  selectedFolder: string | null
}

export function MessagesDashboard({ selectedFolder }: MessagesDashboardProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [directionFilter, setDirectionFilter] = useState<string>("all")
  const [engineFilter, setEngineFilter] = useState<string>("all")
  const [isUsingMockData, setIsUsingMockData] = useState(false)

  useEffect(() => {
    fetchMessages()
    // Set up polling for real-time updates
    const interval = setInterval(fetchMessages, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const fetchMessages = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      console.log("Fetching messages from API...")
      const response = await fetch("/api/messages")

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      // First try to parse as JSON
      const text = await response.text()
      let data

      try {
        data = JSON.parse(text)
      } catch (e) {
        console.error("Failed to parse response as JSON:", text.substring(0, 100) + "...")
        throw new Error("Invalid JSON response from server")
      }

      console.log("API response:", data)

      // Check if we're using mock data
      setIsUsingMockData(data.usingMockData || false)
      setMessages(data.messages || [])

      console.log(`Loaded ${data.messages?.length || 0} messages`)
    } catch (error) {
      console.error("Error fetching messages:", error)
      setError(`Failed to fetch message data: ${(error as Error).message}. The dashboard will show mock data.`)
      setIsUsingMockData(true)

      // Set some fallback mock data if the API completely fails
      setMessages([
        {
          id: "msg-11",
          executionId: "langflow-exec-13",
          workflowId: "b51ce848-1d7f-4907-93cb-9fa375440a4c",
          workflowName: "PDF Agent",
          engine: "langflow",
          direction: "incoming",
          sender: "classifier@internal",
          content: "Incoming PDF document flagged for processing. Filename: invoice_2025_06.pdf",
          timestamp: "13.06.2025 10:17:10",
          folderId: "langflow",
          metadata: {
            fileName: "invoice_2025_06.pdf",
            fileSizeKB: 328,
            source: "email",
          },
        },
        {
          id: "msg-12",
          executionId: "langflow-exec-14",
          workflowId: "6491cae3-136c-4af1-b00c-ba5b9b7ebe36",
          workflowName: "Classifier Agent",
          engine: "langflow",
          direction: "incoming",
          sender: "webhook@external-service.com",
          content: "Webhook received: Document type prediction requested for uploaded file ID #98215.",
          timestamp: "13.06.2025 10:12:55",
          folderId: "langflow",
          metadata: {
            triggerType: "webhook",
            fileId: "98215",
            requestOrigin: "external-service",
          },
        }
      ])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const filteredMessages = messages.filter((message) => {
    if (selectedFolder && message.folderId !== selectedFolder && selectedFolder !== "all") return false
    if (directionFilter !== "all" && message.direction !== directionFilter) return false
    if (engineFilter !== "all" && message.engine !== engineFilter) return false
    return true
  })

  const handleRefresh = () => {
    fetchMessages(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7575e4] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading message data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {isUsingMockData && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Using Mock Data</AlertTitle>
          <AlertDescription className="text-amber-700">
            The dashboard is currently displaying mock message data because the API connections are not available.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Connection Issue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={directionFilter} onValueChange={setDirectionFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Directions</SelectItem>
            <SelectItem value="incoming">Incoming</SelectItem>
            <SelectItem value="outgoing">Outgoing</SelectItem>
          </SelectContent>
        </Select>

        <Select value={engineFilter} onValueChange={setEngineFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by engine" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Engines</SelectItem>
            <SelectItem value="langflow">Langflow</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
          {refreshing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Messages List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Recent Messages
            <Badge variant="outline" className="ml-2">
              {filteredMessages.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MessagesView
            messages={filteredMessages}
            emptyMessage={
              isUsingMockData
                ? "No messages found matching your filters. Configure your API connections to see real message data."
                : "No messages found matching your filters."
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
