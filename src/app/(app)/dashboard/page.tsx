'use client'

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'
import {
    TrendingUp, TrendingDown, DollarSign, FolderKanban, Users, Megaphone,
    ArrowUpRight, Clock, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import {
    mockTransactions, mockProjects, mockLeads, mockNotifications,
    monthlyRevenue, projectStatusData, leadFunnelData,
} from '@/lib/mock-data'

const kpiData = [
    {
        label: 'Ingresos del Mes',
        value: formatCurrency(22700),
        change: '+12.4%',
        positive: true,
        icon: DollarSign,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
    },
    {
        label: 'Proyectos Activos',
        value: '3',
        change: '+1 este mes',
        positive: true,
        icon: FolderKanban,
        color: 'text-electric-400',
        bg: 'bg-electric-500/10',
        border: 'border-electric-500/20',
    },
    {
        label: 'Leads en Pipeline',
        value: formatCurrency(63500),
        change: '4 oportunidades',
        positive: true,
        icon: Users,
        color: 'text-gold-400',
        bg: 'bg-gold-500/10',
        border: 'border-gold-500/20',
    },
    {
        label: 'ROI Campañas',
        value: '3.2x',
        change: '-0.3x vs mes ant.',
        positive: false,
        icon: Megaphone,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
    },
]

const COLORS = ['#0EA5E9', '#F5C842', '#8B5CF6', '#10B981']

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card px-3 py-2 text-xs">
                <p className="text-muted-foreground mb-1">{label}</p>
                {payload.map((p: any) => (
                    <p key={p.name} style={{ color: p.color }} className="font-medium">
                        {p.name}: {formatCurrency(p.value)}
                    </p>
                ))}
            </div>
        )
    }
    return null
}

export default function DashboardPage() {
    const recentTransactions = mockTransactions.slice(0, 5)
    const activeProjects = mockProjects.filter((p) => p.status === 'active' || p.status === 'review')
    const unreadNotifs = mockNotifications.filter((n) => !n.read)

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page header */}
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Resumen ejecutivo — {formatDate(new Date())}</p>
                </div>
                <button className="btn-primary">
                    <TrendingUp className="w-4 h-4" />
                    Generar Reporte
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {kpiData.map((kpi) => {
                    const Icon = kpi.icon
                    return (
                        <div key={kpi.label} className={cn('kpi-card border', kpi.border)}>
                            <div className="flex items-start justify-between mb-3">
                                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', kpi.bg)}>
                                    <Icon className={cn('w-4 h-4', kpi.color)} />
                                </div>
                                <span className={cn('text-xs font-medium flex items-center gap-1', kpi.positive ? 'text-emerald-400' : 'text-red-400')}>
                                    {kpi.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {kpi.change}
                                </span>
                            </div>
                            <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                            <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
                        </div>
                    )
                })}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Revenue chart */}
                <div className="glass-card p-5 xl:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="section-title">Ingresos vs Gastos</h2>
                        <span className="badge badge-info">Últimos 6 meses</span>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={monthlyRevenue}>
                            <defs>
                                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F5C842" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#F5C842" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 16%)" />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#0EA5E9" strokeWidth={2} fill="url(#colorIngresos)" />
                            <Area type="monotone" dataKey="gastos" name="Gastos" stroke="#F5C842" strokeWidth={2} fill="url(#colorGastos)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Project status pie */}
                <div className="glass-card p-5">
                    <h2 className="section-title mb-4">Estado de Proyectos</h2>
                    <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                            <Pie data={projectStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                                {projectStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value, name) => [value, name]} contentStyle={{ background: 'hsl(220 25% 9%)', border: '1px solid hsl(220 20% 16%)', borderRadius: '8px', fontSize: '12px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                        {projectStatusData.map((item, i) => (
                            <div key={item.name} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                                    <span className="text-muted-foreground">{item.name}</span>
                                </div>
                                <span className="font-medium text-foreground">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Recent transactions */}
                <div className="glass-card p-5 xl:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="section-title">Transacciones Recientes</h2>
                        <a href="/contabilidad" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                            Ver todas <ArrowUpRight className="w-3 h-3" />
                        </a>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Descripción</th>
                                <th>Categoría</th>
                                <th>Fecha</th>
                                <th className="text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentTransactions.map((t) => (
                                <tr key={t.id}>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <div className={cn('w-1.5 h-1.5 rounded-full', t.type === 'income' ? 'bg-emerald-400' : 'bg-red-400')} />
                                            <span className="truncate max-w-[180px]">{t.description}</span>
                                        </div>
                                    </td>
                                    <td><span className="badge badge-neutral">{t.category}</span></td>
                                    <td className="text-muted-foreground">{formatDate(t.date)}</td>
                                    <td className={cn('text-right font-medium', t.type === 'income' ? 'text-emerald-400' : 'text-red-400')}>
                                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Active projects + notifications */}
                <div className="space-y-4">
                    {/* Active projects */}
                    <div className="glass-card p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="section-title text-base">Proyectos Activos</h2>
                            <a href="/proyectos" className="text-xs text-primary hover:text-primary/80 transition-colors">Ver todos</a>
                        </div>
                        <div className="space-y-3">
                            {activeProjects.slice(0, 3).map((p) => (
                                <div key={p.id} className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium text-foreground truncate max-w-[160px]">{p.name}</p>
                                        <span className="text-xs text-muted-foreground">{p.progress}%</span>
                                    </div>
                                    <div className="w-full bg-secondary rounded-full h-1.5">
                                        <div
                                            className="h-1.5 rounded-full bg-gradient-to-r from-electric-500 to-electric-400 transition-all duration-500"
                                            style={{ width: `${p.progress}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">{p.client}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="glass-card p-5">
                        <h2 className="section-title text-base mb-3">Alertas</h2>
                        <div className="space-y-2">
                            {unreadNotifs.slice(0, 3).map((n) => (
                                <div key={n.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-secondary/30 border border-border/40">
                                    <AlertCircle className="w-3.5 h-3.5 text-gold-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-foreground leading-snug">{n.message}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
