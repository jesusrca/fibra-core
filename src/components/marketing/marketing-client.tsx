'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Eye, MousePointerClick, Target, Plus, Pencil, X, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createServiceCatalog, updateServiceCatalog } from '@/lib/actions/services'
import { createSocialMetric, deleteSocialMetric, updateSocialMetric } from '@/lib/actions/marketing'
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
    socialMetrics: Array<{
        id: string
        platform: string
        followers: number
        impressions: number
        interactions: number
        clicks: number
        leads: number
        recordedAt: string
        notes: string | null
    }>
    socialByPlatform: Array<{
        id: string
        platform: string
        platformLabel: string
        followers: number
        impressions: number
        interactions: number
        clicks: number
        leads: number
        engagementRate: number
        recordedAt: string
        notes: string | null
    }>
    socialFollowersTotal: number
    socialEngagementRate: number
}

export function MarketingClient({
    channelData,
    totalReach,
    totalClicks,
    totalConversions,
    totalSpent,
    services,
    socialMetrics,
    socialByPlatform,
    socialFollowersTotal,
    socialEngagementRate
}: MarketingClientProps) {
    const router = useRouter()
    const [showForm, setShowForm] = useState(false)
    const [editingService, setEditingService] = useState<any | null>(null)
    const [savingService, setSavingService] = useState(false)
    const [serviceError, setServiceError] = useState<string | null>(null)
    const [showSocialForm, setShowSocialForm] = useState(false)
    const [editingSocial, setEditingSocial] = useState<any | null>(null)
    const [savingSocial, setSavingSocial] = useState(false)
    const [socialError, setSocialError] = useState<string | null>(null)
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

    const openCreateSocialForm = () => {
        setEditingSocial(null)
        setSocialError(null)
        setShowSocialForm(true)
    }

    const openEditSocialForm = (metric: any) => {
        setEditingSocial(metric)
        setSocialError(null)
        setShowSocialForm(true)
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

    const handleSocialSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSavingSocial(true)
        setSocialError(null)
        const formData = new FormData(e.currentTarget)
        const payload = {
            platform: (formData.get('platform') as string || '').trim(),
            followers: parseInt((formData.get('followers') as string || '0').trim(), 10) || 0,
            impressions: parseInt((formData.get('impressions') as string || '0').trim(), 10) || 0,
            interactions: parseInt((formData.get('interactions') as string || '0').trim(), 10) || 0,
            clicks: parseInt((formData.get('clicks') as string || '0').trim(), 10) || 0,
            leads: parseInt((formData.get('leads') as string || '0').trim(), 10) || 0,
            recordedAt: formData.get('recordedAt')
                ? new Date(formData.get('recordedAt') as string)
                : undefined,
            notes: (formData.get('notes') as string || '').trim()
        }

        const result = editingSocial
            ? await updateSocialMetric(editingSocial.id, payload)
            : await createSocialMetric(payload)

        setSavingSocial(false)

        if (!result.success) {
            setSocialError(result.error || 'No se pudo guardar la métrica')
            return
        }

        setShowSocialForm(false)
        setEditingSocial(null)
        router.refresh()
    }

    const handleDeleteSocial = async (id: string) => {
        const confirmed = window.confirm('¿Eliminar esta métrica social?')
        if (!confirmed) return
        const result = await deleteSocialMetric(id)
        if (!result.success) return
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
                    { label: 'Alcance Total RRSS', value: totalReach.toLocaleString(), icon: Eye, color: 'text-[hsl(var(--info-text))]', bg: 'bg-electric-500/10', border: 'border-electric-500/20' },
                    { label: 'Clicks Totales RRSS', value: totalClicks.toLocaleString(), icon: MousePointerClick, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                    { label: 'Leads Convertidos', value: totalConversions.toString(), icon: Target, color: 'text-[hsl(var(--success-text))]', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                    { label: 'Seguidores Totales', value: socialFollowersTotal.toLocaleString(), icon: TrendingUp, color: 'text-[hsl(var(--warning-text))]', bg: 'bg-gold-500/10', border: 'border-gold-500/20' },
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

            <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="section-title mb-0.5">Seguidores e Interacción por Red</h2>
                        <p className="text-xs text-muted-foreground">
                            Engagement promedio: {socialEngagementRate.toFixed(2)}% · Inversión marketing: {formatCurrency(totalSpent)}
                        </p>
                    </div>
                    <button className="btn-primary h-9 px-3" onClick={openCreateSocialForm}>
                        <Plus className="w-4 h-4" /> Registrar métrica
                    </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="glass-card p-4">
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={socialByPlatform}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" vertical={false} />
                                <XAxis dataKey="platformLabel" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
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
                                <Bar dataKey="followers" fill="#2563EB" radius={[4, 4, 0, 0]} name="Seguidores" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Plataforma</th>
                                    <th>Seguidores</th>
                                    <th>Interacciones</th>
                                    <th>Engagement</th>
                                </tr>
                            </thead>
                            <tbody>
                                {socialByPlatform.map((row) => (
                                    <tr key={row.id}>
                                        <td className="font-semibold">{row.platformLabel}</td>
                                        <td>{row.followers.toLocaleString()}</td>
                                        <td>{row.interactions.toLocaleString()}</td>
                                        <td className="font-mono text-sm">{row.engagementRate.toFixed(2)}%</td>
                                    </tr>
                                ))}
                                {socialByPlatform.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-8 text-muted-foreground">
                                            No hay métricas sociales registradas.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
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

            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <div>
                        <h2 className="section-title text-base mb-0.5">Histórico de Métricas Sociales</h2>
                        <p className="text-xs text-muted-foreground">{socialMetrics.length} registros</p>
                    </div>
                </div>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Plataforma</th>
                                <th>Seguidores</th>
                                <th>Impresiones</th>
                                <th>Interacciones</th>
                                <th>Clicks</th>
                                <th>Leads</th>
                                <th>Notas</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {socialMetrics.map((metric) => (
                                <tr key={metric.id}>
                                    <td className="text-sm text-muted-foreground">{new Date(metric.recordedAt).toLocaleDateString('es-PE')}</td>
                                    <td className="font-semibold">{metric.platform}</td>
                                    <td>{metric.followers.toLocaleString()}</td>
                                    <td>{metric.impressions.toLocaleString()}</td>
                                    <td>{metric.interactions.toLocaleString()}</td>
                                    <td>{metric.clicks.toLocaleString()}</td>
                                    <td>{metric.leads.toLocaleString()}</td>
                                    <td className="text-sm text-muted-foreground">{metric.notes || '—'}</td>
                                    <td className="text-right">
                                        <div className="inline-flex gap-1">
                                            <button className="btn-ghost p-1.5" onClick={() => openEditSocialForm(metric)}>
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button className="btn-ghost p-1.5 text-destructive" onClick={() => handleDeleteSocial(metric.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {socialMetrics.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="text-center py-8 text-muted-foreground">
                                        Aún no hay métricas registradas.
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

            {showSocialForm && (
                <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSocialForm(false)}>
                    <div className="modal-form-card w-full max-w-2xl p-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">{editingSocial ? 'Editar Métrica Social' : 'Registrar Métrica Social'}</h3>
                            <button className="btn-ghost p-1.5" onClick={() => setShowSocialForm(false)}>
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form className="space-y-3" onSubmit={handleSocialSubmit}>
                            {socialError && (
                                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-2 rounded-lg">
                                    {socialError}
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="form-label">Plataforma</label>
                                    <select name="platform" required className="form-input" defaultValue={editingSocial?.platform || 'INSTAGRAM'}>
                                        <option value="INSTAGRAM">Instagram</option>
                                        <option value="FACEBOOK">Facebook</option>
                                        <option value="TIKTOK">TikTok</option>
                                        <option value="LINKEDIN">LinkedIn</option>
                                        <option value="YOUTUBE">YouTube</option>
                                        <option value="X">X / Twitter</option>
                                        <option value="WEB">Web</option>
                                        <option value="OTROS">Otros</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Fecha de medición</label>
                                    <input name="recordedAt" type="date" className="form-input" defaultValue={editingSocial?.recordedAt ? new Date(editingSocial.recordedAt).toISOString().slice(0, 10) : ''} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="form-label">Seguidores</label>
                                    <input name="followers" type="number" min="0" className="form-input" defaultValue={editingSocial?.followers || 0} />
                                </div>
                                <div>
                                    <label className="form-label">Impresiones</label>
                                    <input name="impressions" type="number" min="0" className="form-input" defaultValue={editingSocial?.impressions || 0} />
                                </div>
                                <div>
                                    <label className="form-label">Interacciones</label>
                                    <input name="interactions" type="number" min="0" className="form-input" defaultValue={editingSocial?.interactions || 0} />
                                </div>
                                <div>
                                    <label className="form-label">Clicks</label>
                                    <input name="clicks" type="number" min="0" className="form-input" defaultValue={editingSocial?.clicks || 0} />
                                </div>
                                <div>
                                    <label className="form-label">Leads</label>
                                    <input name="leads" type="number" min="0" className="form-input" defaultValue={editingSocial?.leads || 0} />
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Notas</label>
                                <textarea
                                    name="notes"
                                    className="form-input min-h-[90px]"
                                    defaultValue={editingSocial?.notes || ''}
                                    placeholder="Contexto: campaña, periodo, observaciones"
                                />
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" className="btn-secondary flex-1 justify-center" onClick={() => setShowSocialForm(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary flex-1 justify-center" disabled={savingSocial}>
                                    {savingSocial ? 'Guardando...' : editingSocial ? 'Guardar cambios' : 'Registrar métrica'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
