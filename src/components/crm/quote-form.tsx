'use client'

import { useState } from 'react'
import { createQuote, updateQuote } from '@/lib/actions/crm'
import { useRouter } from 'next/navigation'

interface LeadOption {
    id: string
    companyName: string | null
    serviceRequested: string | null
}

interface QuoteInitialData {
    id: string
    leadId: string
    proposalDetail: string | null
    servicesOffered: string | null
    budget: number
    paymentMethod: string | null
    paymentCountry: string | null
    sentDate: Date | null
    status: 'PENDING' | 'SENT' | 'ACCEPTED' | 'REJECTED'
    installmentsCount: number
}

interface QuoteFormProps {
    onClose: () => void
    leads: LeadOption[]
    initialData?: QuoteInitialData | null
}

function toInputDate(value?: Date | null) {
    if (!value) return ''
    return new Date(value).toISOString().slice(0, 10)
}

export function QuoteForm({ onClose, leads, initialData }: QuoteFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const isEditing = !!initialData

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const payload = {
            leadId: formData.get('leadId') as string,
            proposalDetail: (formData.get('proposalDetail') as string || '').trim(),
            servicesOffered: (formData.get('servicesOffered') as string || '').trim(),
            budget: parseFloat(formData.get('budget') as string || '0'),
            paymentMethod: (formData.get('paymentMethod') as string || '').trim(),
            paymentCountry: (formData.get('paymentCountry') as string || '').trim(),
            sentDate: formData.get('sentDate') ? new Date(formData.get('sentDate') as string) : undefined,
            status: formData.get('status') as any,
            installmentsCount: parseInt(formData.get('installmentsCount') as string || '1', 10)
        }
        const result = isEditing
            ? await updateQuote(initialData.id, payload)
            : await createQuote(payload)

        if (!result.success) {
            setError(result.error || `No se pudo ${isEditing ? 'actualizar' : 'crear'} la cotización`)
            setLoading(false)
            return
        }

        router.refresh()
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in" onClick={onClose}>
            <div className="modal-form-card p-6 w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-foreground">{isEditing ? 'Editar Cotización' : 'Nueva Cotización'}</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="form-label">Lead</label>
                        <select name="leadId" className="form-input" required defaultValue={initialData?.leadId || ''} disabled={isEditing}>
                            <option value="">Seleccionar lead...</option>
                            {leads.map((lead) => (
                                <option key={lead.id} value={lead.id}>
                                    {lead.companyName || 'Sin empresa'} - {lead.serviceRequested || 'Sin servicio'}
                                </option>
                            ))}
                        </select>
                        {isEditing && <input type="hidden" name="leadId" value={initialData?.leadId || ''} />}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Presupuesto</label>
                            <input name="budget" type="number" step="0.01" className="form-input" required defaultValue={initialData?.budget || ''} />
                        </div>
                        <div>
                            <label className="form-label">Estado</label>
                            <select name="status" className="form-input" defaultValue={initialData?.status || 'PENDING'}>
                                <option value="PENDING">PENDIENTE</option>
                                <option value="SENT">ENVIADA</option>
                                <option value="ACCEPTED">ACEPTADA</option>
                                <option value="REJECTED">RECHAZADA</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="form-label">Método de pago</label>
                            <input name="paymentMethod" className="form-input" defaultValue={initialData?.paymentMethod || ''} />
                        </div>
                        <div>
                            <label className="form-label">País de pago</label>
                            <input name="paymentCountry" className="form-input" defaultValue={initialData?.paymentCountry || ''} />
                        </div>
                        <div>
                            <label className="form-label">Cuotas</label>
                            <input name="installmentsCount" type="number" min={1} defaultValue={initialData?.installmentsCount || 1} className="form-input" />
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Fecha de envío</label>
                        <input name="sentDate" type="date" className="form-input" defaultValue={toInputDate(initialData?.sentDate)} />
                    </div>

                    <div>
                        <label className="form-label">Detalle de propuesta</label>
                        <textarea name="proposalDetail" className="form-input min-h-[90px]" defaultValue={initialData?.proposalDetail || ''} />
                    </div>

                    <div>
                        <label className="form-label">Servicios ofrecidos</label>
                        <textarea name="servicesOffered" className="form-input min-h-[90px]" defaultValue={initialData?.servicesOffered || ''} />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" className="flex-1 btn-secondary" onClick={onClose} disabled={loading}>
                            Cancelar
                        </button>
                        <button type="submit" className="flex-1 btn-primary justify-center" disabled={loading}>
                            {loading ? (isEditing ? 'Actualizando...' : 'Guardando...') : (isEditing ? 'Guardar cambios' : 'Crear cotización')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
