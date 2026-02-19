'use client'

import { ReactNode } from 'react'

interface SidebarProps {
  children: ReactNode
}

export default function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="space-y-4">
      {children}
    </aside>
  )
}