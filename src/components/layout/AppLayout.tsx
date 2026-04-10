import type { ReactNode } from 'react'
import Sidebar from './Sidebar'

interface NavItem { to: string; label: string; icon: string }

interface Props {
  children: ReactNode
  navItems: NavItem[]
  title: string
  subtitle?: string
  sidebarBottom?: ReactNode
}

export default function AppLayout({ children, navItems, title, subtitle, sidebarBottom }: Props) {
  return (
    <div className="min-h-screen bg-[#080808]">
      <Sidebar items={navItems} title={title} subtitle={subtitle} bottom={sidebarBottom} />
      <main style={{ marginLeft: 240 }} className="p-10 min-h-screen">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
