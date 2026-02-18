'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { createLead } from '@/lib/actions/crm'
import { LeadStatus } from '@prisma/client'

interface LeadFormProps {
    onClose: () => void
}

export function LeadForm({ onClose }: LeadFormProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)

        try {
            await createLead(formData)
            onClose()
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error al crear el lead')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="glass-card p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-foreground">Nuevo Lead / Cotización</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="form-label">Empresa</label>
                            <input name="companyName" type="text" className="form-input" placeholder="Nombre de la empresa" required />
                        </div>
                        <div className="col-span-2">
                            <label className="form-label">Servicio Solicitado</label>
                            <input name="serviceRequested" type="text" className="form-input" placeholder="Ej: Branding, Web, etc." />
                        </div>
                        <div>
                            <label className="form-label">Valor Estimado (USD)</label>
                            <input name="estimatedValue" type="number" step="0.01" className="form-input" placeholder="0.00" />
                        </div>
                        <div>
                            <label className="form-label">Estado Inicial</label>
                            <select name="status" className="form-input">
                                <option value={LeadStatus.NEW}>Nuevo Lead</option>
                                <option value={LeadStatus.CONTACTED}>Contactado</option>
                                <option value={LeadStatus.QUALIFIED}>Calificado</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="form-label">Requerimiento / Nota</label>
                            <textarea name="requirementDetail" className="form-input min-h-[100px]" placeholder="Describe lo que el cliente necesita..."></textarea>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button type="button" className="flex-1 btn-secondary" onClick={onClose} disabled={loading}>
                            Cancelar
                        </button>
                        <button type="submit" className="flex-1 btn-primary justify-center" disabled={loading}>
                            {loading ? 'Creando...' : 'Crear Lead'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
