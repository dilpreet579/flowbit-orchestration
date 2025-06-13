"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { MessagesView, type Message } from "@/components/messages-view"
import {
  ArrowLeft,
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
import { cn } from "@/lib/utils"

interface RunDetailsProps {
  params: {
    id: string
  }
}

export default function RunDetailsPage({ params }: RunDetailsProps) {
  const [runDetails, setRunDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUsingMockData, setIsUsingMockData] = useState(false)
  const [expandedNodes, setExpandedNodes] = useState<string[]>([])
  const [streamData, setStreamData] = useState<any[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamPaused, setStreamPaused] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchRunDetails()

    return () => {
      // Clean up event source on unmount
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [params.id])

  useEffect(() => {
    // If the run is in progress, start streaming
    if (runDetails?.status === "RUNNING" && !isStreaming) {
      startStreaming()
    }
  }, [runDetails])

  const fetchRunDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log(`Fetching LangFlow run details for ID: ${params.id}`)
      const response = await fetch(`/api/langflow/runs/${params.id}`)

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log("API response:", data)

      // Check if we're using mock data
      setIsUsingMockData(data.usingMockData || false)
      setRunDetails(data.run || null)

      // If the run is in progress, start streaming
      if (data.run?.status === "RUNNING" && !isStreaming) {
        startStreaming()
      }
    } catch (error) {
      console.error("Error fetching LangFlow run details:", error)
      setError(`Failed to fetch run details: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const startStreaming = () => {
    if (isStreaming && !streamPaused) return

    try {
      setIsStreaming(true)
      setStreamPaused(false)

      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      const eventSource = new EventSource(`/api/langflow/runs/${params.id}/stream`)
      eventSourceRef.current = eventSource

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setStreamData((prev) => [...prev, data])

          // If we receive an end event, refresh the run details and close the stream
          if (data.type === "end" || data.status === "SUCCESS" || data.status === "ERROR") {
            fetchRunDetails()
            eventSource.close()
            eventSourceRef.current = null
            setIsStreaming(false)
          }
        } catch (error) {
          console.error("Error parsing stream data:", error)
        }
      }

      eventSource.onerror = (error) => {
        console.error("Stream error:", error)
        eventSource.close()
        eventSourceRef.current = null
        setIsStreaming(false)
      }
    } catch (error) {
      console.error("Error setting up event source:", error)
      setIsStreaming(false)
    }
  }

  const pauseStreaming = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setStreamPaused(true)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchRunDetails().finally(() => setRefreshing(false))
  }

  const handleBack = () => {
    router.push("/langflow/runs")
  }

  const toggleNodeExpansion = (nodeName: string) => {
    setExpandedNodes((prev) =>
      prev.includes(nodeName) ? prev.filter((name) => name !== nodeName) : [...prev, nodeName],
    )
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case "SUCCESS":
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case "ERROR":
        return <XCircle className="w-5 h-5 text-red-600" />
      case "RUNNING":
        return <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
      default:
        return <Clock className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "SUCCESS":
        return <Badge className="bg-green-100 text-green-800">Success</Badge>
      case "ERROR":
        return <Badge className="bg-red-100 text-red-800">Error</Badge>
      case "RUNNING":
        return <Badge className="bg-blue-100 text-blue-800">Running</Badge>
      default:
        return <Badge variant="secondary">{status || "Unknown"}</Badge>
    }
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

  const extractMessages = (runData: any): Message[] => {
    if (!runData || !runData.outputs) return []

    const messages: Message[] = []

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
      <div className="container mx-auto py-6 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7575e4] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading run details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Button variant="outline" onClick={handleBack} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Runs
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!runDetails) {
    return (
      <div className="container mx-auto py-6">
        <Button variant="outline" onClick={handleBack} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Runs
        </Button>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription>The requested run could not be found.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const messages = extractMessages(runDetails)

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Runs
          </Button>
          <h1 className="text-2xl font-bold">Run Details</h1>
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
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {isUsingMockData && (
        <Alert className="bg-amber-50 border-amber-200 mb-4">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Using Mock Data</AlertTitle>
          <AlertDescription className="text-amber-700">
            Displaying mock run details because the API connection is not available.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getStatusIcon(runDetails.status)}
              <span className="capitalize">{runDetails.status}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {runDetails.status === "RUNNING" ? "Running..." : formatDuration(runDetails.duration)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="truncate">{runDetails.flow_name || "Unknown"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">{new Date(runDetails.timestamp).toLocaleString()}</div>
          </CardContent>
        </Card>
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
                  <p className="mt-1">{new Date(runDetails.timestamp).toLocaleString()}</p>
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
                <pre className="text-sm text-red-600 whitespace-pre-wrap bg-red-50 p-3 rounded">{runDetails.error}</pre>
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
                            {log.timestamp || new Date(runDetails.timestamp).toLocaleString()}
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
                  Copy All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(runDetails, null, 2)}</pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
