'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Channel {
  id: string
  name: string
  display_name: string
  member_count: number
}

export default function SidebarChannels() {
  const [channels, setChannels] = useState<Channel[]>([])

  useEffect(() => {
    fetch('/api/channels')
      .then(r => r.json())
      .then(d => setChannels(d.channels || []))
      .catch(() => {})
  }, [])

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Popular Channels</h3>
      <div className="space-y-2">
        {channels.map(ch => (
          <Link
            key={ch.id}
            href={`/c/${ch.name}`}
            className="block p-3 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition"
          >
            <span className="font-medium text-slate-200 text-sm">{ch.display_name}</span>
            <span className="text-xs text-slate-500 ml-2">{ch.member_count} members</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
