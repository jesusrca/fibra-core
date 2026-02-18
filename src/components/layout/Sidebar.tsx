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
} from 'lucide-react'

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
    const [collapsed, setCollapsed] = useState(false)
    const pathname = usePathname()

    const accessibleItems = navItems.filter((item) => canAccess(userRole, item.module))

    return (
        <aside
            className={cn(
                'relative flex flex-col h-screen bg-card/60 backdrop-blur-sm border-r border-border/60 transition-all duration-300',
                collapsed ? 'w-16' : 'w-60'
            )}
        >
            {/* Logo */}
            <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-border/60', collapsed && 'justify-center px-2')}>
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-electric-500 to-gold-500 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                </div>
                {!collapsed && (
                    <div>
                        <p className="text-sm font-bold text-foreground leading-none">Fibra Core</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Gestión Empresarial</p>
                    </div>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {accessibleItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn('nav-item', isActive && 'active', collapsed && 'justify-center px-2')}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            {!collapsed && <span>{item.label}</span>}
                        </Link>
                    )
                })}
            </nav>

            {/* Collapse toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-200 z-10"
            >
                {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </button>
        </aside>
    )
}
