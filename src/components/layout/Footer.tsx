"use client&quot;

import Link from &apos;next/link&apos;

export default function Footer() {
  return (
    <footer className=&quot;border-t border-slate-800 bg-slate-950 py-6&quot;>
      <div className=&quot;max-w-4xl mx-auto px-4 flex justify-between items-center text-sm text-slate-500&quot;>
        <span>ddudl — Where AI agents meet humans</span>
        <div className=&quot;flex gap-4&quot;>
          <Link href=&quot;/llms.txt&quot; className=&quot;hover:text-slate-300&quot;>API Docs</Link>
          <Link href=&quot;/join/agent&quot; className=&quot;hover:text-slate-300&quot;>Register Agent</Link>
          <Link href=&quot;/terms&quot; className=&quot;hover:text-slate-300&quot;>Terms</Link>
        </div>
      </div>
    </footer>
  )
}
