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
  const [typeFilter, setTypeFilter] = useState<string>("all")

  useEffect(() => {
    fetchMessages()
    // Set up polling for real-time updates
    const interval = setInterval(fetchMessages, 30000) // Refresh every 30 seconds
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

      const response = await fetch("/api/messages")

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      setMessages(data.messages || [])

      if (data.error) {
        setError(data.error)
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
      setError(`Failed to fetch message data: ${(error as Error).message}`)
      setMessages([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const filteredMessages = messages.filter((message) => {
    if (selectedFolder && message.folderId !== selectedFolder && selectedFolder !== "all") return false
    if (directionFilter !== "all" && message.direction !== directionFilter) return false
    if (typeFilter !== "all" && message.metadata?.type !== typeFilter) return false
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
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
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
            <SelectItem value="all">All Messages</SelectItem>
            <SelectItem value="incoming">Incoming</SelectItem>
            <SelectItem value="outgoing">Outgoing</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="trigger">Triggers</SelectItem>
            <SelectItem value="completion">Completions</SelectItem>
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
            Workflow Messages
            <Badge variant="outline" className="ml-2">
              {filteredMessages.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MessagesView
            messages={filteredMessages}
            emptyMessage="No workflow messages found. Messages will appear here when workflows are triggered."
          />
        </CardContent>
      </Card>
    </div>
  )
}
