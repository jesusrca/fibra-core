'use client'

import { useState } from 'react'
import { Client, Contact } from '@prisma/client'
import { createContact, updateContact } from '@/lib/actions/crm'
import { useRouter } from 'next/navigation'

interface ContactFormProps {
    onClose: () => void
    clients: Client[]
    initialData?: Contact | null
}

export function ContactForm({ onClose, clients, initialData }: ContactFormProps) {
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
            firstName: (formData.get('firstName') as string || '').trim(),
            lastName: (formData.get('lastName') as string || '').trim(),
            email: (formData.get('email') as string || '').trim(),
            phone: (formData.get('phone') as string || '').trim(),
            contactMethod: (formData.get('contactMethod') as string || '').trim(),
            country: (formData.get('country') as string || '').trim(),
            specialty: (formData.get('specialty') as string || '').trim(),
            clientId: formData.get('clientId') as string,
        }

        const result = isEditing
            ? await updateContact(initialData.id, payload)
            : await createContact(payload)

        if (!result.success) {
            setError(result.error || 'No se pudo guardar el contacto')
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
                    <h2 className="text-xl font-bold text-foreground">{isEditing ? 'Editar Contacto' : 'Nuevo Contacto'}</h2>
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
                            <label className="form-label">Nombre</label>
                            <input name="firstName" className="form-input" defaultValue={initialData?.firstName || ''} required />
                        </div>
                        <div>
                            <label className="form-label">Apellido</label>
                            <input name="lastName" className="form-input" defaultValue={initialData?.lastName || ''} required />
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Empresa</label>
                        <select name="clientId" className="form-input" defaultValue={initialData?.clientId || ''} required>
                            <option value="">Seleccionar empresa...</option>
                            {clients.map((client) => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Correo</label>
                            <input name="email" type="email" className="form-input" defaultValue={initialData?.email || ''} required />
                        </div>
                        <div>
                            <label className="form-label">Teléfono</label>
                            <input name="phone" className="form-input" defaultValue={initialData?.phone || ''} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Método de contacto</label>
                            <input name="contactMethod" className="form-input" defaultValue={initialData?.contactMethod || ''} placeholder="Email, WhatsApp..." />
                        </div>
                        <div>
                            <label className="form-label">País</label>
                            <input name="country" className="form-input" defaultValue={initialData?.country || ''} />
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Especialidad</label>
                        <input name="specialty" className="form-input" defaultValue={initialData?.specialty || ''} />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" className="flex-1 btn-secondary" onClick={onClose} disabled={loading}>
                            Cancelar
                        </button>
                        <button type="submit" className="flex-1 btn-primary justify-center" disabled={loading}>
                            {loading ? (isEditing ? 'Guardando...' : 'Creando...') : (isEditing ? 'Guardar' : 'Crear contacto')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
