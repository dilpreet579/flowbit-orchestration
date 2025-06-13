"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Folder, FolderOpen, Settings, Workflow, Clock } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

// Define workflow type
interface WorkflowItem {
  id: string
  name: string
  engine: string
}

// Update the props interface to accept folders
interface AppSidebarProps {
  selectedFolder: string | null
  onFolderSelect: (folderId: string | null) => void
  onManageFolders: () => void
  folders: { id: string; name: string; workflowCount: number; isDefault: boolean }[]
  onNavigate?: (path: string) => void
}

// Update the component to use the folders prop
export function AppSidebar({ selectedFolder, onFolderSelect, onManageFolders, folders, onNavigate }: AppSidebarProps) {
  // Default expanded folders
  const [expandedFolders, setExpandedFolders] = useState<string[]>(["langflow"])

  // Mock data for workflows in each folder - now including more LangFlow workflows
  const mockWorkflows: Record<string, WorkflowItem[]> = {
    unassigned: [
      { id: "wf-1", name: "Email Processor", engine: "n8n" },
      { id: "wf-2", name: "Data Sync", engine: "langflow" },
    ],
    marketing: [
      { id: "wf-3", name: "Lead Scoring", engine: "n8n" },
      { id: "wf-4", name: "Campaign Tracker", engine: "n8n" },
      { id: "wf-7", name: "Customer Segmentation", engine: "langflow" },
    ],
    "data-processing": [
      { id: "wf-5", name: "ETL Pipeline", engine: "langflow" },
      { id: "wf-6", name: "Report Generator", engine: "n8n" },
    ],
    langflow: [
      { id: "wf-8", name: "Text Summarization", engine: "langflow" },
      { id: "wf-9", name: "Sentiment Analysis", engine: "langflow" },
      { id: "wf-10", name: "Document QA", engine: "langflow" },
    ],
  }

  // Function to get workflows for a folder
  const getWorkflowsForFolder = (folderId: string) => {
    return mockWorkflows[folderId] || []
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => (prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]))
  }

  const getEngineColor = (engine: string) => {
    switch (engine) {
      case "n8n":
        return "bg-blue-100 text-blue-800"
      case "langflow":
        return "bg-green-100 text-green-800"
      case "langsmith":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Use the folders prop directly instead of creating allFolders
  const allFolders = folders

  return (
    <Sidebar className="border-r border-gray-200">
      <SidebarHeader className="border-b border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#7575e4] rounded-lg flex items-center justify-center">
            <Workflow className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">FlowBit</h1>
            <p className="text-xs text-gray-500">Orchestration</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>Workflows</span>
            <Button variant="ghost" size="sm" onClick={onManageFolders} className="h-6 w-6 p-0">
              <Settings className="w-3 h-3" />
            </Button>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onFolderSelect(null)}
                  isActive={selectedFolder === null}
                  className="w-full justify-start"
                >
                  <Workflow className="w-4 h-4" />
                  <span>All Workflows</span>
                  <Badge variant="secondary" className="ml-auto">
                    {Object.values(mockWorkflows).flat().length}
                  </Badge>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {allFolders.map((folder) => (
                <Collapsible
                  key={folder.id}
                  open={expandedFolders.includes(folder.id)}
                  onOpenChange={() => toggleFolder(folder.id)}
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="w-full justify-start">
                        {expandedFolders.includes(folder.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        {expandedFolders.includes(folder.id) ? (
                          <FolderOpen className="w-4 h-4" />
                        ) : (
                          <Folder className="w-4 h-4" />
                        )}
                        <span>{folder.name}</span>
                        <Badge variant="secondary" className="ml-auto">
                          {getWorkflowsForFolder(folder.id).length}
                        </Badge>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {getWorkflowsForFolder(folder.id).map((workflow) => (
                          <SidebarMenuSubItem key={workflow.id}>
                            <SidebarMenuSubButton
                              onClick={() => onFolderSelect(folder.id)}
                              isActive={selectedFolder === folder.id}
                              className="flex items-center justify-between"
                            >
                              <span className="truncate">{workflow.name}</span>
                              <Badge variant="outline" className={`text-xs ${getEngineColor(workflow.engine)}`}>
                                {workflow.engine}
                              </Badge>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* LangFlow Features Section */}
        <SidebarGroup>
          <SidebarGroupLabel>LangFlow Features</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onNavigate && onNavigate("/langflow/runs")}
                  className="w-full justify-start"
                >
                  <Clock className="w-4 h-4" />
                  <span>Recent Runs</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onNavigate && onNavigate("/langflow/templates")}
                  className="w-full justify-start"
                >
                  <Workflow className="w-4 h-4" />
                  <span>Templates</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onNavigate && onNavigate("/langflow/workflows")}
                  className="w-full justify-start"
                >
                  <Workflow className="w-4 h-4" />
                  <span>Workflows</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-200 p-4">
        <div className="text-xs text-gray-500">FlowBit Orchestration v1.1</div>
      </SidebarFooter>
    </Sidebar>
  )
}
