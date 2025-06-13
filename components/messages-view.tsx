"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { MessageSquare, ChevronDown, Mail, Webhook } from "lucide-react"

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
    if (message.recipient?.includes("@") || message.sender?.includes("@")) {
      return <Mail className="h-4 w-4 text-blue-600" />
    } else if (message.recipient === "internal-api" || message.recipient === "data-warehouse") {
      return <Webhook className="h-4 w-4 text-purple-600" />
    } else {
      return <MessageSquare className="h-4 w-4 text-green-600" />
    }
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <MessageSquare className="w-8 h-8 mx-auto mb-2" />
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <ScrollArea className={`h-[${maxHeight}] pr-4`}>
      <div className="space-y-4">
        {messages.map((message, index) => (
          <Card
            key={message.id || index}
            className={cn("border-l-4", message.direction === "outgoing" ? "border-l-blue-500" : "border-l-green-500")}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1">{getMessageIcon(message)}</div>
                <div className="flex-1">
                  {showWorkflowInfo && message.workflowName && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                      <div>
                        <span className="text-sm font-medium">{message.workflowName}</span>
                        {message.engine && (
                          <Badge
                            variant="outline"
                            className={
                              message.engine === "n8n"
                                ? "ml-2 bg-blue-100 text-blue-800 border-blue-200"
                                : "ml-2 bg-green-100 text-green-800 border-green-200"
                            }
                          >
                            {message.engine}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 sm:mt-0">{message.timestamp}</div>
                    </div>
                  )}

                  <div className="flex justify-between mb-1">
                    <div className="text-xs font-medium">
                      <Badge
                        variant="outline"
                        className={
                          message.direction === "outgoing"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : "bg-green-50 text-green-700 border-green-100"
                        }
                      >
                        {message.direction === "outgoing" ? "Sent" : "Received"}
                      </Badge>
                      {message.recipient && <span className="text-muted-foreground ml-1">to {message.recipient}</span>}
                      {message.sender && <span className="text-muted-foreground ml-1">from {message.sender}</span>}
                    </div>
                    {!showWorkflowInfo && <div className="text-xs text-gray-500">{message.timestamp}</div>}
                  </div>

                  <div className="text-sm whitespace-pre-wrap mt-2">{message.content}</div>

                  {message.metadata && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs p-0"
                        onClick={() => toggleMetadataExpansion(message.id || `message-${index}`)}
                      >
                        Metadata{" "}
                        <ChevronDown
                          className={cn(
                            "h-3 w-3 ml-1 transition-transform",
                            expandedMetadata.includes(message.id || `message-${index}`) && "rotate-180",
                          )}
                        />
                      </Button>
                      {expandedMetadata.includes(message.id || `message-${index}`) && (
                        <pre className="mt-2 bg-muted p-2 rounded text-xs overflow-auto">
                          {JSON.stringify(message.metadata, null, 2)}
                        </pre>
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
