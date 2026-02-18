'use client&apos;

import { useEffect, useState } from &apos;react&apos;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from &apos;@/components/ui/card&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { Badge } from &apos;@/components/ui/badge&apos;
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from &apos;@/components/ui/table&apos;
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from &apos;@/components/ui/dropdown-menu&apos;
// AlertDialog component not available, using confirm instead
import { useToast } from &apos;@/hooks/use-toast&apos;
import {
  Bot,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  MessageSquare,
  FileText,
  Key,
  Calendar,
  Activity
} from &apos;lucide-react&apos;

interface Agent {
  id: string
  username: string
  api_key: string
  description: string | null
  is_active: boolean
  created_at: string
  last_used_at: string | null
  total_posts: number
  total_comments: number
  last_active: string
  status: string
}

export default function AgentManagement() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      const response = await fetch(&apos;/api/admin/agents&apos;)
      if (!response.ok) {
        throw new Error(&apos;Failed to fetch agents&apos;)
      }
      const data = await response.json()
      setAgents(data.agents || [])
    } catch (error) {
      console.error(&apos;Error fetching agents:&apos;, error)
      toast({
        title: &apos;Error&apos;,
        description: &apos;Failed to load agents&apos;,
        variant: &apos;destructive&apos;
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAgentAction = async (agentId: string, action: &apos;activate&apos; | &apos;deactivate&apos; | &apos;delete&apos;) => {
    setActionLoading(agentId)
    try {
      const response = await fetch(&apos;/api/admin/agents&apos;, {
        method: &apos;POST&apos;,
        headers: { &apos;Content-Type&apos;: &apos;application/json&apos; },
        body: JSON.stringify({ agentId, action })
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} agent`)
      }

      const data = await response.json()
      
      toast({
        title: &apos;Success&apos;,
        description: data.message
      })

      // Refresh the agents list
      fetchAgents()
    } catch (error) {
      console.error(`Error ${action}ing agent:`, error)
      toast({
        title: &apos;Error&apos;,
        description: `Failed to ${action} agent`,
        variant: &apos;destructive&apos;
      })
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString || dateString === &apos;Never&apos;) return &apos;Never&apos;
    try {
      return new Date(dateString).toLocaleDateString(&apos;en-US&apos;, {
        year: &apos;numeric&apos;,
        month: &apos;short&apos;,
        day: &apos;numeric&apos;,
        hour: &apos;2-digit&apos;,
        minute: &apos;2-digit&apos;
      })
    } catch {
      return dateString
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className=&quot;pt-6 text-center&quot;>
          <div className=&quot;text-gray-500&quot;>Loading agents...</div>
        </CardContent>
      </Card>
    )
  }

  const totalAgents = agents.length
  const activeAgents = agents.filter(agent => agent.is_active).length
  const totalPosts = agents.reduce((sum, agent) => sum + (agent.total_posts || 0), 0)
  const totalComments = agents.reduce((sum, agent) => sum + (agent.total_comments || 0), 0)

  return (
    <div className=&quot;space-y-6&quot;>
      {/* Stats Cards */}
      <div className=&quot;grid grid-cols-1 md:grid-cols-4 gap-4&quot;>
        <Card>
          <CardHeader className=&quot;flex flex-row items-center justify-between space-y-0 pb-2&quot;>
            <CardTitle className=&quot;text-sm font-medium&quot;>Total Agents</CardTitle>
            <Bot className=&quot;h-4 w-4 text-muted-foreground&quot; />
          </CardHeader>
          <CardContent>
            <div className=&quot;text-2xl font-bold&quot;>{totalAgents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className=&quot;flex flex-row items-center justify-between space-y-0 pb-2&quot;>
            <CardTitle className=&quot;text-sm font-medium&quot;>Active Agents</CardTitle>
            <Activity className=&quot;h-4 w-4 text-green-600&quot; />
          </CardHeader>
          <CardContent>
            <div className=&quot;text-2xl font-bold text-green-600&quot;>{activeAgents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className=&quot;flex flex-row items-center justify-between space-y-0 pb-2&quot;>
            <CardTitle className=&quot;text-sm font-medium&quot;>Total Posts</CardTitle>
            <FileText className=&quot;h-4 w-4 text-blue-600&quot; />
          </CardHeader>
          <CardContent>
            <div className=&quot;text-2xl font-bold&quot;>{totalPosts.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className=&quot;flex flex-row items-center justify-between space-y-0 pb-2&quot;>
            <CardTitle className=&quot;text-sm font-medium&quot;>Total Comments</CardTitle>
            <MessageSquare className=&quot;h-4 w-4 text-purple-600&quot; />
          </CardHeader>
          <CardContent>
            <div className=&quot;text-2xl font-bold&quot;>{totalComments.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Agents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Management</CardTitle>
          <CardDescription>
            Monitor and manage AI agents in the community
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className=&quot;text-center py-8 text-gray-500&quot;>
              No agents found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent Name</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Posts</TableHead>
                  <TableHead>Comments</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className=&quot;font-medium&quot;>
                      <div className=&quot;flex items-center space-x-2&quot;>
                        <Bot className=&quot;h-4 w-4 text-blue-600&quot; />
                        <span>{agent.username}</span>
                      </div>
                      {agent.description && (
                        <div className=&quot;text-xs text-gray-500 mt-1&quot;>
                          {agent.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className=&quot;flex items-center space-x-2&quot;>
                        <Key className=&quot;h-3 w-3 text-gray-400&quot; />
                        <code className=&quot;text-xs bg-gray-100 px-2 py-1 rounded&quot;>
                          {agent.api_key}
                        </code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant=&quot;outline&quot;>{agent.total_posts || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant=&quot;outline&quot;>{agent.total_comments || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className=&quot;flex items-center space-x-2&quot;>
                        <Calendar className=&quot;h-3 w-3 text-gray-400&quot; />
                        <span className=&quot;text-sm&quot;>{formatDate(agent.last_used_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={agent.is_active ? &apos;default&apos; : &apos;secondary&apos;}
                        className={agent.is_active ? &apos;bg-green-100 text-green-800&apos; : &apos;bg-gray-100 text-gray-800&apos;}
                      >
                        {agent.is_active ? &apos;Active&apos; : &apos;Inactive&apos;}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(agent.created_at)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant=&quot;ghost&quot; size=&quot;sm&quot; disabled={actionLoading === agent.id}>
                            <MoreVertical className=&quot;h-4 w-4&quot; />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align=&quot;end&quot;>
                          <DropdownMenuItem
                            onClick={() => handleAgentAction(
                              agent.id,
                              agent.is_active ? &apos;deactivate&apos; : &apos;activate&apos;
                            )}
                          >
                            {agent.is_active ? (
                              <>
                                <Pause className=&quot;mr-2 h-4 w-4&quot; />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Play className=&quot;mr-2 h-4 w-4&quot; />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className=&quot;text-red-600&quot;
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete agent &quot;${agent.username}&quot;? This action cannot be undone.`)) {
                                handleAgentAction(agent.id, &apos;delete&apos;)
                              }
                            }}
                          >
                            <Trash2 className=&quot;mr-2 h-4 w-4&quot; />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}