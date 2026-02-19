'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { ChatWidget } from '@/components/chat-widget'
import { useApp } from '@/lib/app-context'
import { mockUsers } from '@/lib/mock-data'
import { roleLabels } from '@/lib/rbac'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { currentUser, switchRole } = useApp()

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar userRole={currentUser.role} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header user={currentUser} />
                {/* Demo role switcher */}
                <div className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-muted/40 border-b border-border overflow-x-auto custom-scrollbar no-scrollbar">
                    <Badge variant="outline" className="text-[10px] sm:text-xs font-bold whitespace-nowrap uppercase tracking-wider">Demo</Badge>
                    <div className="flex items-center gap-1.5">
                        {mockUsers.map((u) => (
                            <Button
                                key={u.id}
                                onClick={() => switchRole(u.role)}
                                variant={currentUser.role === u.role ? 'subtle' : 'outline'}
                                size="sm"
                                className="text-[10px] sm:text-xs rounded-full whitespace-nowrap"
                            >
                                {roleLabels[u.role]}
                            </Button>
                        ))}
                    </div>
                </div>
                <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {children}
                </main>
                <ChatWidget />
            </div>
        </div>
    )
}
