'use client'

import { useMemo, useState } from 'react'
import { Loader2, Plus, RefreshCw } from 'lucide-react'
import { InvoiceStatus } from '@prisma/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { InvoiceForm } from '@/components/crm/invoice-form'
import { syncInvoicesFromMilestones, updateInvoiceStatus } from '@/lib/actions/crm'

interface ClientOption {
    id: string
    name: string
}

interface ProjectOption {
    id: string
    name: string
}

interface QuoteOption {
    id: string
    budget: number
    lead: { companyName: string | null }
}

interface InvoiceItem {
    id: string
    invoiceNumber: string
    fileUrl: string | null
    fileRef?: string | null
    quoteId: string | null
    clientId: string
    projectId: string | null
    amount: number
    status: InvoiceStatus
    issueDate: Date
    dueDate: Date | null
    paymentMethod: string | null
    paymentCountry: string | null
    client: { id: string; name: string } | null
    project: { id: string; name: string } | null
    quote: { id: string; lead: { companyName: string | null } } | null
}

interface FacturasClientProps {
    invoices: InvoiceItem[]
    clients: ClientOption[]
    projects: ProjectOption[]
    quotes: QuoteOption[]
    invoicesToIssueProjection: Array<{
        projectId: string
        projectName: string
        pendingToIssue: number
        installmentAmount: number
        totalAmount: number
    }>
}

