'use client'

import { useState } from 'react'
import { Client } from '@prisma/client'
import { createClient, updateClient } from '@/lib/actions/crm'
import { useRouter } from 'next/navigation'

interface CompanyFormProps {
    onClose: () => void
    initialData?: Client | null
}

export function CompanyForm({ onClose, initialData }: CompanyFormProps) {
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
            name: (formData.get('name') as string || '').trim(),
            country: (formData.get('country') as string || '').trim(),
            industry: (formData.get('industry') as string || '').trim(),
            taxId: (formData.get('taxId') as string || '').trim(),
            address: (formData.get('address') as string || '').trim(),
            referredBy: (formData.get('referredBy') as string || '').trim(),
            mainEmail: (formData.get('mainEmail') as string || '').trim()
        }

        const result = isEditing
            ? await updateClient(initialData.id, payload)
            : await createClient(payload)

        if (!result.success) {
            setError(result.error || 'No se pudo guardar la empresa')
            setLoading(false)
            return
        }

        router.refresh()
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in" onClick={onClose}>
            <div className="glass-card p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-foreground">{isEditing ? 'Editar Empresa' : 'Nueva Empresa'}</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="form-label">Nombre</label>
                        <input name="name" className="form-input" defaultValue={initialData?.name || ''} required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">País</label>
                            <input name="country" className="form-input" defaultValue={initialData?.country || ''} />
                        </div>
                        <div>
                            <label className="form-label">Industria</label>
                            <input name="industry" className="form-input" defaultValue={initialData?.industry || ''} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">RUC / Tax ID</label>
                            <input name="taxId" className="form-input" defaultValue={initialData?.taxId || ''} />
                        </div>
                        <div>
                            <label className="form-label">Email principal</label>
                            <input name="mainEmail" type="email" className="form-input" defaultValue={initialData?.mainEmail || ''} />
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Dirección</label>
                        <input name="address" className="form-input" defaultValue={initialData?.address || ''} />
                    </div>

                    <div>
                        <label className="form-label">Referido por</label>
                        <input name="referredBy" className="form-input" defaultValue={initialData?.referredBy || ''} />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" className="flex-1 btn-secondary" onClick={onClose} disabled={loading}>
                            Cancelar
                        </button>
                        <button type="submit" className="flex-1 btn-primary justify-center" disabled={loading}>
                            {loading ? (isEditing ? 'Guardando...' : 'Creando...') : (isEditing ? 'Guardar' : 'Crear empresa')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
