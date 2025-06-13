"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { ExecutionsDashboard } from "@/components/executions-dashboard"
import { MessagesDashboard } from "@/components/messages-dashboard"
import { CreateWorkflowModal } from "@/components/create-workflow-modal"
import { FolderManagementModal } from "@/components/folder-management-modal"
import { TriggerWorkflowModal } from "@/components/trigger-workflow-modal"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Clock, MessageSquare } from "lucide-react"
import { WorkflowIcon, FolderIcon } from "lucide-react"

// Define folder type
export interface Folder {
  id: string
  name: string
  workflowCount: number
  isDefault: boolean
}

// Define workflow type
export interface Workflow {
  id: string
  name: string
  description: string
  engine: string
  folderId: string
  lastRun?: string
  status?: string
}

// Initial folders data
const initialFolders: Folder[] = [
  { id: "unassigned", name: "Unassigned", workflowCount: 2, isDefault: true },
  { id: "marketing", name: "Marketing Automation", workflowCount: 3, isDefault: false },
  { id: "data-processing", name: "Data Processing", workflowCount: 2, isDefault: false },
]

// Initial workflows data - now including more LangFlow workflows
const initialWorkflows: Workflow[] = [
  {
    id: "wf-1",
    name: "Email Processor",
    description: "Processes incoming emails and extracts data",
    engine: "n8n",
    folderId: "unassigned",
    lastRun: "15.01.2024 14:30:22",
    status: "success",
  },
  {
    id: "wf-2",
    name: "Data Sync",
    description: "Synchronizes data between systems",
    engine: "langflow",
    folderId: "unassigned",
    lastRun: "14.01.2024 09:15:10",
    status: "success",
  },
  {
    id: "wf-3",
    name: "Lead Scoring",
    description: "Scores leads based on behavior and attributes",
    engine: "n8n",
    folderId: "marketing",
    lastRun: "13.01.2024 16:45:33",
    status: "error",
  },
  {
    id: "wf-4",
    name: "Campaign Tracker",
    description: "Tracks marketing campaign performance",
    engine: "n8n",
    folderId: "marketing",
    lastRun: "12.01.2024 11:20:45",
    status: "success",
  },
  {
    id: "wf-5",
    name: "ETL Pipeline",
    description: "Extracts, transforms, and loads data",
    engine: "langflow",
    folderId: "data-processing",
    lastRun: "15.01.2024 14:20:08",
    status: "success",
  },
  {
    id: "wf-6",
    name: "Report Generator",
    description: "Generates automated reports",
    engine: "n8n",
    folderId: "data-processing",
    lastRun: "11.01.2024 08:30:15",
    status: "success",
  },
  {
    id: "wf-7",
    name: "Customer Segmentation",
    description: "Segments customers using AI",
    engine: "langflow",
    folderId: "marketing",
    lastRun: "10.01.2024 13:45:22",
    status: "success",
  },
  {
    id: "6491cae3-136c-4af1-b00c-ba5b9b7ebe36",
    name: "Classifier Agent",
    description: "the classifier agent",
    engine: "langflow",
    folderId: "langflow",
    lastRun: "13.06.2025 10:15:30",
    status: "success",
  },
  {
    id: "bcd1136b-b975-4697-8118-b5a9124c164f",
    name: "Email Agent",
    description: "the email agent",
    engine: "langflow",
    folderId: "langflow",
    lastRun: "13.06.2025 10:15:30",
    status: "success",
  },
  {
    id: "bdc81e87-c9d6-4430-8f5f-52e4ea5225a0",
    name: "JSON Agent",
    description: "the json agent",
    engine: "langflow",
    folderId: "langflow",
    lastRun: "13.06.2025 10:15:30",
    status: "success",
  },
  {
    id: "b51ce848-1d7f-4907-93cb-9fa375440a4c",
    name: "PDF Agent",
    description: "the pdf agent",
    engine: "langflow",
    folderId: "langflow",
    lastRun: "13.06.2025 10:15:30",
    status: "success",
  },
]

