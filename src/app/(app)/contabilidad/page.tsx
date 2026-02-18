'use client'

import { useState } from 'react'
import { Plus, Filter, Download, TrendingUp, TrendingDown, DollarSign, FileText } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { mockTransactions, type Transaction } from '@/lib/mock-data'

const categories = ['Todos', 'Servicios de Branding', 'Consultoría', 'Diseño Web', 'Software & Herramientas', 'Nómina', 'Marketing', 'Oficina']

export default function ContabilidadPage() {
    const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')
    const [showForm, setShowForm] = useState(false)

    const filtered = mockTransactions.filter((t) => filter === 'all' || t.type === filter)
    const totalIncome = mockTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const totalExpense = mockTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const balance = totalIncome - totalExpense

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Contabilidad</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Gestión de ingresos, gastos y facturas</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary"><Download className="w-4 h-4" /> Exportar</button>
                    <button className="btn-primary" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Nueva Transacción</button>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="kpi-card border border-emerald-500/20">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-[hsl(var(--success-text))]" />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">Total Ingresos</span>
                    </div>
                    <p className="text-2xl font-bold text-[hsl(var(--success-text))]">{formatCurrency(totalIncome)}</p>
                </div>
                <div className="kpi-card border border-red-500/20">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <TrendingDown className="w-4 h-4 text-[hsl(var(--danger-text))]" />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">Total Gastos</span>
                    </div>
                    <p className="text-2xl font-bold text-[hsl(var(--danger-text))]">{formatCurrency(totalExpense)}</p>
                </div>
                <div className="kpi-card border border-electric-500/20">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-electric-500/10 flex items-center justify-center">
                            <DollarSign className="w-4 h-4 text-[hsl(var(--info-text))]" />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">Balance Neto</span>
                    </div>
                    <p className={cn('text-2xl font-bold', balance >= 0 ? 'text-[hsl(var(--info-text))]' : 'text-[hsl(var(--danger-text))]')}>{formatCurrency(balance)}</p>
                </div>
            </div>

            {/* Transactions table */}
            <div className="glass-card p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <h2 className="section-title">Transacciones</h2>
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                        {(['all', 'income', 'expense'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn('text-[10px] sm:text-xs px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap', filter === f ? 'bg-primary/10 border-primary/30 text-primary font-bold' : 'border-border text-muted-foreground hover:text-foreground')}
                            >
                                {f === 'all' ? 'Todos' : f === 'income' ? 'Ingresos' : 'Gastos'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Descripción</th>
                                <th>Categoría</th>
                                <th>Fecha</th>
                                <th>Estado</th>
                                <th className="text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((t) => (
                                <tr key={t.id}>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <div className={cn('w-2 h-2 rounded-full', t.type === 'income' ? 'bg-[hsl(var(--success-text))]' : 'bg-[hsl(var(--danger-text))]')} />
                                            <span className="font-medium text-foreground whitespace-nowrap">{t.description}</span>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap"><span className="badge badge-neutral">{t.category}</span></td>
                                    <td className="text-muted-foreground whitespace-nowrap">{formatDate(t.date)}</td>
                                    <td className="whitespace-nowrap">
                                        <span className={cn('badge', t.status === 'confirmed' ? 'badge-success' : t.status === 'pending' ? 'badge-warning' : 'badge-danger')}>
                                            {t.status === 'confirmed' ? 'Confirmado' : t.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                                        </span>
                                    </td>
                                    <td className={cn('text-right font-bold whitespace-nowrap', t.type === 'income' ? 'text-[hsl(var(--success-text))]' : 'text-[hsl(var(--danger-text))]')}>
                                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* New Transaction Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowForm(false)}>
                    <div className="glass-card p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-4">Nueva Transacción</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="form-label">Tipo</label>
                                <div className="flex gap-2">
                                    <button className="flex-1 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-sm font-medium">Ingreso</button>
                                    <button className="flex-1 py-2 rounded-lg border border-border text-muted-foreground text-sm font-medium hover:border-red-500/40 hover:text-red-400 transition-all">Gasto</button>
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Monto</label>
                                <input type="number" placeholder="0.00" className="form-input" />
                            </div>
                            <div>
                                <label className="form-label">Categoría</label>
                                <select className="form-input">
                                    {categories.slice(1).map((c) => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Descripción</label>
                                <input type="text" placeholder="Descripción de la transacción" className="form-input" />
                            </div>
                            <div>
                                <label className="form-label">Fecha</label>
                                <input type="date" className="form-input" />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button className="flex-1 btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                                <button className="flex-1 btn-primary justify-center">Guardar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
