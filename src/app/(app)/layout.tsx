'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { useApp } from '@/lib/app-context'
import { mockUsers } from '@/lib/mock-data'
import { roleLabels } from '@/lib/rbac'

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { currentUser, switchRole } = useApp()

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar userRole={currentUser.role} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header user={currentUser} />
                {/* Demo role switcher */}
                <div className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-gold-500/10 border-b border-gold-500/20 overflow-x-auto custom-scrollbar no-scrollbar">
                    <span className="text-[10px] sm:text-xs text-gold-400 font-bold whitespace-nowrap uppercase tracking-wider">🎭 Demo:</span>
                    <div className="flex items-center gap-1.5">
                        {mockUsers.map((u) => (
                            <button
                                key={u.id}
                                onClick={() => switchRole(u.role)}
                                className={`text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded-full border transition-all duration-200 whitespace-nowrap ${currentUser.role === u.role
                                    ? 'bg-gold-500/20 border-gold-500/40 text-gold-400 font-bold'
                                    : 'border-border/40 text-muted-foreground hover:text-foreground hover:border-border'
                                    }`}
                            >
                                {roleLabels[u.role]}
                            </button>
                        ))}
                    </div>
                </div>
                <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
