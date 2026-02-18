'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Plus, TrendingUp, Eye, MousePointerClick, Target } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { mockCampaigns, mockLeads } from '@/lib/mock-data'

const COLORS = ['#0EA5E9', '#F5C842', '#8B5CF6', '#10B981', '#F97316']

const channelData = [
    { channel: 'LinkedIn', leads: 8 },
    { channel: 'Instagram', leads: 15 },
    { channel: 'Referidos', leads: 12 },
    { channel: 'Web', leads: 6 },
    { channel: 'Email', leads: 4 },
]

const statusBadge: Record<string, string> = {
    draft: 'badge-neutral',
    active: 'badge-success',
    paused: 'badge-warning',
    completed: 'badge-info',
}

const statusLabel: Record<string, string> = {
    draft: 'Borrador',
    active: 'Activa',
    paused: 'Pausada',
    completed: 'Completada',
}

export default function MarketingPage() {
    const totalReach = mockCampaigns.reduce((s, c) => s + c.reach, 0)
    const totalClicks = mockCampaigns.reduce((s, c) => s + c.clicks, 0)
    const totalConversions = mockCampaigns.reduce((s, c) => s + c.conversions, 0)
    const totalSpent = mockCampaigns.reduce((s, c) => s + c.spent, 0)

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Marketing</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Campañas, métricas y fuentes de leads</p>
                </div>
                <button className="btn-primary"><Plus className="w-4 h-4" /> Nueva Campaña</button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                    { label: 'Alcance Total', value: totalReach.toLocaleString(), icon: Eye, color: 'text-[hsl(var(--info-text))]', bg: 'bg-electric-500/10', border: 'border-electric-500/20' },
                    { label: 'Clicks', value: totalClicks.toLocaleString(), icon: MousePointerClick, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                    { label: 'Conversiones', value: totalConversions.toString(), icon: Target, color: 'text-[hsl(var(--success-text))]', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                    { label: 'Inversión Total', value: formatCurrency(totalSpent), icon: TrendingUp, color: 'text-[hsl(var(--warning-text))]', bg: 'bg-gold-500/10', border: 'border-gold-500/20' },
                ].map((k) => {
                    const Icon = k.icon
                    return (
                        <div key={k.label} className={cn('kpi-card border', k.border)}>
                            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3', k.bg)}>
                                <Icon className={cn('w-4 h-4', k.color)} />
                            </div>
                            <p className={cn('text-2xl font-bold', k.color)}>{k.value}</p>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">{k.label}</p>
                        </div>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Campaigns */}
                <div className="xl:col-span-2 space-y-3">
                    <h2 className="section-title">Campañas Activas</h2>
                    {mockCampaigns.map((c) => {
                        const roi = ((c.conversions * 1200 - c.spent) / c.spent * 100).toFixed(0)
                        const pct = Math.round((c.spent / c.budget) * 100)
                        return (
                            <div key={c.id} className="glass-card p-4 hover:border-primary/30 transition-all">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">{c.name}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{c.channel}</p>
                                    </div>
                                    <span className={cn('badge', statusBadge[c.status])}>{statusLabel[c.status]}</span>
                                </div>
                                <div className="grid grid-cols-4 gap-3 mb-3">
                                    {[
                                        { label: 'Alcance', value: c.reach.toLocaleString() },
                                        { label: 'Clicks', value: c.clicks.toLocaleString() },
                                        { label: 'Conversiones', value: c.conversions.toString() },
                                        { label: 'ROI', value: `${roi}%` },
                                    ].map((m) => (
                                        <div key={m.label} className="text-center">
                                            <p className="text-sm font-bold text-foreground">{m.value}</p>
                                            <p className="text-[10px] text-muted-foreground">{m.label}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Presupuesto: {formatCurrency(c.spent)} / {formatCurrency(c.budget)}</span>
                                        <span>{pct}%</span>
                                    </div>
                                    <div className="w-full bg-secondary rounded-full h-1.5">
                                        <div className={cn('h-1.5 rounded-full', pct > 90 ? 'bg-[hsl(var(--danger-text))]' : pct > 70 ? 'bg-[hsl(var(--warning-text))]' : 'bg-[hsl(var(--info-text))]')} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Lead sources */}
                <div className="space-y-4">
                    <div className="glass-card p-5">
                        <h2 className="section-title mb-4">Fuentes de Leads</h2>
                        <ResponsiveContainer width="100%" height={180}>
                            <PieChart>
                                <Pie data={channelData} cx="50%" cy="50%" outerRadius={70} dataKey="leads" nameKey="channel">
                                    {channelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: 'hsl(var(--chart-tooltip))',
                                        border: '1px solid hsl(var(--chart-tooltip-border))',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        color: 'hsl(var(--foreground))'
                                    }}
                                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2 mt-2">
                            {channelData.map((d, i) => (
                                <div key={d.channel} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                                        <span className="text-muted-foreground">{d.channel}</span>
                                    </div>
                                    <span className="font-medium text-foreground">{d.leads} leads</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card p-5">
                        <h2 className="section-title mb-3 text-base">Leads por Canal</h2>
                        <ResponsiveContainer width="100%" height={140}>
                            <BarChart data={channelData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" vertical={false} />
                                <XAxis dataKey="channel" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{
                                        background: 'hsl(var(--chart-tooltip))',
                                        border: '1px solid hsl(var(--chart-tooltip-border))',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        color: 'hsl(var(--foreground))'
                                    }}
                                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                                />
                                <Bar dataKey="leads" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    )
}
