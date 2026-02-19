'use client'

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from 'recharts'
import {
    TrendingUp, TrendingDown, FolderKanban, Users, Megaphone,
    ArrowUpRight,
} from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { monthlyRevenue } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { TremorCard, TremorMetric, TremorTitle } from '@/components/ui/tremor'

interface DashboardClientProps {
    stats: {
        totalRevenue: number
        activeProjectsCount: number
        pipelineValue: number
        opportunitiesCount: number
        projectsByStatus: { name: string, value: number }[]
        recentTransactions: any[]
        activeProjects: any[]
        recentNotifications: any[]
    }
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <TremorCard className="px-3 py-2 text-xs">
                <p className="text-muted-foreground mb-1 font-medium">{label}</p>
                {payload.map((p: any) => (
                    <p key={p.name} style={{ color: p.color }} className="font-semibold flex items-center justify-between gap-4">
                        <span>{p.name}:</span>
                        <span>{formatCurrency(p.value)}</span>
                    </p>
                ))}
            </TremorCard>
        )
    }
    return null
}

export function DashboardClient({ stats }: DashboardClientProps) {
    const projectStatusColors = ['#2563EB', '#06B6D4', '#10B981', '#F59E0B']

    const kpiCards = [
        {
            label: 'Proyectos Activos',
            value: stats.activeProjectsCount.toString(),
            change: '+1 este mes',
            positive: true,
            icon: FolderKanban,
            color: 'text-blue-600',
            bg: 'bg-blue-500/10',
        },
        {
            label: 'Leads en Pipeline',
            value: formatCurrency(stats.pipelineValue),
            change: `${stats.opportunitiesCount} oportunidades`,
            positive: true,
            icon: Users,
            color: 'text-cyan-600',
            bg: 'bg-cyan-500/10',
        },
        {
            label: 'ROI Campañas',
            value: '3.2x',
            change: '-0.3x vs mes ant.',
            positive: false,
            icon: Megaphone,
            color: 'text-emerald-600',
            bg: 'bg-emerald-500/10',
        },
    ]

    return (
        <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto">
            {/* Header / Hero Section */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                        Hola, Jesús 👋
                    </h2>
                    <p className="text-muted-foreground mt-1.5 text-base sm:text-lg">
                        Aquí tienes el resumen de tu empresa hoy.
                    </p>
                </div>
                <div className="flex gap-2.5">
                    <Button variant="outline">
                        <span className="text-xs">📅 Últimos 30 días</span>
                    </Button>
                    <Button>
                        <TrendingUp className="w-4 h-4" />
                        Generar Reporte
                    </Button>
                </div>
            </div>

            {/* Main Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Total Revenue */}
                <Card className="p-6 min-h-[220px] flex flex-col justify-between relative overflow-hidden">
                    <div>
                        <TremorTitle className="mb-3 text-sm">Ingresos Totales</TremorTitle>
                        <TremorMetric className="text-3xl sm:text-4xl font-extrabold gradient-text tracking-tight">
                            {formatCurrency(stats.totalRevenue)}
                        </TremorMetric>
                    </div>
                    <div className="flex items-center gap-2 mt-4 text-emerald-600 bg-emerald-500/10 w-fit px-3 py-1 rounded-full text-sm font-semibold">
                            <TrendingUp className="w-4 h-4" />
                            <span>+12.4% vs mes anterior</span>
                    </div>
                </Card>

                {/* Sub KPIs */}
                {kpiCards.map((kpi) => {
                    const Icon = kpi.icon
                    return (
                        <Card key={kpi.label} className="p-6 min-h-[220px] flex flex-col justify-between hover:shadow-md transition-all duration-200">
                            <div className="flex items-start justify-between gap-3">
                                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center transition-colors', kpi.bg)}>
                                    <Icon className={cn('w-5 h-5', kpi.color)} />
                                </div>
                                <Badge className={cn(
                                    'text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shrink-0',
                                    kpi.positive ? 'text-emerald-700 bg-emerald-100 border-emerald-200' : 'text-rose-700 bg-rose-100 border-rose-200'
                                )}>
                                    {kpi.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {kpi.positive ? '+' : ''}{kpi.change}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-foreground tracking-tight">{kpi.value}</p>
                                <p className="text-base font-medium text-muted-foreground mt-1.5">{kpi.label}</p>
                            </div>
                        </Card>
                    )
                })}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Revenue chart */}
                <Card className="p-6 xl:col-span-2 min-h-[460px] flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Análisis Financiero</h2>
                            <p className="text-xs text-muted-foreground">Ingresos vs Gastos (Últimos 6 meses)</p>
                        </div>
                        <Badge variant="secondary">Semestral</Badge>
                    </div>
                    <ResponsiveContainer width="100%" height={340}>
                        <AreaChart data={monthlyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.22} />
                                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.16} />
                                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" vertical={false} />
                            <XAxis 
                                dataKey="month" 
                                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                                axisLine={false} 
                                tickLine={false} 
                                dy={10}
                            />
                            <YAxis 
                                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                                axisLine={false} 
                                tickLine={false} 
                                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} 
                                dx={-10}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Area 
                                type="monotone" 
                                dataKey="ingresos" 
                                name="Ingresos" 
                                stroke="#2563EB" 
                                strokeWidth={3} 
                                fill="url(#colorIngresos)" 
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="gastos" 
                                name="Gastos" 
                                stroke="#06B6D4" 
                                strokeWidth={3} 
                                fill="url(#colorGastos)" 
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </Card>

                {/* Project status pie */}
                <Card className="p-6 min-h-[460px] flex flex-col">
                    <h2 className="text-lg font-bold text-foreground mb-1">Estado de Proyectos</h2>
                    <p className="text-xs text-muted-foreground mb-6">Distribución actual de carga de trabajo</p>
                    
                    <div className="relative flex-1 min-h-[240px]">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie 
                                    data={stats.projectsByStatus} 
                                    cx="50%" 
                                    cy="50%" 
                                    innerRadius={60} 
                                    outerRadius={80} 
                                    paddingAngle={5} 
                                    dataKey="value"
                                    cornerRadius={4}
                                >
                                    {stats.projectsByStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={projectStatusColors[index % projectStatusColors.length]} stroke="transparent" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value, name) => [value, name]}
                                    contentStyle={{
                                        background: 'hsl(var(--card))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                    }}
                                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Centered Total */}
                        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                            <span className="text-3xl font-bold">{stats.activeProjectsCount}</span>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Activos</span>
                        </div>
                    </div>

                    <div className="space-y-3 mt-6">
                        {stats.projectsByStatus.map((item, i) => (
                            <div key={item.name} className="flex items-center justify-between text-sm group cursor-default">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full ring-2 ring-white" style={{ background: projectStatusColors[i % projectStatusColors.length] }} />
                                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">{item.name}</span>
                                </div>
                                <span className="font-semibold text-foreground bg-secondary/50 px-2 py-0.5 rounded-md min-w-[2rem] text-center">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Bottom Row: Transactions & Lists */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Recent transactions */}
                <Card className="p-6 xl:col-span-2 min-h-[460px] flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Transacciones Recientes</h2>
                            <p className="text-xs text-muted-foreground">Movimientos financieros del CRM</p>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                            <a href="/contabilidad" className="text-xs flex items-center gap-1">
                            Ver todas <ArrowUpRight className="w-3 h-3" />
                            </a>
                        </Button>
                    </div>
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-sm">
                            <thead className="bg-secondary/30 rounded-lg">
                                <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    <th className="py-3 px-4 rounded-l-lg">Descripción</th>
                                    <th className="py-3 px-4">Categoría</th>
                                    <th className="py-3 px-4">Fecha</th>
                                    <th className="py-3 px-4 text-right rounded-r-lg">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {stats.recentTransactions.map((t) => (
                                    <tr key={t.id} className="group hover:bg-secondary/20 transition-colors">
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn('w-2 h-2 rounded-full', t.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500')} />
                                                <span className="font-medium text-foreground">{t.description}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4"><Badge variant="secondary">{t.category}</Badge></td>
                                        <td className="py-4 px-4 text-muted-foreground">{formatDate(t.date)}</td>
                                        <td className="py-4 px-4 text-right font-bold">
                                            <span className={t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}>
                                                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Notifications Panel */}
                <Card className="p-6 min-h-[460px]">
                     <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-foreground">Alertas & Notificaciones</h2>
                        <Badge variant="default">{stats.recentNotifications.length} nuevas</Badge>
                    </div>
                    
                    <div className="space-y-4 relative">
                        {/* Timeline line */}
                        <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-border/50" />
                        
                        {stats.recentNotifications.slice(0, 5).map((n) => (
                            <div key={n.id} className="relative pl-8 group">
                                <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full border-4 border-card bg-primary z-10" />
                                <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 group-hover:border-primary/20 group-hover:bg-secondary/50 transition-all">
                                    <p className="text-sm font-medium text-foreground">{n.message}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">{formatDate(n.createdAt)}</p>
                                </div>
                            </div>
                        ))}
                        {stats.recentNotifications.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-8">¡Todo al día! No hay nuevas alertas.</p>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    )
}