export function OrchestrationDashboard() {
  const router = useRouter()
  const [createWorkflowOpen, setCreateWorkflowOpen] = useState(false)
  const [folderManagementOpen, setFolderManagementOpen] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [folders, setFolders] = useState<Folder[]>(initialFolders)
  const [workflows, setWorkflows] = useState<Workflow[]>(initialWorkflows)
  const [triggerModalOpen, setTriggerModalOpen] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<{ id: string; name: string; engine: string } | null>(null)
  const [activeTab, setActiveTab] = useState("executions")

  // Filter workflows based on selected folder
  const filteredWorkflows = selectedFolder
    ? workflows.filter((workflow) => workflow.folderId === selectedFolder)
    : workflows

  const handleTriggerWorkflow = (workflowId: string, workflowName: string, engine: string) => {
    setSelectedWorkflow({ id: workflowId, name: workflowName, engine })
    setTriggerModalOpen(true)
  }
  
  console.log("Folders", folders);
  // Get all folders including the LangFlow folder
  const allFolders = [
    ...folders,
    {
      id: "langflow",
      name: "LangFlow",
      workflowCount: workflows.filter((w) => w.folderId === "langflow").length,
      isDefault: false,
    },
  ]
  console.log("All Folders", allFolders);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar
          selectedFolder={selectedFolder}
          onFolderSelect={setSelectedFolder}
          onManageFolders={() => setFolderManagementOpen(true)}
          folders={allFolders}
          onNavigate={(path) => router.push(path)}
        />
        <div className="flex-1 flex flex-col">
          <DashboardHeader onCreateWorkflow={() => setCreateWorkflowOpen(true)} />
          <main className="flex-1 p-6">
            <Tabs defaultValue="executions" value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
              <TabsList>
                <TabsTrigger value="executions" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Executions
                </TabsTrigger>
                <TabsTrigger value="workflows" className="flex items-center gap-2">
                  <WorkflowIcon className="h-4 w-4" />
                  Workflows
                </TabsTrigger>
                <TabsTrigger value="messages" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Messages
                </TabsTrigger>
              </TabsList>

              <TabsContent value="executions">
                <ExecutionsDashboard selectedFolder={selectedFolder} />
              </TabsContent>

              <TabsContent value="workflows">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight">Available Workflows</h2>
                    <Button onClick={() => setCreateWorkflowOpen(true)}>Create Workflow</Button>
                  </div>

                  {selectedFolder && (
                    <div className="flex items-center gap-2 mb-4">
                      <FolderIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Filtered by folder:{" "}
                        <span className="font-medium text-foreground">
                          {allFolders.find((f) => f.id === selectedFolder)?.name || "Unknown"}
                        </span>
                      </span>
                    </div>
                  )}

                  {filteredWorkflows.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-10">
                        <WorkflowIcon className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium mb-2">No workflows found</p>
                        <p className="text-muted-foreground mb-4">
                          {selectedFolder
                            ? "There are no workflows in this folder."
                            : "Get started by creating your first workflow."}
                        </p>
                        <Button onClick={() => setCreateWorkflowOpen(true)}>Create Workflow</Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredWorkflows.map((workflow) => (
                        <Card key={workflow.id} className="overflow-hidden">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <Badge
                                variant="outline"
                                className={
                                  workflow.engine === "n8n"
                                    ? "bg-blue-100 text-blue-800 border-blue-200"
                                    : "bg-green-100 text-green-800 border-green-200"
                                }
                              >
                                {workflow.engine}
                              </Badge>
                              {workflow.status && (
                                <Badge
                                  variant={workflow.status === "success" ? "default" : "destructive"}
                                  className="ml-auto"
                                >
                                  {workflow.status}
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="mt-2">{workflow.name}</CardTitle>
                            <CardDescription>{workflow.description}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-col space-y-2">
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Folder:</span>{" "}
                                {allFolders.find((f) => f.id === workflow.folderId)?.name || "Unassigned"}
                              </div>
                              {workflow.lastRun && (
                                <div className="text-xs text-muted-foreground">
                                  <span className="font-medium">Last run:</span> {workflow.lastRun}
                                </div>
                              )}
                              <div className="flex justify-end mt-4">
                                <Button
                                  onClick={() => handleTriggerWorkflow(workflow.id, workflow.name, workflow.engine)}
                                  className="w-full"
                                >
                                  <Play className="mr-2 h-4 w-4" />
                                  Trigger Workflow
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="messages">
                <MessagesDashboard selectedFolder={selectedFolder} />
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>

      <CreateWorkflowModal open={createWorkflowOpen} onOpenChange={setCreateWorkflowOpen} folders={allFolders} />
      <FolderManagementModal
        open={folderManagementOpen}
        onOpenChange={setFolderManagementOpen}
        folders={folders}
        setFolders={setFolders}
      />
      <TriggerWorkflowModal
        open={triggerModalOpen}
        onOpenChange={setTriggerModalOpen}
        workflowId={selectedWorkflow?.id || null}
        workflowName={selectedWorkflow?.name || null}
        engine={selectedWorkflow?.engine || null}
      />
    </SidebarProvider>
  )
}
