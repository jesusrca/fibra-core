'use client'

import { useState } from 'react'
import { Plus, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { createTransaction, deleteTransaction } from '@/lib/actions/accounting'
import { TransactionCategory } from '@prisma/client'

const categories = ['Todos', 'Servicios de Branding', 'Consultoría', 'Diseño Web', 'Software & Herramientas', 'Nómina', 'Marketing', 'Oficina']

interface ContabilidadClientProps {
    initialTransactions: any[]
}

export function ContabilidadClient({ initialTransactions }: ContabilidadClientProps) {
    const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')
    const [showForm, setShowForm] = useState(false)
    const [transactionType, setTransactionType] = useState<TransactionCategory>('INCOME')
    const [loading, setLoading] = useState(false)

    // Filter logic
    const filtered = initialTransactions.filter((t) => {
        if (filter === 'all') return true
        if (filter === 'income') return t.category === 'INCOME'
        if (filter === 'expense') return t.category === 'EXPENSE'
        return true
    })

    const totalIncome = initialTransactions
        .filter((t) => t.category === 'INCOME')
        .reduce((s, t) => s + t.amount, 0)

    const totalExpense = initialTransactions
        .filter((t) => t.category === 'EXPENSE')
        .reduce((s, t) => s + t.amount, 0)

    const balance = totalIncome - totalExpense

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        await createTransaction({
            category: transactionType,
            amount: parseFloat(formData.get('amount') as string),
            subcategory: formData.get('subcategory') as string,
            description: formData.get('description') as string,
            date: new Date(formData.get('date') as string),
        })

        setLoading(false)
        setShowForm(false)
    }

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar esta transacción?')) {
            await deleteTransaction(id)
        }
    }

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
                                <th className="text-right">Monto</th>
                                <th className="text-right"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((t) => (
                                <tr key={t.id} className="group">
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <div className={cn('w-2 h-2 rounded-full', t.category === 'INCOME' ? 'bg-[hsl(var(--success-text))]' : 'bg-[hsl(var(--danger-text))]')} />
                                            <span className="font-medium text-foreground whitespace-nowrap">{t.description}</span>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap"><span className="badge badge-neutral">{t.subcategory || 'General'}</span></td>
                                    <td className="text-muted-foreground whitespace-nowrap">{formatDate(t.date)}</td>
                                    <td className={cn('text-right font-bold whitespace-nowrap', t.category === 'INCOME' ? 'text-[hsl(var(--success-text))]' : 'text-[hsl(var(--danger-text))]')}>
                                        {t.category === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
                                    </td>
                                    <td className="text-right w-10">
                                        <button
                                            onClick={() => handleDelete(t.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                                        >
                                            ✕
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-muted-foreground">No hay transacciones registradas</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* New Transaction Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowForm(false)}>
                    <div className="glass-card p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-4 text-foreground">Nueva Transacción</h3>
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div>
                                <label className="form-label">Tipo</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setTransactionType('INCOME')}
                                        className={cn(
                                            "flex-1 py-2 rounded-lg border text-sm font-medium transition-all",
                                            transactionType === 'INCOME'
                                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                                                : "border-border text-muted-foreground hover:border-emerald-500/40 hover:text-emerald-400"
                                        )}
                                    >
                                        Ingreso
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTransactionType('EXPENSE')}
                                        className={cn(
                                            "flex-1 py-2 rounded-lg border text-sm font-medium transition-all",
                                            transactionType === 'EXPENSE'
                                                ? "border-red-500/40 bg-red-500/10 text-red-400"
                                                : "border-border text-muted-foreground hover:border-red-500/40 hover:text-red-400"
                                        )}
                                    >
                                        Gasto
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Monto</label>
                                <input name="amount" type="number" step="0.01" placeholder="0.00" className="form-input" required />
                            </div>
                            <div>
                                <label className="form-label">Categoría</label>
                                <select name="subcategory" className="form-input">
                                    {categories.slice(1).map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Descripción</label>
                                <input name="description" type="text" placeholder="Descripción de la transacción" className="form-input" required />
                            </div>
                            <div>
                                <label className="form-label">Fecha</label>
                                <input name="date" type="date" className="form-input" required defaultValue={new Date().toISOString().split('T')[0]} />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" className="flex-1 btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                                <button type="submit" className="flex-1 btn-primary justify-center" disabled={loading}>
                                    {loading ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
