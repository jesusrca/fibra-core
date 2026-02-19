'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Eye, MousePointerClick, Target, Plus, Pencil, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createServiceCatalog, updateServiceCatalog } from '@/lib/actions/services'
import { formatCurrency, cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

const COLORS = ['#0EA5E9', '#F5C842', '#8B5CF6', '#10B981', '#F97316']

interface SourceData {
    channel: string
    leads: number
}

interface MarketingClientProps {
    channelData: SourceData[]
    totalReach: number
    totalClicks: number
    totalConversions: number
    totalSpent: number
    services: any[]
}

export function MarketingClient({ channelData, totalReach, totalClicks, totalConversions, totalSpent, services }: MarketingClientProps) {
    const router = useRouter()
    const [showForm, setShowForm] = useState(false)
    const [editingService, setEditingService] = useState<any | null>(null)
    const [savingService, setSavingService] = useState(false)
    const [serviceError, setServiceError] = useState<string | null>(null)
    const activeServices = useMemo(() => services.filter((s) => s.isActive).length, [services])

    const openCreateForm = () => {
        setEditingService(null)
        setServiceError(null)
        setShowForm(true)
    }

    const openEditForm = (service: any) => {
        setEditingService(service)
        setServiceError(null)
        setShowForm(true)
    }

    const handleServiceSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSavingService(true)
        setServiceError(null)
        const formData = new FormData(e.currentTarget)
        const payload = {
            name: (formData.get('name') as string || '').trim(),
            description: (formData.get('description') as string || '').trim(),
            averagePrice: parseFloat((formData.get('averagePrice') as string || '0').trim()) || 0,
            currency: (formData.get('currency') as string || 'USD').toUpperCase(),
            isActive: formData.get('isActive') === 'on'
        }

        const result = editingService
            ? await updateServiceCatalog(editingService.id, payload)
            : await createServiceCatalog(payload)

        setSavingService(false)

        if (!result.success) {
            setServiceError(result.error || 'No se pudo guardar el servicio')
            return
        }

        setShowForm(false)
        setEditingService(null)
        router.refresh()
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Marketing</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Métricas comerciales y fuentes de adquisición</p>
                </div>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                    { label: 'Alcance Estimado', value: totalReach.toLocaleString(), icon: Eye, color: 'text-[hsl(var(--info-text))]', bg: 'bg-electric-500/10', border: 'border-electric-500/20' },
                    { label: 'Clicks Estimados', value: totalClicks.toLocaleString(), icon: MousePointerClick, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                    { label: 'Leads Convertidos', value: totalConversions.toString(), icon: Target, color: 'text-[hsl(var(--success-text))]', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                    { label: 'Inversión Marketing', value: formatCurrency(totalSpent), icon: TrendingUp, color: 'text-[hsl(var(--warning-text))]', bg: 'bg-gold-500/10', border: 'border-gold-500/20' },
                ].map((k) => {
                    const Icon = k.icon
                    return (
                        <div key={k.label} className={cn('kpi-card border', k.border)}>
                            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3', k.bg)}>
                                <Icon className={cn('w-4 h-4', k.color)} />
                            </div>
                            <p className={cn('text-2xl font-bold', k.color)}>{k.value}</p>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">{k.label}</p>
                        </div>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="glass-card p-5">
                    <h2 className="section-title mb-4">Fuentes de Leads</h2>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={channelData} cx="50%" cy="50%" outerRadius={85} dataKey="leads" nameKey="channel">
                                {channelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    background: 'hsl(var(--chart-tooltip))',
                                    border: '1px solid hsl(var(--chart-tooltip-border))',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    color: 'hsl(var(--foreground))'
                                }}
                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="glass-card p-5">
                    <h2 className="section-title mb-3 text-base">Leads por Canal</h2>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={channelData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" vertical={false} />
                            <XAxis dataKey="channel" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                            <YAxis hide />
                            <Tooltip
                                contentStyle={{
                                    background: 'hsl(var(--chart-tooltip))',
                                    border: '1px solid hsl(var(--chart-tooltip-border))',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    color: 'hsl(var(--foreground))'
                                }}
                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Bar dataKey="leads" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <div>
                        <h2 className="section-title text-base mb-0.5">Catálogo de Servicios</h2>
                        <p className="text-xs text-muted-foreground">{services.length} servicios registrados, {activeServices} activos</p>
                    </div>
                    <button className="btn-primary h-9 px-3" onClick={openCreateForm}>
                        <Plus className="w-4 h-4" /> Nuevo Servicio
                    </button>
                </div>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Servicio</th>
                                <th>Precio Promedio</th>
                                <th>Estado</th>
                                <th>Detalle</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {services.map((service) => (
                                <tr key={service.id}>
                                    <td className="font-semibold">{service.name}</td>
                                    <td className="font-mono text-sm">
                                        {formatCurrency(service.averagePrice || 0)} {service.currency}
                                    </td>
                                    <td>
                                        <span className={cn('badge', service.isActive ? 'badge-success' : 'badge-neutral')}>
                                            {service.isActive ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="text-sm text-muted-foreground">{service.description || 'Sin detalle'}</td>
                                    <td className="text-right">
                                        <button className="btn-ghost p-1.5" onClick={() => openEditForm(service)}>
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {services.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No hay servicios registrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
                    <div className="modal-form-card w-full max-w-xl p-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">{editingService ? 'Editar Servicio' : 'Nuevo Servicio'}</h3>
                            <button className="btn-ghost p-1.5" onClick={() => setShowForm(false)}>
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form className="space-y-3" onSubmit={handleServiceSubmit}>
                            {serviceError && (
                                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-2 rounded-lg">
                                    {serviceError}
                                </div>
                            )}
                            <div>
                                <label className="form-label">Nombre del servicio</label>
                                <input
                                    name="name"
                                    required
                                    className="form-input"
                                    defaultValue={editingService?.name || ''}
                                    placeholder="Ej: Desarrollo Ecommerce"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="form-label">Precio promedio</label>
                                    <input
                                        name="averagePrice"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="form-input"
                                        defaultValue={editingService?.averagePrice || 0}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Moneda</label>
                                    <select name="currency" className="form-input" defaultValue={editingService?.currency || 'USD'}>
                                        <option value="USD">USD</option>
                                        <option value="PEN">PEN</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Detalle</label>
                                <textarea
                                    name="description"
                                    className="form-input min-h-[90px]"
                                    defaultValue={editingService?.description || ''}
                                    placeholder="Alcance, entregables y notas relevantes"
                                />
                            </div>
                            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                <input name="isActive" type="checkbox" defaultChecked={editingService ? !!editingService.isActive : true} />
                                Servicio activo
                            </label>
                            <div className="pt-2 flex gap-3">
                                <button type="button" className="btn-secondary flex-1 justify-center" onClick={() => setShowForm(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary flex-1 justify-center" disabled={savingService}>
                                    {savingService ? 'Guardando...' : editingService ? 'Guardar cambios' : 'Crear servicio'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
