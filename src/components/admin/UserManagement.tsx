'use client&apos;

import { useState, useEffect } from &apos;react&apos;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from &apos;@/components/ui/card&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { Badge } from &apos;@/components/ui/badge&apos;
import { Input } from &apos;@/components/ui/input&apos;
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from &apos;@/components/ui/select&apos;
import { 
  Search, 
  UserPlus, 
  MoreVertical,
  Shield,
  Ban,
  UserX,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle
} from &apos;lucide-react&apos;
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from &quot;@/components/ui/table&quot;
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from &quot;@/components/ui/dropdown-menu&quot;
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from &quot;@/components/ui/dialog&quot;
import { Textarea } from &apos;@/components/ui/textarea&apos;
import { LoadingSpinner } from &apos;@/components/common/LoadingSpinner&apos;

interface User {
  id: string
  username: string
  email_hash: string
  role: string
  is_admin: boolean
  is_banned: boolean
  ban_reason?: string
  karma_points: number
  created_at: string
  updated_at: string
  age_verified: boolean
}

interface Pagination {
  currentPage: number
  totalPages: number
  totalUsers: number
  hasNext: boolean
  hasPrev: boolean
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(&apos;')
  const [roleFilter, setRoleFilter] = useState(&apos;all&apos;)
  const [statusFilter, setStatusFilter] = useState(&apos;all&apos;)
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    hasNext: false,
    hasPrev: false
  })
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    action: string
    title: string
    description: string
  }>({
    open: false,
    action: &apos;',
    title: &apos;',
    description: &apos;'
  })
  const [banReason, setBanReason] = useState(&apos;')
  const [newRole, setNewRole] = useState(&apos;')

  useEffect(() => {
    fetchUsers()
  }, [searchQuery, roleFilter, statusFilter, pagination.currentPage])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        q: searchQuery,
        role: roleFilter,
        status: statusFilter,
        page: pagination.currentPage.toString(),
        limit: &apos;10&apos;
      })

      const response = await fetch(`/api/admin/users/search?${params}`)
      if (!response.ok) throw new Error(&apos;Failed to fetch users&apos;)

      const data = await response.json()
      setUsers(data.users || [])
      setPagination(data.pagination)
    } catch (error) {
      console.error(&apos;Error fetching users:&apos;, error)
    } finally {
      setLoading(false)
    }
  }

  const handleUserAction = async (action: string, userId: string, additionalData?: any) => {
    try {
      const body: any = { action, userId }
      
      if (action === &apos;ban_user&apos; && banReason) {
        body.reason = banReason
      }
      if (action === &apos;change_role&apos; && newRole) {
        body.role = newRole
      }

      const response = await fetch(&apos;/api/admin/users&apos;, {
        method: &apos;POST&apos;,
        headers: { &apos;Content-Type&apos;: &apos;application/json&apos; },
        body: JSON.stringify(body)
      })

      if (!response.ok) throw new Error(&apos;Action failed&apos;)

      const result = await response.json()
      alert(result.message)
      
      // Refresh list
      fetchUsers()
      
      // Close dialog
      setActionDialog({ open: false, action: &apos;', title: &apos;', description: &apos;' })
      setBanReason(&apos;')
      setNewRole(&apos;')
      setSelectedUser(null)

    } catch (error) {
      console.error(&apos;Error performing user action:&apos;, error)
      alert(&apos;An error occurred during the operation.&apos;)
    }
  }

  const openActionDialog = (action: string, user: User) => {
    setSelectedUser(user)
    
    const dialogs = {
      ban_user: {
        title: &apos;Ban User&apos;,
        description: `Are you sure you want to ban ${user.username}?`
      },
      unban_user: {
        title: &apos;Unban User&apos;,
        description: `Are you sure you want to unban ${user.username}?`
      },
      change_role: {
        title: &apos;Change Role&apos;,
        description: `Are you sure you want to change ${user.username}&apos;s role?`
      },
      delete_user: {
        title: &apos;Delete User&apos;,
        description: `Are you sure you want to permanently delete ${user.username}? This action cannot be undone.`
      }
    }

    setActionDialog({
      open: true,
      action,
      ...dialogs[action as keyof typeof dialogs]
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(&apos;ko-KR&apos;, {
      year: &apos;numeric&apos;,
      month: &apos;short&apos;,
      day: &apos;numeric&apos;
    })
  }

  const getRoleBadge = (role: string, isAdmin: boolean) => {
    if (isAdmin) {
      return <Badge className=&quot;bg-red-100 text-red-800&quot;>Admin</Badge>
    }
    
    const roleColors = {
      admin: &apos;bg-red-100 text-red-800&apos;,
      moderator: &apos;bg-blue-100 text-blue-800&apos;,
      user: &apos;bg-gray-100 text-gray-800&apos;
    }
    
    return (
      <Badge className={roleColors[role as keyof typeof roleColors] || roleColors.user}>
        {role === &apos;admin&apos; ? &apos;Admin&apos; : role === &apos;moderator&apos; ? &apos;Moderator&apos; : &apos;User&apos;}
      </Badge>
    )
  }

  const getStatusBadge = (isBanned: boolean) => {
    return isBanned ? (
      <Badge variant=&quot;destructive&quot;>Banned</Badge>
    ) : (
      <Badge variant=&quot;secondary&quot;>Active</Badge>
    )
  }

  return (
    <div className=&quot;space-y-6&quot;>
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage user accounts and set permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and filters */}
          <div className=&quot;flex flex-col sm:flex-row gap-4 mb-6&quot;>
            <div className=&quot;flex-1 relative&quot;>
              <Search className=&quot;absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4&quot; />
              <Input
                placeholder=&quot;Search by username...&quot;
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className=&quot;pl-10&quot;
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className=&quot;w-40&quot;>
                <SelectValue placeholder=&quot;Filter by role&quot; />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=&quot;all&quot;>All roles</SelectItem>
                <SelectItem value=&quot;admin&quot;>Admin</SelectItem>
                <SelectItem value=&quot;moderator&quot;>Moderator</SelectItem>
                <SelectItem value=&quot;user&quot;>User</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className=&quot;w-40&quot;>
                <SelectValue placeholder=&quot;Filter by status&quot; />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=&quot;all&quot;>All statuses</SelectItem>
                <SelectItem value=&quot;active&quot;>Active</SelectItem>
                <SelectItem value=&quot;banned&quot;>Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User table */}
          {loading ? (
            <div className=&quot;flex justify-center py-8&quot;>
              <LoadingSpinner text=&quot;Loading user list...&quot; />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className=&quot;text-right&quot;>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className=&quot;font-medium&quot;>
                        <div>
                          <div>{user.username}</div>
                          <div className=&quot;text-sm text-gray-500&quot;>
                            ID: {user.id.slice(0, 8)}...
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(user.role, user.is_admin)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(user.is_banned)}
                        {user.ban_reason && (
                          <div className=&quot;text-xs text-red-600 mt-1&quot;>
                            {user.ban_reason}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{user.karma_points.toLocaleString()}</TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell className=&quot;text-right&quot;>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant=&quot;ghost&quot; size=&quot;sm&quot;>
                              <MoreVertical className=&quot;h-4 w-4&quot; />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align=&quot;end&quot;>
                            <DropdownMenuLabel>User Management</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem 
                              onClick={() => openActionDialog(&apos;change_role&apos;, user)}
                            >
                              <Edit className=&quot;mr-2 h-4 w-4&quot; />
                              Change Role
                            </DropdownMenuItem>
                            
                            {user.is_banned ? (
                              <DropdownMenuItem 
                                onClick={() => openActionDialog(&apos;unban_user&apos;, user)}
                              >
                                <CheckCircle className=&quot;mr-2 h-4 w-4 text-green-600&quot; />
                                Unban
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => openActionDialog(&apos;ban_user&apos;, user)}
                              >
                                <Ban className=&quot;mr-2 h-4 w-4 text-red-600&quot; />
                                Ban User
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className=&quot;text-red-600&quot;
                              onClick={() => openActionDialog(&apos;delete_user&apos;, user)}
                            >
                              <Trash2 className=&quot;mr-2 h-4 w-4&quot; />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className=&quot;flex items-center justify-between mt-6&quot;>
                <div className=&quot;text-sm text-gray-500&quot;>
                  Total {pagination.totalUsers} users (Page {pagination.currentPage}/{pagination.totalPages})
                </div>
                <div className=&quot;flex space-x-2&quot;>
                  <Button
                    variant=&quot;outline&quot;
                    size=&quot;sm&quot;
                    disabled={!pagination.hasPrev}
                    onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant=&quot;outline&quot;
                    size=&quot;sm&quot;
                    disabled={!pagination.hasNext}
                    onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => 
        setActionDialog(prev => ({ ...prev, open }))
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionDialog.title}</DialogTitle>
            <DialogDescription>
              {actionDialog.description}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.action === &apos;ban_user&apos; && (
            <div className=&quot;space-y-2&quot;>
              <label className=&quot;text-sm font-medium&quot;>Ban Reason</label>
              <Textarea
                placeholder=&quot;Enter ban reason...&quot;
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </div>
          )}

          {actionDialog.action === &apos;change_role&apos; && (
            <div className=&quot;space-y-2&quot;>
              <label className=&quot;text-sm font-medium&quot;>New Role</label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder=&quot;Select a role&quot; />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=&quot;admin&quot;>Admin</SelectItem>
                  <SelectItem value=&quot;moderator&quot;>Moderator</SelectItem>
                  <SelectItem value=&quot;user&quot;>User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button
              variant=&quot;outline&quot;
              onClick={() => setActionDialog({ open: false, action: &apos;', title: &apos;', description: &apos;' })}
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog.action === &apos;delete_user&apos; ? &apos;destructive&apos; : &apos;default&apos;}
              onClick={() => selectedUser && handleUserAction(actionDialog.action, selectedUser.id)}
              disabled={
                (actionDialog.action === &apos;change_role&apos; && !newRole) ||
                (actionDialog.action === &apos;ban_user&apos; && !banReason.trim())
              }
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}