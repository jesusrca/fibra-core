'use client'

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { monthlyRevenue } from '@/lib/mock-data'

const budgetData = [
    { area: 'Nómina', presupuesto: 14000, real: 12000 },
    { area: 'Marketing', presupuesto: 4000, real: 3390 },
    { area: 'Oficina', presupuesto: 2500, real: 2200 },
    { area: 'Software', presupuesto: 1200, real: 890 },
    { area: 'Otros', presupuesto: 1000, real: 1110 },
]

const cashFlowData = [
    { mes: 'Sep', flujo: 10000 },
    { mes: 'Oct', flujo: 12500 },
    { mes: 'Nov', flujo: 11700 },
    { mes: 'Dic', flujo: 16000 },
    { mes: 'Ene', flujo: 14500 },
    { mes: 'Feb', flujo: 6110 },
]

export default function FinanzasPage() {
    const totalRevenue = 22700
    const totalExpenses = 16590
    const netProfit = totalRevenue - totalExpenses
    const margin = ((netProfit / totalRevenue) * 100).toFixed(1)

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Finanzas</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Presupuestos, flujo de caja y P&L</p>
                </div>
                <button className="btn-primary"><Target className="w-4 h-4" /> Nuevo Presupuesto</button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                    { label: 'Ingresos', value: formatCurrency(totalRevenue), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                    { label: 'Gastos', value: formatCurrency(totalExpenses), icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
                    { label: 'Utilidad Neta', value: formatCurrency(netProfit), icon: DollarSign, color: 'text-electric-400', bg: 'bg-electric-500/10', border: 'border-electric-500/20' },
                    { label: 'Margen', value: `${margin}%`, icon: Target, color: 'text-gold-400', bg: 'bg-gold-500/10', border: 'border-gold-500/20' },
                ].map((k) => {
                    const Icon = k.icon
                    return (
                        <div key={k.label} className={cn('kpi-card border', k.border)}>
                            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3', k.bg)}>
                                <Icon className={cn('w-4 h-4', k.color)} />
                            </div>
                            <p className={cn('text-2xl font-bold', k.color)}>{k.value}</p>
                            <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
                        </div>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Budget vs Real */}
                <div className="glass-card p-5">
                    <h2 className="section-title mb-4">Presupuesto vs Real — Feb 2026</h2>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={budgetData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 16%)" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                            <YAxis type="category" dataKey="area" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={70} />
                            <Tooltip contentStyle={{ background: 'hsl(220 25% 9%)', border: '1px solid hsl(220 20% 16%)', borderRadius: '8px', fontSize: '12px' }} formatter={(v: number) => formatCurrency(v)} />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <Bar dataKey="presupuesto" name="Presupuesto" fill="#0EA5E9" opacity={0.4} radius={[0, 4, 4, 0]} />
                            <Bar dataKey="real" name="Real" fill="#0EA5E9" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Cash flow */}
                <div className="glass-card p-5">
                    <h2 className="section-title mb-4">Flujo de Caja Neto</h2>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={cashFlowData}>
                            <defs>
                                <linearGradient id="colorFlujo" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 16%)" />
                            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                            <Tooltip contentStyle={{ background: 'hsl(220 25% 9%)', border: '1px solid hsl(220 20% 16%)', borderRadius: '8px', fontSize: '12px' }} formatter={(v: number) => formatCurrency(v)} />
                            <Area type="monotone" dataKey="flujo" name="Flujo Neto" stroke="#10B981" strokeWidth={2} fill="url(#colorFlujo)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* P&L Summary */}
            <div className="glass-card p-5">
                <h2 className="section-title mb-4">Estado de Resultados — Febrero 2026</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ingresos</h3>
                        {[
                            { label: 'Servicios de Branding', value: 15300 },
                            { label: 'Consultoría', value: 3200 },
                            { label: 'Diseño Web', value: 4200 },
                        ].map((item) => (
                            <div key={item.label} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{item.label}</span>
                                <span className="text-emerald-400 font-medium">{formatCurrency(item.value)}</span>
                            </div>
                        ))}
                        <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
                            <span>Total Ingresos</span>
                            <span className="text-emerald-400">{formatCurrency(22700)}</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gastos</h3>
                        {[
                            { label: 'Nómina', value: 12000 },
                            { label: 'Oficina', value: 2200 },
                            { label: 'Marketing', value: 1500 },
                            { label: 'Software', value: 890 },
                        ].map((item) => (
                            <div key={item.label} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{item.label}</span>
                                <span className="text-red-400 font-medium">{formatCurrency(item.value)}</span>
                            </div>
                        ))}
                        <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
                            <span>Total Gastos</span>
                            <span className="text-red-400">{formatCurrency(16590)}</span>
                        </div>
                    </div>
                    <div className="flex flex-col justify-center items-center glass-card p-6 border border-electric-500/20">
                        <p className="text-xs text-muted-foreground mb-2">Utilidad Neta</p>
                        <p className="text-4xl font-bold text-electric-400">{formatCurrency(netProfit)}</p>
                        <p className="text-sm text-muted-foreground mt-2">Margen: <span className="text-gold-400 font-semibold">{margin}%</span></p>
                    </div>
                </div>
            </div>
        </div>
    )
}
