'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Eye, MousePointerClick, Target } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

const COLORS = ['#0EA5E9', '#F5C842', '#8B5CF6', '#10B981', '#F97316']

interface SourceData {
    channel: string
    leads: number
}

interface MarketingClientProps {
    channelData: SourceData[]
    totalReach: number
    totalClicks: number
    totalConversions: number
    totalSpent: number
}

export function MarketingClient({ channelData, totalReach, totalClicks, totalConversions, totalSpent }: MarketingClientProps) {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Marketing</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Métricas comerciales y fuentes de adquisición</p>
                </div>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                    { label: 'Alcance Estimado', value: totalReach.toLocaleString(), icon: Eye, color: 'text-[hsl(var(--info-text))]', bg: 'bg-electric-500/10', border: 'border-electric-500/20' },
                    { label: 'Clicks Estimados', value: totalClicks.toLocaleString(), icon: MousePointerClick, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                    { label: 'Leads Convertidos', value: totalConversions.toString(), icon: Target, color: 'text-[hsl(var(--success-text))]', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                    { label: 'Inversión Marketing', value: formatCurrency(totalSpent), icon: TrendingUp, color: 'text-[hsl(var(--warning-text))]', bg: 'bg-gold-500/10', border: 'border-gold-500/20' },
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

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="glass-card p-5">
                    <h2 className="section-title mb-4">Fuentes de Leads</h2>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={channelData} cx="50%" cy="50%" outerRadius={85} dataKey="leads" nameKey="channel">
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
                </div>

                <div className="glass-card p-5">
                    <h2 className="section-title mb-3 text-base">Leads por Canal</h2>
                    <ResponsiveContainer width="100%" height={220}>
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
    )
}
