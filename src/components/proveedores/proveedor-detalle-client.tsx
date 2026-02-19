'use client'

import Link from 'next/link'
import { ArrowLeft, ReceiptText, CalendarDays, CircleDollarSign, FileText } from 'lucide-react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

interface ProveedorDetalleClientProps {
    supplier: any
    paymentRows: Array<{
        id: string
        issueDate: Date | null
        paymentDate: Date | null
        amount: number
        status: string
        description: string | null
        receiptUrl: string | null
        project: { id: string; name: string; status: string } | null
        serviceProvided: string
        installmentsCount: number
        totalBudget: number
    }>
}

function paymentStatusLabel(status: string) {
    if (status === 'PAID') return 'Pagado'
    if (status === 'CANCELLED') return 'Cancelado'
    return 'Pendiente'
}

function paymentStatusClass(status: string) {
    if (status === 'PAID') return 'badge-success'
    if (status === 'CANCELLED') return 'badge-danger'
    return 'badge-warning'
}

export function ProveedorDetalleClient({ supplier, paymentRows }: ProveedorDetalleClientProps) {
    const totalPaid = paymentRows
        .filter((row) => row.status === 'PAID')
        .reduce((sum, row) => sum + row.amount, 0)
    const totalPending = paymentRows
        .filter((row) => row.status === 'PENDING')
        .reduce((sum, row) => sum + row.amount, 0)
    const totalIssued = paymentRows.length

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <Link href="/proveedores" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
                        <ArrowLeft className="w-4 h-4" /> Volver a proveedores
                    </Link>
                    <h1 className="text-2xl font-bold text-foreground">Proveedor: {supplier.name}</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Histórico de pagos, facturas y recibos emitidos
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="kpi-card border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <ReceiptText className="w-4 h-4 text-blue-500" />
                        <span className="text-xs text-muted-foreground">Documentos emitidos</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-500">{totalIssued}</p>
                </div>
                <div className="kpi-card border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <CircleDollarSign className="w-4 h-4 text-[hsl(var(--success-text))]" />
                        <span className="text-xs text-muted-foreground">Total pagado</span>
                    </div>
                    <p className="text-2xl font-bold text-[hsl(var(--success-text))]">{formatCurrency(totalPaid)}</p>
                </div>
                <div className="kpi-card border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <CalendarDays className="w-4 h-4 text-amber-500" />
                        <span className="text-xs text-muted-foreground">Total pendiente</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-500">{formatCurrency(totalPending)}</p>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-border">
                    <h2 className="section-title text-base">Historial de Pagos y Recibos</h2>
                </div>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Emisión</th>
                                <th>Pago</th>
                                <th>Proyecto</th>
                                <th>Servicio</th>
                                <th>Detalle</th>
                                <th className="text-right">Monto</th>
                                <th>Estado</th>
                                <th>Documento</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paymentRows.map((row) => (
                                <tr key={row.id}>
                                    <td className="text-muted-foreground text-xs whitespace-nowrap">
                                        {row.issueDate ? formatDate(row.issueDate) : 'Sin fecha'}
                                    </td>
                                    <td className="text-muted-foreground text-xs whitespace-nowrap">
                                        {row.paymentDate ? formatDate(row.paymentDate) : 'Pendiente'}
                                    </td>
                                    <td className="whitespace-nowrap">
                                        {row.project ? (
                                            <Link href={`/proyectos/${row.project.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                                                {row.project.name}
                                            </Link>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Sin proyecto</span>
                                        )}
                                    </td>
                                    <td className="text-muted-foreground text-xs whitespace-nowrap">{row.serviceProvided}</td>
                                    <td className="text-muted-foreground text-xs">
                                        {row.description || 'Factura/recibo registrado'}
                                    </td>
                                    <td className="text-right font-semibold whitespace-nowrap">{formatCurrency(row.amount)}</td>
                                    <td>
                                        <span className={cn('badge', paymentStatusClass(row.status))}>
                                            {paymentStatusLabel(row.status)}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap">
                                        {row.receiptUrl ? (
                                            <a href={row.receiptUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs inline-flex items-center gap-1">
                                                <FileText className="w-3 h-3" /> Ver
                                            </a>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Sin archivo</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {paymentRows.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center py-10 text-muted-foreground">
                                        No hay historial de pagos o documentos emitidos para este proveedor.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

