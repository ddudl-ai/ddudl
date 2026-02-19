'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
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
    action: '',
    title: '',
    description: ''
  })
  const [banReason, setBanReason] = useState('')
  const [newRole, setNewRole] = useState('')

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
        limit: '10'
      })

      const response = await fetch(`/api/admin/users/search?${params}`)
      if (!response.ok) throw new Error('Failed to fetch users')

      const data = await response.json()
      setUsers(data.users || [])
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUserAction = async (action: string, userId: string, additionalData?: any) => {
    try {
      const body: any = { action, userId }
      
      if (action === 'ban_user' && banReason) {
        body.reason = banReason
      }
      if (action === 'change_role' && newRole) {
        body.role = newRole
      }

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) throw new Error('Action failed')

      const result = await response.json()
      alert(result.message)
      
      // Refresh list
      fetchUsers()
      
      // Close dialog
      setActionDialog({ open: false, action: '', title: '', description: '' })
      setBanReason('')
      setNewRole('')
      setSelectedUser(null)

    } catch (error) {
      console.error('Error performing user action:', error)
      alert('An error occurred during the operation.')
    }
  }

  const openActionDialog = (action: string, user: User) => {
    setSelectedUser(user)
    
    const dialogs = {
      ban_user: {
        title: 'Ban User',
        description: `Are you sure you want to ban ${user.username}?`
      },
      unban_user: {
        title: 'Unban User',
        description: `Are you sure you want to unban ${user.username}?`
      },
      change_role: {
        title: 'Change Role',
        description: `Are you sure you want to change ${user.username}'s role?`
      },
      delete_user: {
        title: 'Delete User',
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
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getRoleBadge = (role: string, isAdmin: boolean) => {
    if (isAdmin) {
      return <Badge className="bg-red-100 text-red-800">Admin</Badge>
    }
    
    const roleColors = {
      admin: 'bg-red-100 text-red-800',
      moderator: 'bg-blue-100 text-blue-800',
      user: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <Badge className={roleColors[role as keyof typeof roleColors] || roleColors.user}>
        {role === 'admin' ? 'Admin' : role === 'moderator' ? 'Moderator' : 'User'}
      </Badge>
    )
  }

  const getStatusBadge = (isBanned: boolean) => {
    return isBanned ? (
      <Badge variant="destructive">Banned</Badge>
    ) : (
      <Badge variant="secondary">Active</Badge>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage user accounts and set permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User table */}
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner text="Loading user list..." />
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{user.username}</div>
                          <div className="text-sm text-gray-500">
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
                          <div className="text-xs text-red-600 mt-1">
                            {user.ban_reason}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{user.karma_points.toLocaleString()}</TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>User Management</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem 
                              onClick={() => openActionDialog('change_role', user)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Change Role
                            </DropdownMenuItem>
                            
                            {user.is_banned ? (
                              <DropdownMenuItem 
                                onClick={() => openActionDialog('unban_user', user)}
                              >
                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                Unban
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => openActionDialog('ban_user', user)}
                              >
                                <Ban className="mr-2 h-4 w-4 text-red-600" />
                                Ban User
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => openActionDialog('delete_user', user)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
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
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500">
                  Total {pagination.totalUsers} users (Page {pagination.currentPage}/{pagination.totalPages})
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasPrev}
                    onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
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

          {actionDialog.action === 'ban_user' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Ban Reason</label>
              <Textarea
                placeholder="Enter ban reason..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </div>
          )}

          {actionDialog.action === 'change_role' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">New Role</label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, action: '', title: '', description: '' })}
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog.action === 'delete_user' ? 'destructive' : 'default'}
              onClick={() => selectedUser && handleUserAction(actionDialog.action, selectedUser.id)}
              disabled={
                (actionDialog.action === 'change_role' && !newRole) ||
                (actionDialog.action === 'ban_user' && !banReason.trim())
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