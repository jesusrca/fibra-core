'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { createProject, createProjectClient } from '@/lib/actions/projects'

interface ProjectFormProps {
    onClose: () => void
    clients: any[]
    users: any[]
    services: Array<{ id: string; name: string }>
}

export function ProjectForm({ onClose, clients, users, services }: ProjectFormProps) {
    const [loading, setLoading] = useState(false)
    const [creatingClient, setCreatingClient] = useState(false)
    const [clientMode, setClientMode] = useState<'select' | 'create'>('select')
    const [serviceMode, setServiceMode] = useState<'select' | 'custom'>('select')
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        let clientId = (formData.get('clientId') as string || '').trim()

        if (clientMode === 'create') {
            const clientName = (formData.get('newClientName') as string || '').trim()
            if (!clientName) {
                setError('Debes indicar el nombre del cliente nuevo')
                setLoading(false)
                return
            }

            setCreatingClient(true)
            const createdClient = await createProjectClient({
                name: clientName,
                country: (formData.get('newClientCountry') as string || '').trim() || undefined,
                industry: (formData.get('newClientIndustry') as string || '').trim() || undefined,
                mainEmail: (formData.get('newClientEmail') as string || '').trim() || undefined
            })
            setCreatingClient(false)

            if (!createdClient.success || !createdClient.client?.id) {
                setError(createdClient.error || 'No se pudo crear el cliente')
                setLoading(false)
                return
            }
            clientId = createdClient.client.id
        }

        if (!clientId) {
            setError('Debes seleccionar o crear un cliente')
            setLoading(false)
            return
        }

        const selectedService = (formData.get('serviceTypeSelect') as string || '').trim()
        const customService = (formData.get('customServiceType') as string || '').trim()
        const serviceType = selectedService === '__custom__' ? customService : selectedService

        if (!serviceType) {
            setError('Debes seleccionar o escribir el tipo de servicio')
            setLoading(false)
            return
        }

        const data = {
            name: formData.get('name') as string,
            clientId,
            directorId: formData.get('directorId') as string,
            status: 'PLANNING' as any,
            budget: parseFloat(formData.get('budget') as string) || 0,
            serviceType,
            endDate: formData.get('endDate') ? new Date(formData.get('endDate') as string) : undefined,
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
            <div className="modal-form-card w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
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
                            <div className="flex items-center justify-between gap-2">
                                <label className="form-label">Cliente</label>
                                <button
                                    type="button"
                                    className="text-[11px] text-primary hover:underline"
                                    onClick={() => setClientMode((mode) => (mode === 'select' ? 'create' : 'select'))}
                                >
                                    {clientMode === 'select' ? 'Crear nuevo' : 'Elegir existente'}
                                </button>
                            </div>

                            {clientMode === 'select' ? (
                                <select name="clientId" className="form-input" required>
                                    <option value="">Seleccionar...</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="space-y-2">
                                    <input
                                        name="newClientName"
                                        className="form-input"
                                        placeholder="Nombre del cliente"
                                        required
                                    />
                                    <input
                                        name="newClientEmail"
                                        type="email"
                                        className="form-input"
                                        placeholder="correo@empresa.com (opcional)"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            name="newClientCountry"
                                            className="form-input"
                                            placeholder="País (opcional)"
                                        />
                                        <input
                                            name="newClientIndustry"
                                            className="form-input"
                                            placeholder="Industria (opcional)"
                                        />
                                    </div>
                                </div>
                            )}
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

                    <div className="space-y-1.5">
                        <label className="form-label">Tipo de Servicio</label>
                        <select
                            name="serviceTypeSelect"
                            className="form-input"
                            defaultValue=""
                            onChange={(e) => setServiceMode(e.target.value === '__custom__' ? 'custom' : 'select')}
                            required
                        >
                            <option value="">Seleccionar servicio...</option>
                            {services.map((service) => (
                                <option key={service.id} value={service.name}>{service.name}</option>
                            ))}
                            <option value="__custom__">+ Agregar nuevo servicio</option>
                        </select>
                        {serviceMode === 'custom' && (
                            <input
                                name="customServiceType"
                                required
                                className="form-input mt-2"
                                placeholder="Escribe el nuevo servicio"
                            />
                        )}
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
                            <label className="form-label">Fecha de Fin</label>
                            <input
                                name="endDate"
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
                            disabled={loading || creatingClient}
                            className="btn-primary flex-1 justify-center shadow-lg shadow-primary/20"
                        >
                            {loading || creatingClient ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Proyecto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
