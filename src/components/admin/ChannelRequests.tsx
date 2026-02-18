'use client&apos;

import { useState, useEffect } from &apos;react&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from &apos;@/components/ui/card&apos;
import { Badge } from &apos;@/components/ui/badge&apos;
import { Textarea } from &apos;@/components/ui/textarea&apos;
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from &apos;@/components/ui/dialog&apos;
import { CheckCircle, XCircle, Clock, MessageSquare, User, Calendar } from &apos;lucide-react&apos;
import { Alert, AlertDescription } from &apos;@/components/ui/alert&apos;

interface ChannelRequest {
  id: string
  name: string
  display_name: string
  description: string
  category: string
  reason: string
  status: &apos;pending&apos; | &apos;pending_review&apos; | &apos;approved&apos; | &apos;rejected&apos;
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
  const [actionType, setActionType] = useState<&apos;approve&apos; | &apos;reject&apos; | null>(null)
  const [adminNotes, setAdminNotes] = useState(&apos;')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const response = await fetch(&apos;/api/admin/channel-requests&apos;)
      const data = await response.json()
      
      if (data.requests) {
        setRequests(data.requests)
      }
    } catch (error) {
      console.error(&apos;Failed to fetch requests:&apos;, error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return

    setProcessing(true)
    try {
      const response = await fetch(&apos;/api/admin/channel-requests&apos;, {
        method: &apos;PUT&apos;,
        headers: {
          &apos;Content-Type&apos;: &apos;application/json&apos;,
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
        setAdminNotes(&apos;')
      }
    } catch (error) {
      console.error(&apos;Action failed:&apos;, error)
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case &apos;pending&apos;:
        return <Badge variant=&quot;outline&quot; className=&quot;text-blue-600 border-blue-600&quot;>Pending</Badge>
      case &apos;pending_review&apos;:
        return <Badge variant=&quot;outline&quot; className=&quot;text-yellow-600 border-yellow-600&quot;>Needs Review</Badge>
      case &apos;approved&apos;:
        return <Badge variant=&quot;outline&quot; className=&quot;text-green-600 border-green-600&quot;>Approved</Badge>
      case &apos;rejected&apos;:
        return <Badge variant=&quot;outline&quot; className=&quot;text-red-600 border-red-600&quot;>Rejected</Badge>
      default:
        return <Badge variant=&quot;outline&quot;>Unknown</Badge>
    }
  }

  const getAccountAge = (createdAt: string) => {
    const days = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
    return `${days}d`
  }

  if (loading) {
    return (
      <div className=&quot;flex items-center justify-center p-8&quot;>
        <div className=&quot;text-center&quot;>
          <Clock className=&quot;w-8 h-8 animate-spin mx-auto mb-2&quot; />
          <p>Loading request list...</p>
        </div>
      </div>
    )
  }

  const pendingRequests = requests.filter(r => r.status === &apos;pending&apos; || r.status === &apos;pending_review&apos;)
  const processedRequests = requests.filter(r => r.status === &apos;approved&apos; || r.status === &apos;rejected&apos;)

  return (
    <div className=&quot;space-y-6&quot;>
      <div className=&quot;flex items-center justify-between&quot;>
        <div>
          <h2 className=&quot;text-2xl font-bold&quot;>Channel Creation Requests</h2>
          <p className=&quot;text-gray-600&quot;>Manage user requests for creating new community channels.</p>
        </div>
        <div className=&quot;flex gap-2&quot;>
          <Badge variant=&quot;outline&quot; className=&quot;text-yellow-600 border-yellow-600&quot;>
            Pending: {pendingRequests.length}
          </Badge>
        </div>
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div className=&quot;space-y-4&quot;>
          <h3 className=&quot;text-lg font-semibold&quot;>Needs Review</h3>
          {pendingRequests.map((request) => (
            <Card key={request.id} className=&quot;border-l-4 border-l-yellow-400&quot;>
              <CardHeader>
                <div className=&quot;flex items-start justify-between&quot;>
                  <div>
                    <CardTitle className=&quot;text-lg&quot;>k/{request.name}</CardTitle>
                    <CardDescription className=&quot;text-base font-medium&quot;>
                      {request.display_name}
                    </CardDescription>
                  </div>
                  <div className=&quot;flex items-center gap-2&quot;>
                    {getStatusBadge(request.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className=&quot;space-y-4&quot;>
                <div>
                  <h4 className=&quot;font-medium mb-1&quot;>Description</h4>
                  <p className=&quot;text-sm text-gray-600&quot;>{request.description}</p>
                </div>
                
                <div>
                  <h4 className=&quot;font-medium mb-1&quot;>Reason for Creation</h4>
                  <p className=&quot;text-sm text-gray-600&quot;>{request.reason}</p>
                </div>

                <div className=&quot;flex items-center gap-4 text-sm text-gray-500&quot;>
                  <div className=&quot;flex items-center gap-1&quot;>
                    <User className=&quot;w-4 h-4&quot; />
                    {request.creator.username}
                  </div>
                  <div>Karma: {request.creator.karma_points}</div>
                  <div>Member for: {getAccountAge(request.creator.created_at)}</div>
                  <div className=&quot;flex items-center gap-1&quot;>
                    <Calendar className=&quot;w-4 h-4&quot; />
                    {new Date(request.created_at).toLocaleDateString()}
                  </div>
                </div>

                {request.ai_review_result && (
                  <Alert className={request.ai_review_result.approved ? &apos;border-green-500 bg-green-50&apos; : &apos;border-red-500 bg-red-50&apos;}>
                    <MessageSquare className=&quot;w-4 h-4&quot; />
                    <AlertDescription>
                      <strong>AI Review:</strong> {request.ai_review_result.reason}
                      <span className=&quot;text-xs ml-2&quot;>
                        (Confidence: {Math.round(request.ai_review_result.confidence * 100)}%)
                      </span>
                    </AlertDescription>
                  </Alert>
                )}

                <div className=&quot;flex justify-end gap-2&quot;>
                  <Button
                    variant=&quot;outline&quot;
                    size=&quot;sm&quot;
                    onClick={() => {
                      setSelectedRequest(request)
                      setActionType(&apos;reject&apos;)
                    }}
                    className=&quot;text-red-600 hover:text-red-700&quot;
                  >
                    <XCircle className=&quot;w-4 h-4 mr-1&quot; />
                    Reject
                  </Button>
                  <Button
                    size=&quot;sm&quot;
                    onClick={() => {
                      setSelectedRequest(request)
                      setActionType(&apos;approve&apos;)
                    }}
                    className=&quot;bg-green-600 hover:bg-green-700&quot;
                  >
                    <CheckCircle className=&quot;w-4 h-4 mr-1&quot; />
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
        <div className=&quot;space-y-4&quot;>
          <h3 className=&quot;text-lg font-semibold&quot;>Processed</h3>
          <div className=&quot;grid gap-4&quot;>
            {processedRequests.slice(0, 5).map((request) => (
              <Card key={request.id} className=&quot;border-l-4 border-l-gray-300&quot;>
                <CardContent className=&quot;p-4&quot;>
                  <div className=&quot;flex items-center justify-between&quot;>
                    <div>
                      <h4 className=&quot;font-medium&quot;>k/{request.name}</h4>
                      <p className=&quot;text-sm text-gray-600&quot;>{request.display_name}</p>
                    </div>
                    <div className=&quot;flex items-center gap-2&quot;>
                      {getStatusBadge(request.status)}
                      <span className=&quot;text-xs text-gray-500&quot;>
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {request.admin_notes && (
                    <p className=&quot;text-xs text-gray-500 mt-2&quot;>Admin Note: {request.admin_notes}</p>
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
        setAdminNotes(&apos;')
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === &apos;approve&apos; ? &apos;Approve Channel Creation&apos; : &apos;Reject Channel Creation&apos;}
            </DialogTitle>
            <DialogDescription>
              k/{selectedRequest?.name} - {selectedRequest?.display_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className=&quot;space-y-4&quot;>
            <div>
              <label className=&quot;text-sm font-medium&quot;>Admin Notes</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={
                  actionType === &apos;approve&apos; 
                    ? &apos;Enter approval reason (optional)&apos;
                    : &apos;Enter rejection reason&apos;
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant=&quot;outline&quot; onClick={() => {
              setSelectedRequest(null)
              setActionType(null)
              setAdminNotes(&apos;')
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing || (actionType === &apos;reject&apos; && !adminNotes.trim())}
              className={actionType === &apos;approve&apos; ? &apos;bg-green-600 hover:bg-green-700&apos; : &apos;bg-red-600 hover:bg-red-700&apos;}
            >
              {processing ? &apos;Processing...&apos; : (actionType === &apos;approve&apos; ? &apos;Approve&apos; : &apos;Reject&apos;)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}