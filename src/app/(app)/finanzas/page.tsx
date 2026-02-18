'use client'

import { useState } from 'react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Target, CreditCard, Users, Briefcase } from 'lucide-react'
import { formatCurrency, cn, formatDate } from '@/lib/utils'
import { monthlyRevenue, mockFixedCosts, mockPayroll } from '@/lib/mock-data'

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
    const [activeSection, setActiveSection] = useState<'resumen' | 'costos' | 'planilla'>('resumen')

    const totalRevenue = 22700
    const totalExpenses = 16590
    const netProfit = totalRevenue - totalExpenses
    const margin = ((netProfit / totalRevenue) * 100).toFixed(1)

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Finanzas</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Gestión financiera, costos fijos y planilla</p>
                </div>
                <div className="flex gap-2">
                    <button
                        className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-all", activeSection === 'resumen' ? "bg-primary text-primary-foreground" : "bg-card hover:bg-secondary text-muted-foreground")}
                        onClick={() => setActiveSection('resumen')}
                    >
                        Resumen
                    </button>
                    <button
                        className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-all", activeSection === 'costos' ? "bg-primary text-primary-foreground" : "bg-card hover:bg-secondary text-muted-foreground")}
                        onClick={() => setActiveSection('costos')}
                    >
                        Costos Fijos
                    </button>
                    <button
                        className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-all", activeSection === 'planilla' ? "bg-primary text-primary-foreground" : "bg-card hover:bg-secondary text-muted-foreground")}
                        onClick={() => setActiveSection('planilla')}
                    >
                        Planilla
                    </button>
                    <button className="btn-primary ml-2"><Target className="w-4 h-4" /> Nuevo Presupuesto</button>
                </div>
            </div>

            {activeSection === 'resumen' && (
                <>
                    {/* KPIs */}
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                        {[
                            { label: 'Ingresos', value: formatCurrency(totalRevenue), icon: TrendingUp, color: 'text-[hsl(var(--success-text))]', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                            { label: 'Gastos', value: formatCurrency(totalExpenses), icon: TrendingDown, color: 'text-[hsl(var(--danger-text))]', bg: 'bg-red-500/10', border: 'border-red-500/20' },
                            { label: 'Utilidad Neta', value: formatCurrency(netProfit), icon: DollarSign, color: 'text-[hsl(var(--info-text))]', bg: 'bg-electric-500/10', border: 'border-electric-500/20' },
                            { label: 'Margen', value: `${margin}%`, icon: Target, color: 'text-[hsl(var(--warning-text))]', bg: 'bg-gold-500/10', border: 'border-gold-500/20' },
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
                        {/* Budget vs Real */}
                        <div className="glass-card p-5">
                            <h2 className="section-title mb-4">Presupuesto vs Real — Feb 2026</h2>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={budgetData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                    <YAxis type="category" dataKey="area" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={70} />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'hsl(var(--chart-tooltip))',
                                            border: '1px solid hsl(var(--chart-tooltip-border))',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            color: 'hsl(var(--foreground))'
                                        }}
                                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                                        formatter={(v: any) => formatCurrency(Number(v || 0))}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                    <Bar dataKey="presupuesto" name="Presupuesto" fill="#94A3B8" radius={[0, 4, 4, 0]} />
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
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" vertical={false} />
                                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'hsl(var(--chart-tooltip))',
                                            border: '1px solid hsl(var(--chart-tooltip-border))',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            color: 'hsl(var(--foreground))'
                                        }}
                                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                                        formatter={(v: any) => formatCurrency(Number(v || 0))}
                                    />
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
                                        <span className="text-[hsl(var(--success-text))] font-semibold">{formatCurrency(item.value)}</span>
                                    </div>
                                ))}
                                <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
                                    <span>Total Ingresos</span>
                                    <span className="text-[hsl(var(--success-text))]">{formatCurrency(22700)}</span>
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
                                        <span className="text-[hsl(var(--danger-text))] font-semibold">{formatCurrency(item.value)}</span>
                                    </div>
                                ))}
                                <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
                                    <span>Total Gastos</span>
                                    <span className="text-[hsl(var(--danger-text))]">{formatCurrency(16590)}</span>
                                </div>
                            </div>
                            <div className="flex flex-col justify-center items-center glass-card p-6 border-2 border-primary/20 bg-primary/5">
                                <p className="text-xs text-muted-foreground font-medium mb-1">Utilidad Neta</p>
                                <p className="text-4xl font-bold text-[hsl(var(--info-text))]">{formatCurrency(netProfit)}</p>
                                <p className="text-sm text-muted-foreground mt-3">Margen: <span className="text-[hsl(var(--warning-text))] font-bold">{margin}%</span></p>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeSection === 'costos' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="section-title">Costos Fijos Mensuales</h2>
                        <button className="btn-secondary text-xs">+ Agregar Gasto</button>
                    </div>
                    <div className="glass-card overflow-hidden">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Concepto</th>
                                    <th>Categoría</th>
                                    <th>Monto</th>
                                    <th>Vencimiento</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mockFixedCosts.map((cost) => (
                                    <tr key={cost.id}>
                                        <td className="font-medium">{cost.name}</td>
                                        <td>
                                            <span className="badge badge-neutral capitalize">{cost.category}</span>
                                        </td>
                                        <td className="text-foreground font-semibold">{formatCurrency(cost.amount)}</td>
                                        <td className="text-muted-foreground">{formatDate(cost.dueDate)}</td>
                                        <td className="text-right">
                                            <button className="btn-ghost p-1.5"><Briefcase className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end p-4 glass-card bg-primary/5 border-primary/10">
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">Total Costos Fijos</p>
                            <p className="text-2xl font-bold text-primary">{formatCurrency(mockFixedCosts.reduce((a, b) => a + b.amount, 0))}</p>
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'planilla' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="section-title">Nómina / Planilla — Febrero 2026</h2>
                        <button className="btn-secondary text-xs">+ Agregar Miembro</button>
                    </div>
                    <div className="glass-card overflow-hidden">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Colaborador</th>
                                    <th>Sueldo Base</th>
                                    <th>Bonos</th>
                                    <th>Total</th>
                                    <th>Estado</th>
                                    <th>Fecha Pago</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mockPayroll.map((p) => (
                                    <tr key={p.id}>
                                        <td className="font-medium">{p.userName}</td>
                                        <td>{formatCurrency(p.salary)}</td>
                                        <td className="text-emerald-400">+{formatCurrency(p.bonus)}</td>
                                        <td className="font-bold">{formatCurrency(p.salary + p.bonus)}</td>
                                        <td>
                                            <span className={cn('badge', p.status === 'paid' ? 'badge-success' : 'badge-warning')}>
                                                {p.status === 'paid' ? 'Pagado' : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td className="text-muted-foreground text-xs">{formatDate(p.paymentDate)}</td>
                                        <td className="text-right">
                                            <button className="btn-ghost p-1.5"><CreditCard className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end p-4 glass-card bg-emerald-500/5 border-emerald-500/10">
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground font-medium">Total Planilla</p>
                            <p className="text-2xl font-bold text-[hsl(var(--success-text))]">{formatCurrency(mockPayroll.reduce((a, b) => a + b.salary + b.bonus, 0))}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
