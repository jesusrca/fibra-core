'use client'

import { useState } from 'react'
import { createInvoice, updateInvoice } from '@/lib/actions/crm'
import { InvoiceStatus } from '@prisma/client'
import { useRouter } from 'next/navigation'

interface ClientOption {
    id: string
    name: string
}

interface ProjectOption {
    id: string
    name: string
    clientId?: string | null
    clientName?: string | null
    quoteId?: string | null
}

interface QuoteOption {
    id: string
    budget: number
    lead: { companyName: string | null }
}

interface InvoiceInitialData {
    id: string
    invoiceNumber: string
    fileUrl: string | null
    fileRef?: string | null
    quoteId: string | null
    clientId: string
    projectId: string | null
    issueDate: Date
    dueDate: Date | null
    amount: number
    status: InvoiceStatus
    paymentMethod: string | null
    paymentBank?: string | null
    paymentCountry: string | null
}

interface BankOption {
    id: string
    name: string
}

interface InvoiceFormProps {
    onClose: () => void
    clients: ClientOption[]
    projects: ProjectOption[]
    quotes: QuoteOption[]
    banks: BankOption[]
    initialData?: InvoiceInitialData | null
}

function toInputDate(value?: Date | null) {
    if (!value) return ''
    return new Date(value).toISOString().slice(0, 10)
}

