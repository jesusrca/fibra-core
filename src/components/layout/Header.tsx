'use client'

import { useState } from 'react'
import { Bell, Search, ChevronDown, LogOut, User, Settings } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { mockNotifications } from '@/lib/mock-data'
import { roleLabels } from '@/lib/rbac'
import type { User as UserType } from '@/lib/mock-data'
import { formatDate } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'

interface HeaderProps {
    user: UserType
}

export function Header({ user }: HeaderProps) {
    const [notifOpen, setNotifOpen] = useState(false)
    const [userMenuOpen, setUserMenuOpen] = useState(false)

    const unread = mockNotifications.filter((n) => !n.read).length

    const notifIcons: Record<string, string> = {
        task_due: '⏰',
        new_lead: '🎯',
        report_ready: '📊',
        project_update: '📁',
        invoice_overdue: '⚠️',
    }

    return (
        <header className="h-14 flex items-center justify-between px-6 border-b border-border/60 bg-card/40 backdrop-blur-sm flex-shrink-0">
            {/* Search */}
            <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Buscar..."
                    className="w-full bg-secondary/50 border border-border/50 rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
            </div>

            <div className="flex items-center gap-3">
                <ThemeToggle />
                {/* Notifications */}
                <div className="relative">
                    <button
                        onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false) }}
                        className="relative btn-ghost p-2"
                    >
                        <Bell className="w-4 h-4" />
                        {unread > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                                {unread}
                            </span>
                        )}
                    </button>

                    {notifOpen && (
                        <div className="absolute right-0 top-10 w-80 glass-card shadow-2xl shadow-black/40 z-50 overflow-hidden animate-fade-in">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                                <p className="text-sm font-semibold">Notificaciones</p>
                                <span className="badge badge-info">{unread} nuevas</span>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {mockNotifications.map((n) => (
                                    <div
                                        key={n.id}
                                        className={cn(
                                            'px-4 py-3 border-b border-border/40 hover:bg-secondary/30 transition-colors cursor-pointer',
                                            !n.read && 'bg-primary/5'
                                        )}
                                    >
                                        <div className="flex gap-3">
                                            <span className="text-lg flex-shrink-0">{notifIcons[n.type] ?? '🔔'}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-foreground leading-snug">{n.message}</p>
                                                <p className="text-[10px] text-muted-foreground mt-1">{formatDate(n.createdAt)}</p>
                                            </div>
                                            {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="px-4 py-2 border-t border-border/60">
                                <button className="text-xs text-primary hover:text-primary/80 transition-colors">
                                    Marcar todas como leídas
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* User menu */}
                <div className="relative">
                    <button
                        onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false) }}
                        className="flex items-center gap-2.5 btn-ghost px-2 py-1.5"
                    >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-electric-500 to-gold-500 flex items-center justify-center text-xs font-bold text-white">
                            {getInitials(user.name)}
                        </div>
                        <div className="text-left hidden sm:block">
                            <p className="text-xs font-medium text-foreground leading-none">{user.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{roleLabels[user.role]}</p>
                        </div>
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </button>

                    {userMenuOpen && (
                        <div className="absolute right-0 top-10 w-48 glass-card shadow-2xl shadow-black/40 z-50 overflow-hidden animate-fade-in">
                            <div className="px-3 py-2.5 border-b border-border/60">
                                <p className="text-xs font-medium text-foreground">{user.name}</p>
                                <p className="text-[10px] text-muted-foreground">{user.email}</p>
                            </div>
                            <div className="py-1">
                                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                                    <User className="w-3.5 h-3.5" /> Mi Perfil
                                </button>
                                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                                    <Settings className="w-3.5 h-3.5" /> Preferencias
                                </button>
                                <div className="border-t border-border/60 mt-1 pt-1">
                                    <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                                        <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
