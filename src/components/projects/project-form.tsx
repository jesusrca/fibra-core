'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { createProject } from '@/lib/actions/projects'

interface ProjectFormProps {
    onClose: () => void
    clients: any[]
    users: any[]
}

export function ProjectForm({ onClose, clients, users }: ProjectFormProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const data = {
            name: formData.get('name') as string,
            clientId: formData.get('clientId') as string,
            directorId: formData.get('directorId') as string,
            status: 'PLANNING' as any,
            priority: formData.get('priority') as any,
            budget: parseFloat(formData.get('budget') as string) || 0,
            serviceType: formData.get('serviceType') as string,
            deadline: formData.get('deadline') ? new Date(formData.get('deadline') as string) : undefined,
        }

        const result = await createProject(data)

        if (result.success) {
            onClose()
        } else {
            setError(result.error || 'Ocurrió un error')
        }
        setLoading(false)
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
                    <h2 className="font-semibold text-lg">Nuevo Proyecto</h2>
                    <button onClick={onClose} className="p-1 hover:bg-secondary rounded-lg transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="form-label">Nombre del Proyecto</label>
                        <input
                            name="name"
                            required
                            className="form-input"
                            placeholder="Ej: Rediseño Web 2024"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="form-label">Cliente</label>
                            <select name="clientId" required className="form-input">
                                <option value="">Seleccionar...</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="form-label">Director de Proyecto</label>
                            <select name="directorId" required className="form-input">
                                <option value="">Seleccionar...</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="form-label">Tipo de Servicio</label>
                            <input
                                name="serviceType"
                                required
                                className="form-input"
                                placeholder="Ej: Branding"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="form-label">Prioridad</label>
                            <select name="priority" className="form-input">
                                <option value="MEDIUM">Media</option>
                                <option value="HIGH">Alta</option>
                                <option value="LOW">Baja</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="form-label">Presupuesto (USD)</label>
                            <input
                                name="budget"
                                type="number"
                                required
                                className="form-input"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="form-label">Fecha de Entrega</label>
                            <input
                                name="deadline"
                                type="date"
                                className="form-input"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary flex-1 justify-center"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary flex-1 justify-center shadow-lg shadow-primary/20"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Proyecto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
