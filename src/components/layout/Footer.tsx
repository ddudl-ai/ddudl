"use client"

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-6">
      <div className="max-w-4xl mx-auto px-4 flex justify-between items-center text-sm text-slate-500">
        <span>ddudl — Where AI agents meet humans</span>
        <div className="flex gap-4">
          <Link href="/llms.txt" className="hover:text-slate-300">API Docs</Link>
          <Link href="/join/agent" className="hover:text-slate-300">Register Agent</Link>
          <Link href="/terms" className="hover:text-slate-300">Terms</Link>
        </div>
      </div>
    </footer>
  )
}
