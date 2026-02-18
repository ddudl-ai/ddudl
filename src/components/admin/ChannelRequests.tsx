'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckCircle, XCircle, Clock, MessageSquare, User, Calendar } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ChannelRequest {
  id: string
  name: string
  display_name: string
  description: string
  category: string
  reason: string
  status: 'pending' | 'pending_review' | 'approved' | 'rejected'
  ai_review_result?: {
    approved: boolean
    confidence: number
    reason: string
  }
  admin_notes?: string
  created_at: string
  creator: {
    username: string
    karma_points: number
    created_at: string
  }
}

export default function ChannelRequests() {
  const [requests, setRequests] = useState<ChannelRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<ChannelRequest | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/admin/channel-requests')
      const data = await response.json()
      
      if (data.requests) {
        setRequests(data.requests)
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return

    setProcessing(true)
    try {
      const response = await fetch('/api/admin/channel-requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          action: actionType,
          adminNotes: adminNotes
        }),
      })

      if (response.ok) {
        await fetchRequests() // Refresh list
        setSelectedRequest(null)
        setActionType(null)
        setAdminNotes('')
      }
    } catch (error) {
      console.error('Action failed:', error)
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Pending</Badge>
      case 'pending_review':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Needs Review</Badge>
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600">Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600">Rejected</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getAccountAge = (createdAt: string) => {
    const days = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
    return `${days}d`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Loading request list...</p>
        </div>
      </div>
    )
  }

  const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'pending_review')
  const processedRequests = requests.filter(r => r.status === 'approved' || r.status === 'rejected')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Channel Creation Requests</h2>
          <p className="text-gray-600">Manage user requests for creating new community channels.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            Pending: {pendingRequests.length}
          </Badge>
        </div>
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Needs Review</h3>
          {pendingRequests.map((request) => (
            <Card key={request.id} className="border-l-4 border-l-yellow-400">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">k/{request.name}</CardTitle>
                    <CardDescription className="text-base font-medium">
                      {request.display_name}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(request.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">Description</h4>
                  <p className="text-sm text-gray-600">{request.description}</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-1">Reason for Creation</h4>
                  <p className="text-sm text-gray-600">{request.reason}</p>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {request.creator.username}
                  </div>
                  <div>Karma: {request.creator.karma_points}</div>
                  <div>Member for: {getAccountAge(request.creator.created_at)}</div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(request.created_at).toLocaleDateString()}
                  </div>
                </div>

                {request.ai_review_result && (
                  <Alert className={request.ai_review_result.approved ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                    <MessageSquare className="w-4 h-4" />
                    <AlertDescription>
                      <strong>AI Review:</strong> {request.ai_review_result.reason}
                      <span className="text-xs ml-2">
                        (Confidence: {Math.round(request.ai_review_result.confidence * 100)}%)
                      </span>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRequest(request)
                      setActionType('reject')
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedRequest(request)
                      setActionType('approve')
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Processed requests */}
      {processedRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Processed</h3>
          <div className="grid gap-4">
            {processedRequests.slice(0, 5).map((request) => (
              <Card key={request.id} className="border-l-4 border-l-gray-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">k/{request.name}</h4>
                      <p className="text-sm text-gray-600">{request.display_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(request.status)}
                      <span className="text-xs text-gray-500">
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {request.admin_notes && (
                    <p className="text-xs text-gray-500 mt-2">Admin Note: {request.admin_notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Action dialog */}
      <Dialog open={!!selectedRequest && !!actionType} onOpenChange={() => {
        setSelectedRequest(null)
        setActionType(null)
        setAdminNotes('')
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Channel Creation' : 'Reject Channel Creation'}
            </DialogTitle>
            <DialogDescription>
              k/{selectedRequest?.name} - {selectedRequest?.display_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Admin Notes</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={
                  actionType === 'approve' 
                    ? 'Enter approval reason (optional)'
                    : 'Enter rejection reason'
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedRequest(null)
              setActionType(null)
              setAdminNotes('')
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing || (actionType === 'reject' && !adminNotes.trim())}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {processing ? 'Processing...' : (actionType === 'approve' ? 'Approve' : 'Reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}