export function FacturasClient({
    invoices,
    clients,
    projects,
    quotes,
    invoicesToIssueProjection
}: FacturasClientProps) {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'ALL' | InvoiceStatus>('ALL')
    const [rows, setRows] = useState(invoices)
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null)
    const [showInvoiceForm, setShowInvoiceForm] = useState(false)
    const [syncingInvoices, setSyncingInvoices] = useState(false)

    const openSignedFile = async (fileRef?: string | null, fallbackUrl?: string | null) => {
        const direct = (fallbackUrl || '').trim()
        if (direct) {
            window.open(direct, '_blank', 'noopener,noreferrer')
            return
        }
        const ref = (fileRef || '').trim()
        if (!ref) return
        try {
            const response = await fetch('/api/storage/sign', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    ref,
                    defaultBucket: 'invoice-files',
                    expiresIn: 60 * 30
                })
            })
            const result = await response.json().catch(() => null)
            if (!response.ok || !result?.url) {
                alert(result?.error || 'No se pudo abrir el archivo')
                return
            }
            window.open(result.url, '_blank', 'noopener,noreferrer')
        } catch {
            alert('No se pudo abrir el archivo')
        }
    }

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase()
        return rows.filter((row) => {
            if (statusFilter !== 'ALL' && row.status !== statusFilter) return false
            if (!term) return true
            return (
                row.invoiceNumber.toLowerCase().includes(term)
                || (row.client?.name || '').toLowerCase().includes(term)
                || (row.project?.name || '').toLowerCase().includes(term)
                || (row.quote?.lead.companyName || '').toLowerCase().includes(term)
            )
        })
    }, [rows, search, statusFilter])

    const totalAmount = filteredRows.reduce((acc, item) => acc + item.amount, 0)

    const handleInvoiceStatus = async (invoiceId: string, status: InvoiceStatus) => {
        setRows((prev) => prev.map((row) => (row.id === invoiceId ? { ...row, status } : row)))
        const result = await updateInvoiceStatus(invoiceId, status)
        if (!result.success) {
            alert(result.error || 'No se pudo actualizar el estado')
            setRows((prev) => prev.map((row) => (row.id === invoiceId ? { ...row, status: invoices.find((i) => i.id === invoiceId)?.status || row.status } : row)))
        }
    }

    const handleSyncInvoicesFromMilestones = async () => {
        if (syncingInvoices) return
        setSyncingInvoices(true)
        const result = await syncInvoicesFromMilestones()
        if (!result.success) {
            alert(result.error || 'No se pudo sincronizar facturas')
        } else {
            alert(`Sincronización completada. Facturas creadas: ${result.createdCount}`)
        }
        setSyncingInvoices(false)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Facturas</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Vista dedicada para crear, editar y gestionar estados</p>
                </div>
                <button
                    className="btn-primary h-10"
                    onClick={() => {
                        setSelectedInvoice(null)
                        setShowInvoiceForm(true)
                    }}
                >
                    <Plus className="w-4 h-4" />
                    Nueva Factura
                </button>
            </div>

            <div className="glass-card p-4 border border-primary/20 bg-primary/5">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Facturas por emitir (auto por hitos)</h3>
                        <p className="text-xs text-muted-foreground">Sincroniza hitos completados para emitir facturas pendientes.</p>
                    </div>
                    <button className="btn-primary h-9" onClick={handleSyncInvoicesFromMilestones} disabled={syncingInvoices}>
                        {syncingInvoices ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Sincronizar
                    </button>
                </div>
                {invoicesToIssueProjection.length > 0 ? (
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                        {invoicesToIssueProjection.map((row) => (
                            <div key={row.projectId} className="flex items-center justify-between border border-border/40 rounded-lg px-3 py-2 bg-background/60">
                                <div>
                                    <p className="text-sm font-medium">{row.projectName}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {row.pendingToIssue} pendiente(s) x {formatCurrency(row.installmentAmount)}
                                    </p>
                                </div>
                                <p className="text-sm font-semibold text-primary">{formatCurrency(row.totalAmount)}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground">No hay facturas pendientes por emitir según hitos completados.</p>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="glass-card p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Facturas visibles</p>
                    <p className="text-2xl font-bold mt-1">{filteredRows.length}</p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Monto total visible</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(totalAmount)}</p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Pendientes / vencidas</p>
                    <p className="text-2xl font-bold mt-1">
                        {filteredRows.filter((row) => row.status === InvoiceStatus.SENT || row.status === InvoiceStatus.OVERDUE).length}
                    </p>
                </div>
            </div>

            <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
                <input
                    className="form-input"
                    placeholder="Buscar por número, cliente, proyecto o empresa..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select className="form-input sm:w-56" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'ALL' | InvoiceStatus)}>
                    <option value="ALL">Todos los estados</option>
                    <option value={InvoiceStatus.DRAFT}>DRAFT</option>
                    <option value={InvoiceStatus.SENT}>SENT</option>
                    <option value={InvoiceStatus.PAID}>PAID</option>
                    <option value={InvoiceStatus.OVERDUE}>OVERDUE</option>
                    <option value={InvoiceStatus.CANCELLED}>CANCELLED</option>
                </select>
            </div>

            <div className="glass-card table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Número</th>
                            <th>Archivo</th>
                            <th>Cliente</th>
                            <th>Proyecto</th>
                            <th>Monto</th>
                            <th>Emisión</th>
                            <th>Vencimiento</th>
                            <th>Método</th>
                            <th>Estado</th>
                            <th className="text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRows.map((invoice) => (
                            <tr key={invoice.id}>
                                <td className="font-medium whitespace-nowrap">{invoice.invoiceNumber}</td>
                                <td className="text-xs whitespace-nowrap">
                                    {(invoice.fileUrl || invoice.fileRef) ? (
                                        <button
                                            type="button"
                                            className="text-primary hover:underline"
                                            onClick={() => openSignedFile(invoice.fileRef, invoice.fileUrl)}
                                        >
                                            Ver PDF
                                        </button>
                                    ) : '-'}
                                </td>
                                <td className="text-sm text-muted-foreground">{invoice.client?.name || '-'}</td>
                                <td className="text-sm text-muted-foreground">{invoice.project?.name || '-'}</td>
                                <td className="font-semibold whitespace-nowrap">{formatCurrency(invoice.amount)}</td>
                                <td className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(invoice.issueDate)}</td>
                                <td className="text-xs text-muted-foreground whitespace-nowrap">{invoice.dueDate ? formatDate(invoice.dueDate) : '-'}</td>
                                <td className="text-xs text-muted-foreground whitespace-nowrap">{invoice.paymentMethod || '-'}</td>
                                <td>
                                    <select
                                        value={invoice.status}
                                        onChange={(e) => handleInvoiceStatus(invoice.id, e.target.value as InvoiceStatus)}
                                        className="form-input py-1 text-xs min-w-28"
                                    >
                                        <option value={InvoiceStatus.DRAFT}>DRAFT</option>
                                        <option value={InvoiceStatus.SENT}>SENT</option>
                                        <option value={InvoiceStatus.PAID}>PAID</option>
                                        <option value={InvoiceStatus.OVERDUE}>OVERDUE</option>
                                        <option value={InvoiceStatus.CANCELLED}>CANCELLED</option>
                                    </select>
                                </td>
                                <td className="text-right">
                                    <button
                                        className="btn-ghost h-8 px-3 text-xs"
                                        onClick={() => {
                                            setSelectedInvoice(invoice)
                                            setShowInvoiceForm(true)
                                        }}
                                    >
                                        Editar
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredRows.length === 0 && (
                            <tr>
                                <td colSpan={10} className="text-center py-8 text-sm text-muted-foreground">
                                    No hay facturas que coincidan con los filtros.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showInvoiceForm && (
                <InvoiceForm
                    onClose={() => {
                        setShowInvoiceForm(false)
                        setSelectedInvoice(null)
                    }}
                    clients={clients}
                    projects={projects}
                    quotes={quotes}
                    banks={[]}
                    initialData={selectedInvoice}
                />
            )}
        </div>
    )
}
