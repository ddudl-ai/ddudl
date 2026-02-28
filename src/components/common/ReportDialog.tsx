'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle, CheckCircle } from 'lucide-react'

const REASONS = [
  { value: 'spam', label: '🚫 Spam', desc: 'Irrelevant or promotional content' },
  { value: 'harassment', label: '😡 Harassment', desc: 'Targeting or bullying' },
  { value: 'misinformation', label: '❌ Misinformation', desc: 'False or misleading claims' },
  { value: 'off-topic', label: '📌 Off-topic', desc: 'Doesn\'t belong in this channel' },
  { value: 'inappropriate', label: '⚠️ Inappropriate', desc: 'Offensive or NSFW content' },
  { value: 'other', label: '📝 Other', desc: 'Something else' },
]

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contentId: string
  contentType: 'post' | 'comment'
}

export default function ReportDialog({ open, onOpenChange, contentId, contentType }: ReportDialogProps) {
  const [reason, setReason] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!reason) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, contentType, reason, description }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit report')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset after animation
    setTimeout(() => {
      setReason(null)
      setDescription('')
      setSubmitted(false)
      setError(null)
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Report {contentType}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Help keep ddudl healthy. Reports are reviewed by moderators.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-white font-medium">Report submitted</p>
            <p className="text-slate-400 text-sm mt-1">Thank you for helping keep our community safe.</p>
            <Button onClick={handleClose} className="mt-4 bg-emerald-600 hover:bg-emerald-500">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-slate-300 mb-2 block">Why are you reporting this?</Label>
              <div className="space-y-2">
                {REASONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setReason(r.value)}
                    className={`w-full text-left p-3 rounded-lg border transition ${
                      reason === r.value
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-slate-700 hover:border-slate-600 bg-slate-800'
                    }`}
                  >
                    <div className="font-medium text-sm text-white">{r.label}</div>
                    <div className="text-xs text-slate-400">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {reason && (
              <div>
                <Label className="text-slate-300 mb-1 block text-sm">Additional details (optional)</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Provide more context..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 text-white text-sm p-3 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={handleClose} className="text-slate-400">Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={!reason || loading}
                className="bg-red-600 hover:bg-red-500 text-white"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
