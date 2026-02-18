'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { canAccess, type Module } from '@/lib/rbac'
import type { Role } from '@/lib/mock-data'
import {
    LayoutDashboard,
    Calculator,
    TrendingUp,
    FolderKanban,
    Megaphone,
    Handshake,
    FileBarChart,
    MessageSquare,
    Settings,
    ChevronLeft,
    ChevronRight,
    Zap,
    X,
} from 'lucide-react'
import { useApp } from '@/lib/app-context'

interface NavItem {
    label: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    module: Module
}

const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, module: 'dashboard' },
    { label: 'Contabilidad', href: '/contabilidad', icon: Calculator, module: 'contabilidad' },
    { label: 'Finanzas', href: '/finanzas', icon: TrendingUp, module: 'finanzas' },
    { label: 'Proyectos', href: '/proyectos', icon: FolderKanban, module: 'proyectos' },
    { label: 'Marketing', href: '/marketing', icon: Megaphone, module: 'marketing' },
    { label: 'Comercial', href: '/comercial', icon: Handshake, module: 'comercial' },
    { label: 'Reportes', href: '/reportes', icon: FileBarChart, module: 'reportes' },
    { label: 'Chatbot IA', href: '/chatbot', icon: MessageSquare, module: 'chatbot' },
    { label: 'Configuración', href: '/configuracion', icon: Settings, module: 'configuracion' },
]

interface SidebarProps {
    userRole: Role
}

export function Sidebar({ userRole }: SidebarProps) {
    const { sidebarOpen, setSidebarOpen } = useApp()
    const [collapsed, setCollapsed] = useState(false)
    const pathname = usePathname()

    const accessibleItems = navItems.filter((item) => canAccess(userRole, item.module))

    return (
        <>
            {/* Backdrop for mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden animate-fade-in"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside
                className={cn(
                    'fixed inset-y-0 left-0 lg:relative flex flex-col h-screen bg-card/95 lg:bg-card/60 backdrop-blur-md lg:backdrop-blur-sm border-r border-border/60 transition-all duration-300 z-50',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
                    collapsed ? 'lg:w-16' : 'lg:w-64 w-64'
                )}
            >
                {/* Logo */}
                <div className={cn('flex items-center justify-between px-4 py-6 border-b border-border/60', collapsed && 'lg:justify-center lg:px-2')}>
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-electric-500 to-gold-500 flex items-center justify-center">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        {(!collapsed || sidebarOpen) && (
                            <div>
                                <p className="text-sm font-bold text-foreground leading-none">Fibra Core</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Gestión Empresarial</p>
                            </div>
                        )}
                    </div>
                    {/* Close button for mobile */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden p-1 text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

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
                                    'nav-item',
                                    isActive && 'active',
                                    collapsed ? 'lg:justify-center lg:px-2' : ''
                                )}
                                title={collapsed ? item.label : undefined}
                            >
                                <Icon className="w-4 h-4 flex-shrink-0" />
                                <span className={cn(collapsed ? 'lg:hidden' : 'block')}>
                                    {item.label}
                                </span>
                            </Link>
                        )
                    })}
                </nav>

                {/* Collapse toggle (Desktop only) */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-200 z-10"
                >
                    {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                </button>
            </aside>
        </>
    )
}
