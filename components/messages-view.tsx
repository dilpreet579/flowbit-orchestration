"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { MessageSquare, ChevronDown, Play, CheckCircle, XCircle } from "lucide-react"

export interface Message {
  id: string
  workflowId?: string
  workflowName?: string
  engine?: string
  direction: string
  content: string
  timestamp: string
  recipient?: string
  sender?: string
  metadata?: any
  executionId?: string
  folderId?: string
}

interface MessagesViewProps {
  messages: Message[]
  maxHeight?: string
  showWorkflowInfo?: boolean
  emptyMessage?: string
}

export function MessagesView({
  messages,
  maxHeight = "600px",
  showWorkflowInfo = true,
  emptyMessage = "No messages found",
}: MessagesViewProps) {
  const [expandedMetadata, setExpandedMetadata] = useState<string[]>([])

  const toggleMetadataExpansion = (messageId: string) => {
    setExpandedMetadata((prev) =>
      prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId],
    )
  }

  const getMessageIcon = (message: Message) => {
    if (message.metadata?.type === "trigger") {
      return <Play className="h-4 w-4 text-blue-600" />
    } else if (message.metadata?.type === "completion") {
      return message.metadata?.status === "SUCCESS" ? (
        <CheckCircle className="h-4 w-4 text-green-600" />
      ) : (
        <XCircle className="h-4 w-4 text-red-600" />
      )
    } else {
      return <MessageSquare className="h-4 w-4 text-gray-600" />
    }
  }

  const getMessageColor = (message: Message) => {
    if (message.metadata?.type === "trigger") {
      return "border-l-blue-500"
    } else if (message.metadata?.type === "completion") {
      return message.metadata?.status === "SUCCESS" ? "border-l-green-500" : "border-l-red-500"
    } else {
      return message.direction === "outgoing" ? "border-l-blue-500" : "border-l-green-500"
    }
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium mb-2">No Messages Yet</p>
        <p className="text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <ScrollArea className={`h-[${maxHeight}] pr-4`}>
      <div className="space-y-3">
        {messages.map((message, index) => (
          <Card key={message.id || index} className={cn("border-l-4", getMessageColor(message))}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1">{getMessageIcon(message)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {showWorkflowInfo && message.workflowName && (
                        <span className="font-medium text-gray-900">{message.workflowName}</span>
                      )}
                      {message.metadata?.type && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            message.metadata.type === "trigger" && "bg-blue-50 text-blue-700 border-blue-200",
                            message.metadata.type === "completion" &&
                              message.metadata.status === "SUCCESS" &&
                              "bg-green-50 text-green-700 border-green-200",
                            message.metadata.type === "completion" &&
                              message.metadata.status === "ERROR" &&
                              "bg-red-50 text-red-700 border-red-200",
                          )}
                        >
                          {message.metadata.type}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{message.timestamp}</div>
                  </div>

                  <div className="text-sm text-gray-700 mb-2">{message.content}</div>

                  {message.metadata?.duration && (
                    <div className="text-xs text-gray-500">Duration: {message.metadata.duration}s</div>
                  )}

                  {message.metadata && Object.keys(message.metadata).length > 0 && (
                    <div className="mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs p-0 text-gray-500 hover:text-gray-700"
                        onClick={() => toggleMetadataExpansion(message.id || `message-${index}`)}
                      >
                        Details{" "}
                        <ChevronDown
                          className={cn(
                            "h-3 w-3 ml-1 transition-transform",
                            expandedMetadata.includes(message.id || `message-${index}`) && "rotate-180",
                          )}
                        />
                      </Button>
                      {expandedMetadata.includes(message.id || `message-${index}`) && (
                        <div className="mt-2 bg-gray-50 p-3 rounded text-xs">
                          <div className="space-y-1">
                            {message.executionId && (
                              <div>
                                <span className="font-medium">Execution ID:</span> {message.executionId}
                              </div>
                            )}
                            {message.metadata?.triggerType && (
                              <div>
                                <span className="font-medium">Trigger Type:</span> {message.metadata.triggerType}
                              </div>
                            )}
                            {message.metadata?.status && (
                              <div>
                                <span className="font-medium">Status:</span> {message.metadata.status}
                              </div>
                            )}
                            {message.metadata?.error && (
                              <div>
                                <span className="font-medium text-red-600">Error:</span> {message.metadata.error}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  )
}
