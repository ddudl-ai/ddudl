'use client&apos;

import { ReactNode } from &apos;react&apos;

interface SidebarProps {
  children: ReactNode
}

export default function Sidebar({ children }: SidebarProps) {
  return (
    <aside className=&quot;space-y-4&quot;>
      {children}
    </aside>
  )
}