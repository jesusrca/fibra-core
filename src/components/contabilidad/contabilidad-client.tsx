'use client'

import { useState } from 'react'
import { Plus, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { createTransaction, deleteTransaction } from '@/lib/actions/accounting'
import { InvoiceStatus, TransactionCategory } from '@prisma/client'

const categories = ['Todos', 'Servicios de Branding', 'Consultoría', 'Diseño Web', 'Software & Herramientas', 'Nómina', 'Marketing', 'Oficina']

interface ContabilidadClientProps {
    initialTransactions: Array<{
        id: string
        category: TransactionCategory
        subcategory: string | null
        amount: number
        description: string | null
        date: Date | string
        currency: string
        bank: string | null
        receiptUrl: string | null
        invoice: { id: string; invoiceNumber: string } | null
    }>
    pendingInvoices: Array<{
        id: string
        invoiceNumber: string
        amount: number
        issueDate: Date | null
        dueDate: Date | null
        status: InvoiceStatus
        paymentMethod: string | null
        paymentCountry: string | null
        quote: { id: string; lead: { companyName: string | null } } | null
        client: { name: string } | null
        project: { name: string } | null
    }>
    invoices: Array<{
        id: string
        invoiceNumber: string
        amount: number
        client: { name: string } | null
        project: { name: string } | null
    }>
    fixedCosts: Array<{
        id: string
        name: string
        category: string
        amount: number
        dueDate: Date | string
    }>
    pendingPayroll: Array<{
        id: string
        salary: number
        bonus: number
        status: string
        paymentDate: Date | string
        user: { id: string; name: string; role: string } | null
    }>
    pendingSupplierPayments: Array<{
        id: string
        amount: number
        status: string
        issueDate: Date | string | null
        paymentDate: Date | string | null
        receiptUrl: string | null
        description: string | null
        supplierWork: {
            id: string
            supplierName: string
            serviceProvided: string
            project: { id: string; name: string } | null
            supplier: { id: string; name: string } | null
        }
    }>
    banks: Array<{
        id: string
        name: string
        code: string | null
    }>
}

export function ContabilidadClient({
    initialTransactions,
    pendingInvoices,
    invoices,
    fixedCosts,
    pendingPayroll,
    pendingSupplierPayments,
    banks
}: ContabilidadClientProps) {
    const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')
    const [debtView, setDebtView] = useState<'receivables' | 'payables'>('receivables')
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
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const next7Days = new Date(today)
    next7Days.setDate(next7Days.getDate() + 7)

    const receivablesTotal = pendingInvoices.reduce((sum, invoice) => sum + invoice.amount, 0)
    const overdueInvoices = pendingInvoices.filter((invoice) => {
        if (!invoice.dueDate) return invoice.status === InvoiceStatus.OVERDUE
        const due = new Date(invoice.dueDate)
        due.setHours(0, 0, 0, 0)
        return invoice.status === InvoiceStatus.OVERDUE || due < today
    })
    const dueSoonInvoices = pendingInvoices.filter((invoice) => {
        if (!invoice.dueDate) return false
        const due = new Date(invoice.dueDate)
        due.setHours(0, 0, 0, 0)
        return due >= today && due <= next7Days
    })
    const costsPayableTotal = fixedCosts.reduce((sum, cost) => sum + cost.amount, 0)
    const payrollPayableTotal = pendingPayroll.reduce((sum, row) => sum + row.salary + row.bonus, 0)
    const supplierPayableTotal = pendingSupplierPayments.reduce((sum, row) => sum + row.amount, 0)
    const payablesTotal = costsPayableTotal + payrollPayableTotal + supplierPayableTotal
    const overduePayablesCount =
        fixedCosts.filter((cost) => new Date(cost.dueDate) < today).length +
        pendingPayroll.filter((row) => new Date(row.paymentDate) < today).length +
        pendingSupplierPayments.filter((row) => {
            const date = row.paymentDate || row.issueDate
            if (!date) return false
            return new Date(date) < today
        }).length

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
            currency: (formData.get('currency') as string) || 'PEN',
            bank: ((formData.get('bank') as string) || '').trim() || undefined,
            invoiceId: ((formData.get('invoiceId') as string) || '').trim() || undefined,
            receiptUrl: ((formData.get('receiptUrl') as string) || '').trim() || undefined,
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="kpi-card border border-amber-500/20">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold">
                            !
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">Total por cobrar</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-500">{formatCurrency(receivablesTotal)}</p>
                </div>
                <div className="kpi-card border border-red-500/20">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-[hsl(var(--danger-text))] font-bold">
                            !
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">Facturas vencidas</span>
                    </div>
                    <p className="text-2xl font-bold text-[hsl(var(--danger-text))]">{overdueInvoices.length}</p>
                </div>
                <div className="kpi-card border border-blue-500/20">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold">
                            $
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">Total por pagar</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-500">{formatCurrency(payablesTotal)}</p>
                </div>
            </div>

            <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <h2 className="section-title">Deudas y Cobranzas</h2>
                        <span className="badge badge-neutral">
                            {debtView === 'receivables' ? `${pendingInvoices.length} por cobrar` : `${fixedCosts.length + pendingPayroll.length + pendingSupplierPayments.length} por pagar`}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            className={cn(
                                'text-xs px-3 py-1.5 rounded-lg border transition-all',
                                debtView === 'receivables'
                                    ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                                    : 'border-border text-muted-foreground hover:text-foreground'
                            )}
                            onClick={() => setDebtView('receivables')}
                        >
                            Por cobrar
                        </button>
                        <button
                            className={cn(
                                'text-xs px-3 py-1.5 rounded-lg border transition-all',
                                debtView === 'payables'
                                    ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                                    : 'border-border text-muted-foreground hover:text-foreground'
                            )}
                            onClick={() => setDebtView('payables')}
                        >
                            Por pagar
                        </button>
                    </div>
                </div>
                {debtView === 'receivables' ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total por cobrar</p>
                                <p className="text-lg font-bold text-amber-500">{formatCurrency(receivablesTotal)}</p>
                            </div>
                            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Vencidas</p>
                                <p className="text-lg font-bold text-[hsl(var(--danger-text))]">{overdueInvoices.length}</p>
                            </div>
                            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Vencen en 7 días</p>
                                <p className="text-lg font-bold text-blue-500">{dueSoonInvoices.length}</p>
                            </div>
                        </div>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Factura</th>
                                        <th>Cliente / Proyecto</th>
                                        <th>Cotización / Empresa Lead</th>
                                        <th>Emisión / Vencimiento</th>
                                        <th>Método / País</th>
                                        <th className="text-right">Monto</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingInvoices.map((invoice) => {
                                        const due = invoice.dueDate ? new Date(invoice.dueDate) : null
                                        const isOverdue = !!due && (invoice.status === InvoiceStatus.OVERDUE || due < today)
                                        const dueSoon = !!due && due >= today && due <= next7Days
                                        return (
                                            <tr key={invoice.id}>
                                                <td className="font-medium whitespace-nowrap">{invoice.invoiceNumber}</td>
                                                <td className="text-muted-foreground whitespace-nowrap">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs">{invoice.client?.name || 'Sin cliente'}</span>
                                                        <span className="text-[11px] text-muted-foreground">{invoice.project?.name || 'Sin proyecto'}</span>
                                                    </div>
                                                </td>
                                                <td className="text-muted-foreground whitespace-nowrap">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs">{invoice.quote?.id?.slice(0, 8) || 'Sin cotización'}</span>
                                                        <span className="text-[11px] text-muted-foreground">{invoice.quote?.lead.companyName || '-'}</span>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs text-muted-foreground">{invoice.issueDate ? formatDate(invoice.issueDate) : 'Sin emisión'}</span>
                                                        <span className={cn('text-xs', isOverdue ? 'text-[hsl(var(--danger-text))] font-semibold' : dueSoon ? 'text-amber-500 font-semibold' : 'text-muted-foreground')}>
                                                            {invoice.dueDate ? formatDate(invoice.dueDate) : 'Sin fecha'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="text-muted-foreground whitespace-nowrap">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs">{invoice.paymentMethod || 'Sin método'}</span>
                                                        <span className="text-[11px]">{invoice.paymentCountry || 'Sin país'}</span>
                                                    </div>
                                                </td>
                                                <td className="text-right font-bold whitespace-nowrap">{formatCurrency(invoice.amount)}</td>
                                                <td>
                                                    <span className={cn('badge', isOverdue ? 'badge-danger' : dueSoon ? 'badge-warning' : 'badge-info')}>
                                                        {isOverdue ? 'Vencida' : dueSoon ? 'Próxima' : invoice.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {pendingInvoices.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-center py-8 text-muted-foreground">No hay facturas por cobrar activas.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total por pagar</p>
                                <p className="text-lg font-bold text-blue-500">{formatCurrency(payablesTotal)}</p>
                            </div>
                            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Vencidas</p>
                                <p className="text-lg font-bold text-[hsl(var(--danger-text))]">{overduePayablesCount}</p>
                            </div>
                            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Registros</p>
                                <p className="text-lg font-bold text-foreground">{fixedCosts.length + pendingPayroll.length + pendingSupplierPayments.length}</p>
                            </div>
                        </div>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Tipo</th>
                                        <th>Entidad / Referencia</th>
                                        <th>Proyecto / Área</th>
                                        <th>Detalle</th>
                                        <th>Fecha objetivo</th>
                                        <th className="text-right">Monto</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingSupplierPayments.map((payment) => {
                                        const targetDate = payment.paymentDate || payment.issueDate
                                        const isOverdue = !!targetDate && new Date(targetDate) < today
                                        return (
                                            <tr key={`supplier-${payment.id}`}>
                                                <td><span className="badge badge-warning">Proveedor</span></td>
                                                <td className="whitespace-nowrap">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-medium">{payment.supplierWork.supplier?.name || payment.supplierWork.supplierName}</span>
                                                        <span className="text-[11px] text-muted-foreground">{payment.supplierWork.serviceProvided}</span>
                                                    </div>
                                                </td>
                                                <td className="text-muted-foreground whitespace-nowrap">{payment.supplierWork.project?.name || 'Sin proyecto'}</td>
                                                <td className="whitespace-nowrap">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs">{payment.description || 'Pago pendiente proveedor'}</span>
                                                        {payment.receiptUrl ? (
                                                            <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline">
                                                                Ver comprobante
                                                            </a>
                                                        ) : (
                                                            <span className="text-[11px] text-muted-foreground">Sin comprobante</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className={cn('whitespace-nowrap text-xs', isOverdue ? 'text-[hsl(var(--danger-text))] font-semibold' : 'text-muted-foreground')}>
                                                    {targetDate ? formatDate(targetDate) : 'Sin fecha'}
                                                </td>
                                                <td className="text-right font-bold whitespace-nowrap">{formatCurrency(payment.amount)}</td>
                                                <td><span className={cn('badge', isOverdue ? 'badge-danger' : 'badge-warning')}>{isOverdue ? 'Vencida' : payment.status}</span></td>
                                            </tr>
                                        )
                                    })}
                                    {pendingPayroll.map((row) => {
                                        const isOverdue = new Date(row.paymentDate) < today
                                        const total = row.salary + row.bonus
                                        return (
                                            <tr key={`payroll-${row.id}`}>
                                                <td><span className="badge badge-info">Planilla</span></td>
                                                <td className="whitespace-nowrap">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-medium">{row.user?.name || 'Sin usuario'}</span>
                                                        <span className="text-[11px] text-muted-foreground">{row.user?.role || '-'}</span>
                                                    </div>
                                                </td>
                                                <td className="text-muted-foreground whitespace-nowrap">Nómina</td>
                                                <td className="text-xs text-muted-foreground whitespace-nowrap">Sueldo {formatCurrency(row.salary)} + bono {formatCurrency(row.bonus)}</td>
                                                <td className={cn('whitespace-nowrap text-xs', isOverdue ? 'text-[hsl(var(--danger-text))] font-semibold' : 'text-muted-foreground')}>
                                                    {formatDate(row.paymentDate)}
                                                </td>
                                                <td className="text-right font-bold whitespace-nowrap">{formatCurrency(total)}</td>
                                                <td><span className={cn('badge', isOverdue ? 'badge-danger' : 'badge-warning')}>{isOverdue ? 'Vencida' : row.status}</span></td>
                                            </tr>
                                        )
                                    })}
                                    {fixedCosts.map((cost) => {
                                        const due = new Date(cost.dueDate)
                                        const isOverdue = due < today
                                        return (
                                            <tr key={`cost-${cost.id}`}>
                                                <td><span className="badge badge-neutral">Costo fijo</span></td>
                                                <td className="whitespace-nowrap">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-medium">{cost.name}</span>
                                                        <span className="text-[11px] text-muted-foreground">{cost.category}</span>
                                                    </div>
                                                </td>
                                                <td className="text-muted-foreground whitespace-nowrap">Gastos operativos</td>
                                                <td className="text-xs text-muted-foreground whitespace-nowrap">Compromiso recurrente mensual</td>
                                                <td className={cn('whitespace-nowrap text-xs', isOverdue ? 'text-[hsl(var(--danger-text))] font-semibold' : 'text-muted-foreground')}>
                                                    {formatDate(cost.dueDate)}
                                                </td>
                                                <td className="text-right font-bold whitespace-nowrap">{formatCurrency(cost.amount)}</td>
                                                <td><span className={cn('badge', isOverdue ? 'badge-danger' : 'badge-warning')}>{isOverdue ? 'Vencida' : 'PENDING'}</span></td>
                                            </tr>
                                        )
                                    })}
                                    {fixedCosts.length + pendingPayroll.length + pendingSupplierPayments.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-center py-8 text-muted-foreground">No hay deudas por pagar activas.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
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
                                <th>Banco / Moneda</th>
                                <th>Factura / Comprobante</th>
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
                                    <td className="text-muted-foreground whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-medium">{t.bank || 'Sin banco'}</span>
                                            <span className="badge badge-neutral w-fit">{t.currency || 'PEN'}</span>
                                        </div>
                                    </td>
                                    <td className="text-muted-foreground whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs">{t.invoice?.invoiceNumber || 'Sin factura'}</span>
                                            {t.receiptUrl ? (
                                                <a
                                                    href={t.receiptUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs text-primary hover:underline"
                                                >
                                                    Ver comprobante
                                                </a>
                                            ) : (
                                                <span className="text-xs">Sin comprobante</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="text-muted-foreground whitespace-nowrap">{formatDate(t.date)}</td>
                                    <td className={cn('text-right font-bold whitespace-nowrap', t.category === 'INCOME' ? 'text-[hsl(var(--success-text))]' : 'text-[hsl(var(--danger-text))]')}>
                                        {t.category === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount, t.currency || 'PEN')}
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
                                    <td colSpan={7} className="text-center py-8 text-muted-foreground">No hay transacciones registradas</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* New Transaction Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowForm(false)}>
                    <div className="modal-form-card p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Moneda</label>
                                    <select name="currency" className="form-input" defaultValue="PEN">
                                        <option value="PEN">PEN (S/)</option>
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Banco</label>
                                    <select name="bank" className="form-input" defaultValue="">
                                        <option value="">Sin banco</option>
                                        {banks.map((bank) => (
                                            <option key={bank.id} value={bank.name}>
                                                {bank.code ? `${bank.name} (${bank.code})` : bank.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Factura relacionada (opcional)</label>
                                <select name="invoiceId" className="form-input" defaultValue="">
                                    <option value="">Sin factura</option>
                                    {invoices.map((invoice) => (
                                        <option key={invoice.id} value={invoice.id}>
                                            {invoice.invoiceNumber} - {invoice.client?.name || 'Sin cliente'} - {formatCurrency(invoice.amount)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Comprobante (URL)</label>
                                <input name="receiptUrl" type="url" placeholder="https://..." className="form-input" />
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
