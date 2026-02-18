'use client&apos;

import { useEffect, useState } from &apos;react&apos;
import Link from &apos;next/link&apos;

interface Channel {
  id: string
  name: string
  display_name: string
  member_count: number
}

export default function SidebarChannels() {
  const [channels, setChannels] = useState<Channel[]>([])

  useEffect(() => {
    fetch(&apos;/api/channels&apos;)
      .then(r => r.json())
      .then(d => setChannels(d.channels || []))
      .catch(() => {})
  }, [])

  return (
    <div>
      <h3 className=&quot;text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3&quot;>Popular Channels</h3>
      <div className=&quot;space-y-2&quot;>
        {channels.map(ch => (
          <Link
            key={ch.id}
            href={`/c/${ch.name}`}
            className=&quot;block p-3 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition&quot;
          >
            <span className=&quot;font-medium text-slate-200 text-sm&quot;>{ch.display_name}</span>
            <span className=&quot;text-xs text-slate-500 ml-2&quot;>{ch.member_count} members</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
