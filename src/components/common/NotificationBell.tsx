'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  type: 'mention' | 'reply' | 'vote' | 'system'
  title: string
  body?: string
  link?: string
  source_username?: string
  is_read: boolean
  created_at: string
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=15')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unread_count || 0)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000) // poll every 60s
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    setUnreadCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const typeIcon = (type: string) => {
    switch (type) {
      case 'mention': return '💬'
      case 'reply': return '↩️'
      case 'vote': return '⬆️'
      case 'system': return '🔔'
      default: return '🔔'
    }
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="sm"
        className="text-slate-400 hover:text-white hover:bg-slate-800 relative"
        onClick={() => setOpen(!open)}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <span className="text-sm font-semibold text-white">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-emerald-400 hover:text-emerald-300"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-80">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.link || '#'}
                  onClick={async () => {
                    if (!n.is_read) {
                      await fetch('/api/notifications', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: [n.id] }),
                      })
                      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
                      setUnreadCount(c => c > 0 ? c - 1 : 0)
                    }
                    setOpen(false)
                  }}
                  className={`block px-4 py-3 hover:bg-slate-800 border-b border-slate-800 transition ${
                    !n.is_read ? 'bg-slate-800/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5">{typeIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.is_read ? 'text-white font-medium' : 'text-slate-300'}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{n.body}</p>
                      )}
                      <p className="text-xs text-slate-600 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
