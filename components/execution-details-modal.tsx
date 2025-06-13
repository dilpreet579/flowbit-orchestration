"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
  Copy,
  RefreshCw,
  Play,
  Pause,
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { MessagesView } from "@/components/messages-view"
import { cn } from "@/lib/utils"

interface ExecutionDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  executionId: string | null
  runDetails: any
  fetchRunDetails: () => void
  loading: boolean
  error: string | null
  streamData: any[]
  isStreaming: boolean
  startStreaming: () => void
  pauseStreaming: () => void
  streamPaused: boolean
}

export function ExecutionDetailsModal({
  open,
  onOpenChange,
  executionId,
  runDetails,
  fetchRunDetails,
  loading = false,
  error = null,
  streamData = [],
  isStreaming = false,
  startStreaming = () => {},
  pauseStreaming = () => {},
  streamPaused = false,
}: ExecutionDetailsModalProps) {
  const [expandedNodes, setExpandedNodes] = useState<string[]>([])

  const toggleNodeExpansion = (nodeName: string) => {
    setExpandedNodes((prev) =>
      prev.includes(nodeName) ? prev.filter((name) => name !== nodeName) : [...prev, nodeName],
    )
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return "N/A"

    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`
    } else {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes}m ${remainingSeconds.toFixed(0)}s`
    }
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString()
    } catch (e) {
      return timestamp
    }
  }

  const extractMessages = (runData: any) => {
    if (!runData || !runData.outputs) return []

    const messages: any[] = []

    // Look for chat nodes or message nodes
    Object.entries(runData.outputs).forEach(([nodeName, nodeData]: [string, any]) => {
      if (!nodeData.data) return

      // Handle chat nodes
      if (nodeName.toLowerCase().includes("chat") && nodeData.data.messages) {
        const chatMessages = Array.isArray(nodeData.data.messages) ? nodeData.data.messages : []
        chatMessages.forEach((msg: any) => {
          messages.push({
            id: `msg-${runData.id}-${nodeName}-${Math.random().toString(36).substring(7)}`,
            direction: msg.role === "assistant" ? "outgoing" : "incoming",
            content: msg.content,
            timestamp: runData.timestamp || new Date().toISOString(),
            metadata: msg,
          })
        })
      }

      // Handle other message nodes
      if (
        (nodeName.toLowerCase().includes("message") ||
          nodeName.toLowerCase().includes("email") ||
          nodeName.toLowerCase().includes("notification")) &&
        (nodeData.data.text || nodeData.data.content || nodeData.data.message)
      ) {
        messages.push({
          id: `msg-${runData.id}-${nodeName}`,
          direction: nodeData.data.direction || "outgoing",
          recipient: nodeData.data.to || nodeData.data.recipient,
          sender: nodeData.data.from || nodeData.data.sender,
          content: nodeData.data.text || nodeData.data.content || nodeData.data.message,
          timestamp: runData.timestamp || new Date().toISOString(),
          metadata: nodeData.data,
        })
      }
    })

    return messages
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogTitle>Loading...</DialogTitle>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7575e4]"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-600">{error}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!runDetails) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogTitle>No run details available</DialogTitle>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Info className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600">No run details available</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const messages = extractMessages(runDetails)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {runDetails.status === "SUCCESS" ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : runDetails.status === "ERROR" ? (
              <XCircle className="w-5 h-5 text-red-600" />
            ) : (
              <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
            )}
            <span>{runDetails.flow_name || "Langflow Run"}</span>
            <Badge
              className={
                runDetails.status === "SUCCESS"
                  ? "bg-green-100 text-green-800"
                  : runDetails.status === "ERROR"
                    ? "bg-red-100 text-red-800"
                    : "bg-blue-100 text-blue-800"
              }
            >
              {runDetails.status === "SUCCESS" ? "Success" : runDetails.status === "ERROR" ? "Error" : "Running"}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Run ID: {runDetails.id} • Started: {formatTimestamp(runDetails.timestamp)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Duration: {runDetails.status === "RUNNING" ? "Running..." : formatDuration(runDetails.duration)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {runDetails.status === "RUNNING" && (
              <>
                {streamPaused ? (
                  <Button variant="outline" onClick={startStreaming} className="gap-2">
                    <Play className="h-4 w-4" />
                    Resume Stream
                  </Button>
                ) : (
                  <Button variant="outline" onClick={pauseStreaming} className="gap-2">
                    <Pause className="h-4 w-4" />
                    Pause Stream
                  </Button>
                )}
              </>
            )}
            <Button variant="outline" onClick={fetchRunDetails} className="gap-2">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="nodes">Nodes</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="data">Raw Data</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Run Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Run ID</h3>
                    <p className="mt-1">{runDetails.id}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Flow ID</h3>
                    <p className="mt-1">{runDetails.flow_id || "N/A"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Trigger Type</h3>
                    <p className="mt-1 capitalize">{runDetails.trigger_type || "manual"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Timestamp</h3>
                    <p className="mt-1">{formatTimestamp(runDetails.timestamp)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {runDetails.error && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Error Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm text-red-600 whitespace-pre-wrap bg-red-50 p-3 rounded">
                    {runDetails.error}
                  </pre>
                </CardContent>
              </Card>
            )}

            {runDetails.inputs && Object.keys(runDetails.inputs).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Inputs</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-gray-50 p-3 rounded whitespace-pre-wrap">
                    {JSON.stringify(runDetails.inputs, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {isStreaming && (
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle className="text-blue-600 flex items-center gap-2">
                    <Clock className="w-4 h-4 animate-pulse" />
                    Live Stream
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-40">
                    <div className="space-y-2">
                      {streamData.map((item, index) => (
                        <div key={index} className="text-sm border-l-2 border-blue-300 pl-2">
                          <span className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</span>
                          <pre className="whitespace-pre-wrap mt-1">{JSON.stringify(item, null, 2)}</pre>
                        </div>
                      ))}
                      {streamData.length === 0 && <p className="text-gray-500 italic">Waiting for stream data...</p>}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="nodes" className="space-y-4 mt-4">
            <ScrollArea className="h-[600px]">
              {runDetails.outputs && Object.keys(runDetails.outputs).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(runDetails.outputs).map(([nodeName, nodeData]: [string, any], index) => (
                    <Collapsible
                      key={index}
                      open={expandedNodes.includes(nodeName)}
                      onOpenChange={() => toggleNodeExpansion(nodeName)}
                    >
                      <Card>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {expandedNodes.includes(nodeName) ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                                {nodeData.error ? (
                                  <XCircle className="w-4 h-4 text-red-600" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                )}
                                <CardTitle className="text-sm">{nodeName}</CardTitle>
                              </div>
                              <Badge variant={nodeData.error ? "destructive" : "default"}>
                                {nodeData.error ? "Error" : "Success"}
                              </Badge>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent>
                            {nodeData.error && (
                              <div className="mb-4">
                                <h4 className="text-sm font-medium text-red-600 mb-2">Error:</h4>
                                <pre className="text-xs text-red-600 bg-red-50 p-2 rounded whitespace-pre-wrap">
                                  {JSON.stringify(nodeData.error, null, 2)}
                                </pre>
                              </div>
                            )}
                            {nodeData.data && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-sm font-medium">Output Data:</h4>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copyToClipboard(JSON.stringify(nodeData.data, null, 2))}
                                  >
                                    <Copy className="w-3 h-3 mr-1" />
                                    Copy
                                  </Button>
                                </div>
                                <pre className="text-xs bg-gray-50 p-2 rounded whitespace-pre-wrap max-h-80 overflow-auto">
                                  {JSON.stringify(nodeData.data, null, 2)}
                                </pre>
                              </div>
                            )}
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Info className="w-8 h-8 mx-auto mb-2" />
                  <p>No node execution data available</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4 mt-4">
            <ScrollArea className="h-[600px]">
              {runDetails.logs && runDetails.logs.length > 0 ? (
                <div className="space-y-2">
                  {runDetails.logs.map((log: any, index: number) => (
                    <Card key={index}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              log.level === "ERROR" || log.level === "error"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : ""
                            }`}
                          >
                            {log.level || "INFO"}
                          </Badge>
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 mb-1">
                              {log.timestamp || formatTimestamp(runDetails.timestamp)}
                            </div>
                            <pre
                              className={`text-sm whitespace-pre-wrap ${
                                log.level === "ERROR" || log.level === "error" ? "text-red-600" : ""
                              }`}
                            >
                              {log.message || JSON.stringify(log, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Info className="w-8 h-8 mx-auto mb-2" />
                  <p>No logs available for this run</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4 mt-4">
            <MessagesView
              messages={messages}
              maxHeight="600px"
              showWorkflowInfo={false}
              emptyMessage="No messages available for this run"
            />
          </TabsContent>

          <TabsContent value="data" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Raw Run Data</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(JSON.stringify(runDetails, null, 2))}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <pre className="text-xs bg-gray-50 p-3 rounded whitespace-pre-wrap">
                    {JSON.stringify(runDetails, null, 2)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