export function InvoiceForm({ onClose, clients, projects, quotes, banks, initialData }: InvoiceFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [uploadingFile, setUploadingFile] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [fileUrl, setFileUrl] = useState(initialData?.fileUrl || '')
    const [fileRef, setFileRef] = useState(initialData?.fileRef || initialData?.fileUrl || '')
    const [selectedProjectId, setSelectedProjectId] = useState(initialData?.projectId || '')
    const [selectedClientId, setSelectedClientId] = useState(initialData?.clientId || '')
    const [selectedQuoteId, setSelectedQuoteId] = useState(initialData?.quoteId || '')
    const isEditing = !!initialData
    const selectedProject = projects.find((project) => project.id === selectedProjectId) || null
    const resolvedClientId = selectedProject?.clientId || selectedClientId || ''
    const resolvedQuoteId = selectedProject?.quoteId || selectedQuoteId || ''

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const payload = {
            invoiceNumber: (formData.get('invoiceNumber') as string || '').trim() || undefined,
            fileUrl: fileRef || undefined,
            quoteId: ((formData.get('quoteId') as string || '').trim() || undefined) || (selectedProject?.quoteId || undefined),
            clientId: ((formData.get('clientId') as string || '').trim() || undefined) || (selectedProject?.clientId || undefined),
            projectId: (formData.get('projectId') as string || '').trim() || undefined,
            issueDate: formData.get('issueDate') ? new Date(formData.get('issueDate') as string) : undefined,
            dueDate: formData.get('dueDate') ? new Date(formData.get('dueDate') as string) : undefined,
            amount: parseFloat(formData.get('amount') as string || '0'),
            status: formData.get('status') as InvoiceStatus,
            paymentMethod: (formData.get('paymentMethod') as string || '').trim() || undefined,
            paymentBank: (formData.get('paymentBank') as string || '').trim() || undefined
        }

        const result = isEditing
            ? await updateInvoice(initialData.id, payload)
            : await createInvoice(payload)

        if (!result.success) {
            setError(result.error || `No se pudo ${isEditing ? 'actualizar' : 'crear'} la factura`)
            setLoading(false)
            return
        }

        router.refresh()
        onClose()
    }

    const handleFileUpload = async (file: File) => {
        setUploadingFile(true)
        setError(null)
        try {
            const data = new FormData()
            data.append('file', file)
            const response = await fetch('/api/uploads/invoice-file', {
                method: 'POST',
                body: data
            })
            const result = await response.json()
            if (!response.ok || !result?.fileUrl || !result?.fileRef) {
                throw new Error(result?.error || 'No se pudo subir el archivo de factura')
            }
            setFileUrl(result.fileUrl)
            setFileRef(result.fileRef)
        } catch (uploadError) {
            setError(uploadError instanceof Error ? uploadError.message : 'No se pudo subir el archivo')
        } finally {
            setUploadingFile(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in" onClick={onClose}>
            <div className="modal-form-card p-6 w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-foreground">{isEditing ? 'Editar Factura' : 'Nueva Factura'}</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Número de factura (opcional)</label>
                            <input name="invoiceNumber" className="form-input" placeholder="INV-2026-12345" defaultValue={initialData?.invoiceNumber || ''} />
                        </div>
                        <div>
                            <label className="form-label">Estado</label>
                            <select name="status" className="form-input" defaultValue={initialData?.status || InvoiceStatus.DRAFT}>
                                <option value={InvoiceStatus.DRAFT}>DRAFT</option>
                                <option value={InvoiceStatus.SENT}>SENT</option>
                                <option value={InvoiceStatus.PAID}>PAID</option>
                                <option value={InvoiceStatus.OVERDUE}>OVERDUE</option>
                                <option value={InvoiceStatus.CANCELLED}>CANCELLED</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="form-label">PDF / archivo de factura</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="file"
                                accept="application/pdf,image/png,image/jpeg,image/webp"
                                className="form-input"
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) void handleFileUpload(file)
                                    e.currentTarget.value = ''
                                }}
                            />
                        </div>
                        {uploadingFile && <p className="text-xs text-muted-foreground mt-1">Subiendo archivo...</p>}
                        {fileUrl && (
                            <a href={fileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">
                                Ver archivo subido
                            </a>
                        )}
                    </div>

                        <div>
                            <label className="form-label">Proyecto (obligatorio)</label>
                            <select
                                name="projectId"
                                className="form-input"
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                required
                            >
                                <option value="">Seleccionar proyecto...</option>
                                {projects.map((project) => (
                                    <option key={project.id} value={project.id}>{project.name}</option>
                                ))}
                            </select>
                        </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Cliente</label>
                            <select
                                name="clientId"
                                className="form-input"
                                value={resolvedClientId}
                                disabled={!!selectedProject?.clientId}
                                onChange={(e) => setSelectedClientId(e.target.value)}
                            >
                                <option value="">Seleccionar cliente...</option>
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                            {selectedProject?.clientId ? (
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    Cliente autocompletado desde el proyecto.
                                </p>
                            ) : null}
                        </div>
                        <div>
                            <label className="form-label">Cotización asociada</label>
                            <select
                                name="quoteId"
                                className="form-input"
                                value={resolvedQuoteId}
                                disabled={!!selectedProject?.quoteId}
                                onChange={(e) => setSelectedQuoteId(e.target.value)}
                            >
                                <option value="">Sin cotización</option>
                                {quotes.map((quote) => (
                                    <option key={quote.id} value={quote.id}>
                                        {quote.lead.companyName || 'Lead'} - {quote.id.slice(0, 8)}
                                    </option>
                                ))}
                            </select>
                            {selectedProject?.quoteId ? (
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    Cotización autocompletada desde el proyecto.
                                </p>
                            ) : null}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="form-label">Monto</label>
                            <input name="amount" type="number" step="0.01" className="form-input" required defaultValue={initialData?.amount || ''} />
                        </div>
                        <div>
                            <label className="form-label">Fecha emisión</label>
                            <input name="issueDate" type="date" className="form-input" defaultValue={toInputDate(initialData?.issueDate || new Date())} />
                        </div>
                        <div>
                            <label className="form-label">Fecha vencimiento</label>
                            <input name="dueDate" type="date" className="form-input" defaultValue={toInputDate(initialData?.dueDate)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Método de pago</label>
                            <input name="paymentMethod" className="form-input" defaultValue={initialData?.paymentMethod || ''} />
                        </div>
                        <div>
                            <label className="form-label">Banco de destino</label>
                            <select name="paymentBank" className="form-input" defaultValue={initialData?.paymentBank || ''}>
                                <option value="">Seleccionar banco...</option>
                                {banks.map((bank) => (
                                    <option key={bank.id} value={bank.name}>{bank.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" className="flex-1 btn-secondary" onClick={onClose} disabled={loading || uploadingFile}>
                            Cancelar
                        </button>
                        <button type="submit" className="flex-1 btn-primary justify-center" disabled={loading || uploadingFile}>
                            {loading || uploadingFile ? (isEditing ? 'Actualizando...' : 'Guardando...') : (isEditing ? 'Guardar cambios' : 'Crear factura')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
