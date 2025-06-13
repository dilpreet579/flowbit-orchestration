"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import {
  Play,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Webhook,
  Calendar,
  User,
  Eye,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ExecutionDetailsModal } from "@/components/execution-details-modal"
import { TriggerWorkflowModal } from "@/components/trigger-workflow-modal"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Execution {
  id: string
  flow_id: string
  flow_name: string
  status: string
  duration: number | null
  timestamp: string
  trigger_type: string
  tags: string[] | null
}

interface RunDetails {
  id: string
  flow_id: string
  flow_name: string
  status: string
  duration: number | null
  timestamp: string
  trigger_type: string
  tags: string[] | null
  error?: string
  inputs?: Record<string, any>
  outputs?: Record<string, any>
  logs?: Array<{
    level: string
    message: string
    timestamp: string
  }>
}

interface StreamData {
  type: string
  status?: string
  data?: any
  timestamp: string
}

interface ExecutionsDashboardProps {
  selectedFolder: string | null
}

export function ExecutionsDashboard({ selectedFolder }: ExecutionsDashboardProps) {
  const [executions, setExecutions] = useState<Execution[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [triggerModalOpen, setTriggerModalOpen] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<{ id: string; name: string } | null>(null)
  const [runDetails, setRunDetails] = useState<RunDetails | null>(null)
  const [loadingRunDetails, setLoadingRunDetails] = useState(false)
  const [runDetailsError, setRunDetailsError] = useState<string | null>(null)
  const [streamData, setStreamData] = useState<StreamData[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamPaused, setStreamPaused] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    fetchExecutions()
    // Set up polling for real-time updates
    const interval = setInterval(fetchExecutions, 30000) // Refresh every 30 seconds
    return () => {
      clearInterval(interval)
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  const fetchExecutions = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      console.log("Fetching executions...")
      const response = await fetch("/api/langflow/runs")

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log("API response:", data)

      setExecutions(data.runs || [])
      console.log(`Loaded ${data.runs?.length || 0} executions`)
    } catch (error) {
      console.error("Error fetching executions:", error)
      setError("Failed to fetch execution data.")
      setExecutions([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchRunDetails = async () => {
    if (!selectedExecution) return

    try {
      setLoadingRunDetails(true)
      setRunDetailsError(null)
      setRunDetails(null)

      console.log(`Fetching run details for ID: ${selectedExecution}`)
      const response = await fetch(`/api/langflow/runs/${selectedExecution}`)

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log("API response:", data)

      setRunDetails(data.run || null)

      // If the run is in progress, start streaming
      if (data.run?.status === "RUNNING" && !isStreaming) {
        startStreaming()
      }
    } catch (error) {
      console.error("Error fetching run details:", error)
      setRunDetailsError(`Failed to fetch run details: ${(error as Error).message}`)
    } finally {
      setLoadingRunDetails(false)
    }
  }

  const startStreaming = () => {
    if (!selectedExecution || (isStreaming && !streamPaused)) return

    try {
      setIsStreaming(true)
      setStreamPaused(false)

      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      const eventSource = new EventSource(`/api/langflow/runs/${selectedExecution}/stream`)
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

  const filteredExecutions = useMemo(() => {
    return executions.filter((execution) => {
      if (selectedFolder && execution.tags && !execution.tags.includes(selectedFolder)) return false
      if (statusFilter !== "all" && execution.status.toLowerCase() !== statusFilter) return false
      return true
    })
  }, [executions, selectedFolder, statusFilter])

  const paginatedExecutions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredExecutions.slice(start, end)
  }, [filteredExecutions, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredExecutions.length / itemsPerPage)

  const getPageNumbers = useMemo(() => {
    const pages: number[] = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    return pages
  }, [currentPage, totalPages])

  const getStatusIcon = (status: string) => {
    const normalizedStatus = status.toLowerCase()
    switch (normalizedStatus) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "error":
        return <XCircle className="w-4 h-4 text-red-600" />
      case "running":
        return <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toLowerCase()
    switch (normalizedStatus) {
      case "success":
        return <Badge className="bg-green-100 text-green-800">Success</Badge>
      case "error":
        return <Badge className="bg-red-100 text-red-800">Error</Badge>
      case "running":
        return <Badge className="bg-blue-100 text-blue-800">Running</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTriggerIcon = (triggerType: string) => {
    switch (triggerType.toLowerCase()) {
      case "email":
        return <Mail className="w-4 h-4 text-gray-600" />
      case "webhook":
        return <Webhook className="w-4 h-4 text-gray-600" />
      case "schedule":
        return <Calendar className="w-4 h-4 text-gray-600" />
      case "manual":
        return <User className="w-4 h-4 text-gray-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const handleTriggerWorkflow = (workflowId: string, workflowName: string) => {
    setSelectedWorkflow({ id: workflowId, name: workflowName })
    setTriggerModalOpen(true)
  }

  const handleViewDetails = (executionId: string) => {
    setSelectedExecution(executionId)
    setDetailsModalOpen(true)

    // Reset stream data and run details
    setStreamData([])
    setRunDetails(null)

    // Fetch the run details
    setTimeout(() => {
      fetchRunDetails()
    }, 0)
  }

  const handleRefresh = () => {
    fetchExecutions(true)
  }

  const formatDuration = (duration: number | null) => {
    if (duration === null) return "N/A"
    return `${duration.toFixed(1)}s`
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date
        .toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
        .replace(",", "")
    } catch (e) {
      return timestamp
    }
  }

  const successCount = filteredExecutions.filter((e) => e.status.toLowerCase() === "success").length
  const errorCount = filteredExecutions.filter((e) => e.status.toLowerCase() === "error").length
  const runningCount = filteredExecutions.filter((e) => e.status.toLowerCase() === "running").length

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number.parseInt(value))
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7575e4] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading execution data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Connection Issue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredExecutions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{successCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{errorCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{runningCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="running">Running</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
          {refreshing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Executions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Workflow Executions</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Rows per page:</span>
            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-16 h-8">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredExecutions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2" />
              <p>No executions found matching your filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedExecutions.map((execution) => (
                  <TableRow key={execution.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(execution.status)}
                        {getStatusBadge(execution.status)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{execution.flow_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTriggerIcon(execution.trigger_type)}
                        <span className="capitalize">{execution.trigger_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDuration(execution.duration)}</TableCell>
                    <TableCell>{formatTimestamp(execution.timestamp)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(execution.id)}
                          className="h-8"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTriggerWorkflow(execution.flow_id, execution.flow_name)}
                          className="h-8"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Trigger
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination Controls */}
          {filteredExecutions.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredExecutions.length)} of {filteredExecutions.length}{" "}
                executions
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                {getPageNumbers.map((pageNum) => (
                  <Button
                    key={`page-${pageNum}`}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className={currentPage === pageNum ? "bg-[#7575e4] hover:bg-[#6565d4]" : ""}
                  >
                    {pageNum}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ExecutionDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        executionId={selectedExecution}
        runDetails={runDetails}
        fetchRunDetails={fetchRunDetails}
        loading={loadingRunDetails}
        error={runDetailsError}
        streamData={streamData}
        isStreaming={isStreaming}
        startStreaming={startStreaming}
        pauseStreaming={pauseStreaming}
        streamPaused={streamPaused}
      />

      <TriggerWorkflowModal
        open={triggerModalOpen}
        onOpenChange={setTriggerModalOpen}
        workflowId={selectedWorkflow?.id || null}
        workflowName={selectedWorkflow?.name || null}
        engine="langflow"
      />
    </div>
  )
}
