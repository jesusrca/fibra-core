'use client'

import { useState } from 'react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Target, CreditCard, Users, Briefcase, Trash2 } from 'lucide-react'
import { formatCurrency, cn, formatDate } from '@/lib/utils'
import { createFixedCost, deleteFixedCost, createPayroll, updatePayrollStatus } from '@/lib/actions/finance'
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

interface FinanzasClientProps {
    fixedCosts: any[]
    payroll: any[]
    users: any[]
}

export function FinanzasClient({ fixedCosts, payroll, users }: FinanzasClientProps) {
    const [activeSection, setActiveSection] = useState<'resumen' | 'costos' | 'planilla'>('resumen')
    const [showCostForm, setShowCostForm] = useState(false)
    const [showPayrollForm, setShowPayrollForm] = useState(false)
    const [loading, setLoading] = useState(false)

    // These should ideally come from backend aggregation
    const totalRevenue = 22700
    const totalExpenses = 16590
    const netProfit = totalRevenue - totalExpenses
    const margin = ((netProfit / totalRevenue) * 100).toFixed(1)

    const handleCreateCost = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        await createFixedCost({
            name: formData.get('name') as string,
            category: formData.get('category') as string,
            amount: parseFloat(formData.get('amount') as string),
            dueDate: new Date(formData.get('dueDate') as string),
        })

        setLoading(false)
        setShowCostForm(false)
    }

    const handleDeleteCost = async (id: string) => {
        if (confirm('¿Eliminar este costo fijo?')) {
            await deleteFixedCost(id)
        }
    }

    const handleCreatePayroll = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        await createPayroll({
            userId: formData.get('userId') as string,
            salary: parseFloat(formData.get('salary') as string),
            bonus: parseFloat(formData.get('bonus') as string || '0'),
            paymentDate: new Date(formData.get('paymentDate') as string),
        })

        setLoading(false)
        setShowPayrollForm(false)
    }

    const togglePayrollStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'PAID' ? 'PENDING' : 'PAID'
        await updatePayrollStatus(id, newStatus)
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold text-foreground font-display">Finanzas</h1>
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
                            <h2 className="section-title mb-4">Presupuesto vs Real — Actual</h2>
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
                </>
            )}

            {activeSection === 'costos' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="section-title">Costos Fijos Mensuales</h2>
                        <button className="btn-secondary text-xs" onClick={() => setShowCostForm(true)}>+ Agregar Gasto</button>
                    </div>
                    <div className="glass-card table-container">
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
                                {fixedCosts.map((cost) => (
                                    <tr key={cost.id} className="group">
                                        <td className="font-medium whitespace-nowrap">{cost.name}</td>
                                        <td>
                                            <span className="badge badge-neutral capitalize">{cost.category}</span>
                                        </td>
                                        <td className="text-foreground font-semibold whitespace-nowrap">{formatCurrency(cost.amount)}</td>
                                        <td className="text-muted-foreground whitespace-nowrap">{formatDate(cost.dueDate)}</td>
                                        <td className="text-right">
                                            <button
                                                className="btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleDeleteCost(cost.id)}
                                            >
                                                <Trash2 className="w-4 h-4 text-destructive" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end p-4 glass-card bg-primary/5 border-primary/10">
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">Total Costos Fijos</p>
                            <p className="text-2xl font-bold text-primary">{formatCurrency(fixedCosts.reduce((a, b) => a + b.amount, 0))}</p>
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'planilla' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="section-title">Nómina / Planilla</h2>
                        <button className="btn-secondary text-xs" onClick={() => setShowPayrollForm(true)}>+ Agregar Registro</button>
                    </div>
                    <div className="glass-card table-container">
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
                                {payroll.map((p) => (
                                    <tr key={p.id}>
                                        <td className="font-medium whitespace-nowrap">{p.user?.name || 'Usuario'}</td>
                                        <td className="whitespace-nowrap">{formatCurrency(p.salary)}</td>
                                        <td className="text-[hsl(var(--success-text))] whitespace-nowrap">+{formatCurrency(p.bonus)}</td>
                                        <td className="font-bold whitespace-nowrap">{formatCurrency(p.salary + p.bonus)}</td>
                                        <td>
                                            <button
                                                onClick={() => togglePayrollStatus(p.id, p.status)}
                                                className={cn('badge cursor-pointer hover:opacity-80', p.status === 'PAID' ? 'badge-success' : 'badge-warning')}
                                            >
                                                {p.status === 'PAID' ? 'Pagado' : 'Pendiente'}
                                            </button>
                                        </td>
                                        <td className="text-muted-foreground text-xs whitespace-nowrap">{formatDate(p.paymentDate)}</td>
                                        <td className="text-right">
                                            {/* Actions */}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end p-4 glass-card bg-emerald-500/5 border-emerald-500/10">
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground font-medium">Total Planilla</p>
                            <p className="text-2xl font-bold text-[hsl(var(--success-text))]">
                                {formatCurrency(payroll.reduce((a, b) => a + b.salary + b.bonus, 0))}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {showCostForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowCostForm(false)}>
                    <div className="glass-card p-6 w-full max-w-md mx-4 relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-foreground">Nuevo Gasto Fijo</h2>
                            <button onClick={() => setShowCostForm(false)} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
                        </div>

                        <form className="space-y-4" onSubmit={handleCreateCost}>
                            <div>
                                <label className="form-label">Concepto</label>
                                <input name="name" type="text" className="form-input" placeholder="Ej: Alquiler Oficina" required />
                            </div>
                            <div>
                                <label className="form-label">Categoría</label>
                                <select name="category" className="form-input">
                                    <option>Oficina / Local</option>
                                    <option>Software / SaaS</option>
                                    <option>Servicios Públicos</option>
                                    <option>Marketing</option>
                                    <option>Otros</option>
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Monto Mensual</label>
                                <input name="amount" type="number" step="0.01" className="form-input" placeholder="0.00" required />
                            </div>
                            <div>
                                <label className="form-label">Día de Vencimiento</label>
                                <input name="dueDate" type="date" className="form-input" required defaultValue={new Date().toISOString().split('T')[0]} />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" className="flex-1 btn-secondary" onClick={() => setShowCostForm(false)}>Cancelar</button>
                                <button type="submit" className="flex-1 btn-primary justify-center" disabled={loading}>Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showPayrollForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowPayrollForm(false)}>
                    <div className="glass-card p-6 w-full max-w-md mx-4 relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-foreground">Nuevo Registro de Nómina</h2>
                            <button onClick={() => setShowPayrollForm(false)} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
                        </div>

                        <form className="space-y-4" onSubmit={handleCreatePayroll}>
                            <div>
                                <label className="form-label">Colaborador</label>
                                <select name="userId" className="form-input" required>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Sueldo Base</label>
                                    <input name="salary" type="number" step="0.01" className="form-input" placeholder="0.00" required />
                                </div>
                                <div>
                                    <label className="form-label">Bonos / Extras</label>
                                    <input name="bonus" type="number" step="0.01" className="form-input" placeholder="0.00" />
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Fecha de Pago</label>
                                <input name="paymentDate" type="date" className="form-input" required defaultValue={new Date().toISOString().split('T')[0]} />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" className="flex-1 btn-secondary" onClick={() => setShowPayrollForm(false)}>Cancelar</button>
                                <button type="submit" className="flex-1 btn-primary justify-center" disabled={loading}>Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
