"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Play, Search, ArrowLeft, Clock, Filter, Plus } from "lucide-react"
import { TriggerWorkflowModal } from "@/components/trigger-workflow-modal"

interface LangFlowWorkflow {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
  is_template: boolean
  last_run_status?: "success" | "error" | "running" | null
  last_run_at?: string
}

export default function LangFlowWorkflowsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [workflows, setWorkflows] = useState<LangFlowWorkflow[]>([])
  const [filteredWorkflows, setFilteredWorkflows] = useState<LangFlowWorkflow[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [triggerModalOpen, setTriggerModalOpen] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<{ id: string; name: string; engine: string } | null>(null)

  useEffect(() => {
    // Simulate API call to fetch LangFlow workflows
    const fetchWorkflows = async () => {
      setIsLoading(true)
      try {
        // In a real implementation, this would be an API call
        // For now, we'll use mock data
        const mockWorkflows: LangFlowWorkflow[] = [
          {
            id: "lf-wf-1",
            name: "Customer Support Assistant",
            description: "AI assistant that handles customer support inquiries",
            created_at: "2024-01-10T12:30:45Z",
            updated_at: "2024-01-15T09:22:18Z",
            is_template: false,
            last_run_status: "success",
            last_run_at: "2024-01-15T14:30:22Z",
          },
          {
            id: "lf-wf-2",
            name: "Document Summarizer",
            description: "Summarizes long documents into key points",
            created_at: "2024-01-05T15:12:33Z",
            updated_at: "2024-01-14T11:45:09Z",
            is_template: false,
            last_run_status: "error",
            last_run_at: "2024-01-14T11:45:09Z",
          },
          {
            id: "lf-wf-3",
            name: "Content Generator",
            description: "Generates marketing content based on product descriptions",
            created_at: "2024-01-08T09:18:27Z",
            updated_at: "2024-01-13T16:20:41Z",
            is_template: false,
            last_run_status: "success",
            last_run_at: "2024-01-13T16:20:41Z",
          },
          {
            id: "lf-wf-4",
            name: "Data Analysis Pipeline",
            description: "Analyzes customer data and generates insights",
            created_at: "2024-01-03T14:25:36Z",
            updated_at: "2024-01-12T10:15:22Z",
            is_template: false,
            last_run_status: "running",
            last_run_at: "2024-01-12T10:15:22Z",
          },
          {
            id: "lf-wf-5",
            name: "Email Classifier",
            description: "Classifies incoming emails by department and priority",
            created_at: "2024-01-01T11:30:15Z",
            updated_at: "2024-01-11T13:40:18Z",
            is_template: false,
          },
        ]

        setWorkflows(mockWorkflows)
        setFilteredWorkflows(mockWorkflows)
      } catch (error) {
        console.error("Failed to fetch LangFlow workflows:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchWorkflows()
  }, [])

  useEffect(() => {
    // Filter workflows based on search query and status filter
    let filtered = [...workflows]

    if (searchQuery) {
      filtered = filtered.filter(
        (workflow) =>
          workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          workflow.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((workflow) => {
        if (statusFilter === "not_run") {
          return !workflow.last_run_status
        }
        return workflow.last_run_status === statusFilter
      })
    }

    setFilteredWorkflows(filtered)
  }, [searchQuery, statusFilter, workflows])

  const handleTriggerWorkflow = (workflowId: string, workflowName: string) => {
    setSelectedWorkflow({ id: workflowId, name: workflowName, engine: "langflow" })
    setTriggerModalOpen(true)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never"
    const date = new Date(dateString)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString()
  }

  const getStatusBadge = (status?: string | null) => {
    if (!status) return <Badge variant="outline">Not run</Badge>
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Success</Badge>
      case "error":
        return <Badge variant="destructive">Error</Badge>
      case "running":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Running</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">LangFlow Workflows</h1>
          <p className="text-muted-foreground">Manage and run your LangFlow workflows</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workflows..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                <span>Filter by status</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="not_run">Not run</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Workflow
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-9 w-full mt-4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredWorkflows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No workflows found</p>
            <p className="text-muted-foreground mb-4">Try adjusting your search or filter criteria</p>
            <Button
              onClick={() => {
                setSearchQuery("")
                setStatusFilter("all")
              }}
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkflows.map((workflow) => (
            <Card key={workflow.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                    LangFlow
                  </Badge>
                  {getStatusBadge(workflow.last_run_status)}
                </div>
                <CardTitle className="mt-2">{workflow.name}</CardTitle>
                <CardDescription>{workflow.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-2">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Created:</span> {formatDate(workflow.created_at)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Last run:</span> {formatDate(workflow.last_run_at)}
                  </div>
                  <div className="flex justify-between mt-4">
                    <Button variant="outline" onClick={() => router.push(`/langflow/runs?workflow=${workflow.id}`)}>
                      <Clock className="mr-2 h-4 w-4" />
                      View Runs
                    </Button>
                    <Button onClick={() => handleTriggerWorkflow(workflow.id, workflow.name)}>
                      <Play className="mr-2 h-4 w-4" />
                      Run
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TriggerWorkflowModal
        open={triggerModalOpen}
        onOpenChange={setTriggerModalOpen}
        workflowId={selectedWorkflow?.id || null}
        workflowName={selectedWorkflow?.name || null}
        engine={selectedWorkflow?.engine || null}
      />
    </div>
  )
}
