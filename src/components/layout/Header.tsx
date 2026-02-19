'use client'

import { useEffect, useState } from 'react'
import { Bell, Search, ChevronDown, LogOut, User, Settings, Menu } from 'lucide-react'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { cn, getInitials } from '@/lib/utils'
import { roleLabels } from '@/lib/rbac'
import type { AppUser } from '@/lib/app-context'
import { formatDate } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useApp } from '@/lib/app-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface HeaderProps {
    user: AppUser
}

export function Header({ user }: HeaderProps) {
    const { toggleSidebar } = useApp()
    const { data: session } = useSession()
    const [notifOpen, setNotifOpen] = useState(false)
    const [notifications, setNotifications] = useState<Array<{ id: string; message: string; createdAt: string; read?: boolean; type?: string }>>([])
    const effectiveUser = {
        ...user,
        name: session?.user?.name || user.name,
        email: session?.user?.email || user.email
    }

    const unread = notifications.filter((n) => !n.read).length

    useEffect(() => {
        fetch('/api/notifications')
            .then((res) => res.ok ? res.json() : { notifications: [] })
            .then((data) => setNotifications(Array.isArray(data.notifications) ? data.notifications : []))
            .catch(() => setNotifications([]))
    }, [])

    const markAllAsRead = async () => {
        const previous = notifications
        setNotifications((state) => state.map((n) => ({ ...n, read: true })))
        const res = await fetch('/api/notifications', { method: 'PATCH' })
        if (!res.ok) setNotifications(previous)
    }

    const markOneAsRead = async (id: string) => {
        setNotifications((state) => state.map((n) => n.id === id ? { ...n, read: true } : n))
        await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
    }

    const notifIcons: Record<string, string> = {
        task_due: '⏰',
        new_lead: '🎯',
        report_ready: '📊',
        project_update: '📁',
        invoice_overdue: '⚠️',
        milestone_billing_due: '💸',
    }

    return (
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0 z-40">
            <div className="flex items-center gap-4 flex-1">
                {/* Mobile Toggle */}
                <Button onClick={toggleSidebar} variant="ghost" size="icon" className="lg:hidden -ml-2">
                    <Menu className="w-6 h-6" />
                </Button>

                {/* Search */}
                <div className="relative w-full max-w-xs hidden sm:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Buscar..."
                        className="pl-9 bg-background"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3">
                <ThemeToggle />
                {/* Notifications */}
                <div className="relative">
                    <Button
                        onClick={() => setNotifOpen(!notifOpen)}
                        variant="ghost"
                        size="icon"
                        className="relative"
                    >
                        <Bell className="w-4 h-4" />
                        {unread > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                                {unread}
                            </span>
                        )}
                    </Button>

                    {notifOpen && (
                        <div className="absolute right-0 top-10 w-80 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg z-50 overflow-hidden animate-fade-in">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                                <p className="text-sm font-semibold">Notificaciones</p>
                                <Badge variant="default">{unread} nuevas</Badge>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        onClick={() => {
                                            if (!n.read) markOneAsRead(n.id)
                                        }}
                                        className={cn(
                                            'px-4 py-3 border-b border-border/40 hover:bg-secondary/30 transition-colors cursor-pointer',
                                            !n.read && 'bg-primary/5'
                                        )}
                                    >
                                        <div className="flex gap-3">
                                            <span className="text-lg flex-shrink-0">{notifIcons[n.type || ''] ?? '🔔'}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-foreground leading-snug">{n.message}</p>
                                                <p className="text-[10px] text-muted-foreground mt-1">{formatDate(n.createdAt)}</p>
                                            </div>
                                            {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="px-4 py-2 border-t border-border">
                                <button
                                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                                    type="button"
                                    onClick={markAllAsRead}
                                >
                                    Marcar todas como leídas
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* User menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="flex items-center gap-2.5 px-2 py-1.5 h-auto"
                            onClick={() => setNotifOpen(false)}
                        >
                            <Avatar className="w-7 h-7">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                    {getInitials(effectiveUser.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="text-left hidden sm:block">
                                <p className="text-xs font-medium text-foreground leading-none">{effectiveUser.name}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{roleLabels[user.role]}</p>
                            </div>
                            <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className="space-y-0.5">
                            <p className="text-xs font-medium text-foreground">{effectiveUser.name}</p>
                            <p className="text-[10px] font-normal text-muted-foreground">{effectiveUser.email}</p>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/perfil" className="flex items-center gap-2">
                                <User className="w-3.5 h-3.5" /> Mi Perfil
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/configuracion" className="flex items-center gap-2">
                                <Settings className="w-3.5 h-3.5" /> Preferencias
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => signOut({ callbackUrl: '/login' })}
                        >
                            <LogOut className="w-3.5 h-3.5 mr-2" />
                            Cerrar Sesión
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}
