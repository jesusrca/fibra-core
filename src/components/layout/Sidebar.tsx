'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { canAccess, type Module } from '@/lib/rbac'
import type { Role } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
    LayoutDashboard,
    Calculator,
    TrendingUp,
    FolderKanban,
    Megaphone,
    Handshake,
    FileBarChart,
    Receipt,
    MessageSquare,
    Settings,
    ChevronLeft,
    ChevronRight,
    Zap,
    X,
    Users as UsersIcon,
    Truck,
} from 'lucide-react'
import { useApp } from '@/lib/app-context'

interface NavItem {
    label: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    module: Module
    notifyKey: NotificationModuleKey
}

type NotificationModuleKey =
    | 'dashboard'
    | 'comercial'
    | 'proyectos'
    | 'equipo'
    | 'proveedores'
    | 'contabilidad'
    | 'facturas'
    | 'finanzas'
    | 'marketing'
    | 'reportes'
    | 'chatbot'
    | 'configuracion'

const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, module: 'dashboard', notifyKey: 'dashboard' },
    { label: 'Comercial (CRM)', href: '/comercial', icon: Handshake, module: 'comercial', notifyKey: 'comercial' },
    { label: 'Proyectos', href: '/proyectos', icon: FolderKanban, module: 'proyectos', notifyKey: 'proyectos' },
    { label: 'Equipo', href: '/equipo', icon: UsersIcon, module: 'equipo', notifyKey: 'equipo' },
    { label: 'Proveedores', href: '/proveedores', icon: Truck, module: 'proveedores', notifyKey: 'proveedores' },
    { label: 'Contabilidad', href: '/contabilidad', icon: Calculator, module: 'contabilidad', notifyKey: 'contabilidad' },
    { label: 'Facturas', href: '/facturas', icon: Receipt, module: 'facturas', notifyKey: 'facturas' },
    { label: 'Finanzas', href: '/finanzas', icon: TrendingUp, module: 'finanzas', notifyKey: 'finanzas' },
    { label: 'Marketing', href: '/marketing', icon: Megaphone, module: 'marketing', notifyKey: 'marketing' },
    { label: 'Reportes', href: '/reportes', icon: FileBarChart, module: 'reportes', notifyKey: 'reportes' },
    { label: 'Chatbot IA', href: '/chatbot', icon: MessageSquare, module: 'chatbot', notifyKey: 'chatbot' },
    { label: 'Configuración', href: '/configuracion', icon: Settings, module: 'configuracion', notifyKey: 'configuracion' },
]

interface SidebarProps {
    userRole: Role
}

export function Sidebar({ userRole }: SidebarProps) {
    const { sidebarOpen, setSidebarOpen } = useApp()
    const [collapsed, setCollapsed] = useState(false)
    const [unreadByModule, setUnreadByModule] = useState<Record<NotificationModuleKey, number>>({
        dashboard: 0,
        comercial: 0,
        proyectos: 0,
        equipo: 0,
        proveedores: 0,
        contabilidad: 0,
        facturas: 0,
        finanzas: 0,
        marketing: 0,
        reportes: 0,
        chatbot: 0,
        configuracion: 0,
    })
    const pathname = usePathname()

    const accessibleItems = useMemo(
        () => navItems.filter((item) => canAccess(userRole, item.module)),
        [userRole]
    )

    useEffect(() => {
        let cancelled = false

        const loadSummary = async () => {
            try {
                const res = await fetch('/api/notifications/summary', { cache: 'no-store' })
                if (!res.ok) return
                const data = await res.json()
                if (!cancelled && data?.byModule) {
                    setUnreadByModule((prev) => ({ ...prev, ...data.byModule }))
                }
            } catch {
                // ignore in UI and keep default counters
            }
        }

        loadSummary()
        const intervalId = window.setInterval(loadSummary, 30000)

        return () => {
            cancelled = true
            window.clearInterval(intervalId)
        }
    }, [])

    return (
        <>
            {/* Backdrop for mobile */}
            {sidebarOpen && <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 lg:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />}

            <aside
                className={cn(
                    'fixed inset-y-0 left-0 lg:relative flex flex-col h-screen bg-card border-r border-border transition-all duration-300 z-50',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
                    collapsed ? 'lg:w-16' : 'lg:w-64 w-64'
                )}
            >
                {/* Logo */}
                <div className={cn('flex items-center justify-between px-4 py-5', collapsed && 'lg:justify-center lg:px-2')}>
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                            <Zap className="w-4 h-4" />
                        </div>
                        {(!collapsed || sidebarOpen) && (
                            <div>
                                <p className="text-sm font-bold text-foreground leading-none">Fibra Core</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Gestión Empresarial</p>
                            </div>
                        )}
                    </div>
                    {/* Close button for mobile */}
                    <Button
                        onClick={() => setSidebarOpen(false)}
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
                <Separator />

                {/* Nav */}
                <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
                    {accessibleItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                    'nav-item relative',
                                    isActive && 'active',
                                    collapsed ? 'lg:justify-center lg:px-2' : ''
                                )}
                                title={collapsed ? item.label : undefined}
                            >
                                <Icon className="w-4 h-4 flex-shrink-0" />
                                <span className={cn(collapsed ? 'lg:hidden' : 'block')}>
                                    {item.label}
                                </span>
                                {unreadByModule[item.notifyKey] > 0 && (
                                    <span
                                        className={cn(
                                            'inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground',
                                            collapsed ? 'lg:absolute lg:-top-1 lg:-right-1 lg:min-w-4 lg:h-4 lg:px-0.5 lg:text-[9px]' : 'ml-auto'
                                        )}
                                    >
                                        {unreadByModule[item.notifyKey] > 9 ? '9+' : unreadByModule[item.notifyKey]}
                                    </span>
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* Collapse toggle (Desktop only) */}
                <Button
                    onClick={() => setCollapsed(!collapsed)}
                    variant="outline"
                    size="icon"
                    className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full z-10"
                >
                    {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                </Button>
            </aside>
        </>
    )
}
