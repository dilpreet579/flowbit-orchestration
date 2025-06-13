"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, ArrowLeft, Filter, Plus, Copy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface LangFlowTemplate {
  id: string
  name: string
  description: string
  category: string
  created_at: string
  updated_at: string
  complexity: "beginner" | "intermediate" | "advanced"
}

export default function LangFlowTemplatesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [templates, setTemplates] = useState<LangFlowTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<LangFlowTemplate[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [complexityFilter, setComplexityFilter] = useState<string>("all")

  useEffect(() => {
    // Simulate API call to fetch LangFlow templates
    const fetchTemplates = async () => {
      setIsLoading(true)
      try {
        // In a real implementation, this would be an API call
        // For now, we'll use mock data
        const mockTemplates: LangFlowTemplate[] = [
          {
            id: "lf-tmpl-1",
            name: "Customer Support Bot",
            description: "Template for building a customer support chatbot",
            category: "chatbot",
            created_at: "2024-01-10T12:30:45Z",
            updated_at: "2024-01-15T09:22:18Z",
            complexity: "beginner",
          },
          {
            id: "lf-tmpl-2",
            name: "Document Q&A",
            description: "Ask questions about your documents",
            category: "document-processing",
            created_at: "2024-01-05T15:12:33Z",
            updated_at: "2024-01-14T11:45:09Z",
            complexity: "intermediate",
          },
          {
            id: "lf-tmpl-3",
            name: "Content Generator",
            description: "Generate marketing content based on product descriptions",
            category: "content",
            created_at: "2024-01-08T09:18:27Z",
            updated_at: "2024-01-13T16:20:41Z",
            complexity: "beginner",
          },
          {
            id: "lf-tmpl-4",
            name: "Advanced Data Analysis",
            description: "Analyze data with multiple LLM steps and visualizations",
            category: "data-analysis",
            created_at: "2024-01-03T14:25:36Z",
            updated_at: "2024-01-12T10:15:22Z",
            complexity: "advanced",
          },
          {
            id: "lf-tmpl-5",
            name: "Email Classifier",
            description: "Classify incoming emails by department and priority",
            category: "email",
            created_at: "2024-01-01T11:30:15Z",
            updated_at: "2024-01-11T13:40:18Z",
            complexity: "intermediate",
          },
          {
            id: "lf-tmpl-6",
            name: "Multi-Agent Conversation",
            description: "Create conversations between multiple AI agents",
            category: "agents",
            created_at: "2023-12-28T10:15:22Z",
            updated_at: "2024-01-10T09:30:45Z",
            complexity: "advanced",
          },
        ]

        setTemplates(mockTemplates)
        setFilteredTemplates(mockTemplates)
      } catch (error) {
        console.error("Failed to fetch LangFlow templates:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  useEffect(() => {
    // Filter templates based on search query, category, and complexity
    let filtered = [...templates]

    if (searchQuery) {
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((template) => template.category === categoryFilter)
    }

    if (complexityFilter !== "all") {
      filtered = filtered.filter((template) => template.complexity === complexityFilter)
    }

    setFilteredTemplates(filtered)
  }, [searchQuery, categoryFilter, complexityFilter, templates])

  const handleUseTemplate = (templateId: string, templateName: string) => {
    // In a real implementation, this would create a new workflow from the template
    toast({
      title: "Template used",
      description: `Created new workflow from template: ${templateName}`,
    })

    // Redirect to the new workflow (mock behavior)
    setTimeout(() => {
      router.push("/langflow/workflows")
    }, 1000)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  const getComplexityBadge = (complexity: string) => {
    switch (complexity) {
      case "beginner":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Beginner</Badge>
      case "intermediate":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Intermediate</Badge>
      case "advanced":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Advanced</Badge>
      default:
        return <Badge variant="outline">{complexity}</Badge>
    }
  }

  const categories = [
    { value: "all", label: "All categories" },
    { value: "chatbot", label: "Chatbots" },
    { value: "document-processing", label: "Document Processing" },
    { value: "content", label: "Content Generation" },
    { value: "data-analysis", label: "Data Analysis" },
    { value: "email", label: "Email Processing" },
    { value: "agents", label: "Agent Systems" },
  ]

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">LangFlow Templates</h1>
          <p className="text-muted-foreground">Start with pre-built templates for common use cases</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                <span>Category</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={complexityFilter} onValueChange={setComplexityFilter}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                <span>Complexity</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
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
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No templates found</p>
            <p className="text-muted-foreground mb-4">Try adjusting your search or filter criteria</p>
            <Button
              onClick={() => {
                setSearchQuery("")
                setCategoryFilter("all")
                setComplexityFilter("all")
              }}
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="overflow-hidden flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                    {template.category
                      .split("-")
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(" ")}
                  </Badge>
                  {getComplexityBadge(template.complexity)}
                </div>
                <CardTitle className="mt-2">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="flex flex-col space-y-2">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Created:</span> {formatDate(template.created_at)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Updated:</span> {formatDate(template.updated_at)}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2 flex gap-2">
                <Button variant="outline" className="flex-1">
                  <Copy className="mr-2 h-4 w-4" />
                  Preview
                </Button>
                <Button className="flex-1" onClick={() => handleUseTemplate(template.id, template.name)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Use Template
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
