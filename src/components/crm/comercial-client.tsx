'use client'

import { useState } from 'react'
import { Plus, Building2, MoreHorizontal, Search } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { LeadForm } from './lead-form'
import { Lead, LeadStatus } from '@prisma/client'

interface ComercialClientProps {
    initialLeads: (Lead & { client: any; contact: any })[]
}

const pipelineStages = [
    { key: LeadStatus.NEW, label: 'Nuevo Lead', color: 'border-blue-500/40', dot: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' },
    { key: LeadStatus.CONTACTED, label: 'Contactado', color: 'border-purple-500/40', dot: 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]' },
    { key: LeadStatus.QUALIFIED, label: 'Calificado', color: 'border-[hsl(var(--warning-text))]/40', dot: 'bg-[hsl(var(--warning-text))] shadow-[0_0_8px_rgba(245,158,11,0.5)]' },
    { key: LeadStatus.PROPOSAL, label: 'Propuesta', color: 'border-[hsl(var(--info-text))]/40', dot: 'bg-[hsl(var(--info-text))] shadow-[0_0_8px_rgba(14,165,233,0.5)]' },
    { key: LeadStatus.WON, label: 'Ganado', color: 'border-[hsl(var(--success-text))]/40', dot: 'bg-[hsl(var(--success-text))] shadow-[0_0_8px_rgba(16,185,129,0.5)]' },
] as const

export function ComercialClient({ initialLeads }: ComercialClientProps) {
    const [view, setView] = useState<'pipeline' | 'list'>('pipeline')
    const [showForm, setShowForm] = useState(false)
    const leads = initialLeads

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Gestión Comercial</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Pipeline de ventas y gestión de clientes</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex border border-border rounded-lg overflow-hidden bg-card">
                        {(['pipeline', 'list'] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={cn(
                                    'px-3 py-1.5 text-xs font-medium transition-all',
                                    view === v ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {v === 'pipeline' ? '⬛ Pipeline' : '☰ Lista'}
                            </button>
                        ))}
                    </div>
                    <button className="btn-primary" onClick={() => setShowForm(true)}>
                        <Plus className="w-4 h-4" /> Nuevo Lead
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {
                        label: 'Valor del Pipeline',
                        value: formatCurrency(leads.reduce((s, l) => s + (l.status !== 'WON' && l.status !== 'LOST' ? l.estimatedValue : 0), 0)),
                        color: 'text-[hsl(var(--info-text))]'
                    },
                    { label: 'Tasa de Cierre', value: '72%', color: 'text-[hsl(var(--success-text))]' },
                    { label: 'Leads Activos', value: leads.filter((l) => l.status !== 'WON' && l.status !== 'LOST').length, color: 'text-[hsl(var(--warning-text))]' },
                    { label: 'Ventas (Fase 1)', value: formatCurrency(22000), color: 'text-foreground' },
                ].map((s) => (
                    <div key={s.label} className="glass-card p-4">
                        <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Pipeline View */}
            {view === 'pipeline' && (
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    {pipelineStages.map((stage) => {
                        const stageLeads = leads.filter((l) => l.status === stage.key)
                        const stageValue = stageLeads.reduce((s, l) => s + l.estimatedValue, 0)
                        return (
                            <div key={stage.key} className="flex-shrink-0 w-80">
                                <div className={cn('glass-card p-3 mb-3 border-t-2', stage.color)}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={cn('w-2 h-2 rounded-full', stage.dot)} />
                                            <span className="text-sm font-semibold">{stage.label}</span>
                                        </div>
                                        <span className="badge badge-neutral">{stageLeads.length}</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">{formatCurrency(stageValue)} en valor estimado</p>
                                </div>
                                <div className="space-y-3">
                                    {stageLeads.map((lead) => (
                                        <div key={lead.id} className="glass-card p-4 hover:border-primary/40 transition-all cursor-pointer group">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-sm font-medium group-hover:text-primary transition-colors">
                                                    {lead.companyName || 'Sin Empresa'}
                                                </h3>
                                                <button className="text-muted-foreground hover:text-foreground">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Building2 className="w-3 h-3" />
                                                    <span>{lead.serviceRequested || 'Sin Servicio'}</span>
                                                </div>
                                                {lead.requirementDetail && (
                                                    <p className="text-[10px] text-muted-foreground line-clamp-2">
                                                        {lead.requirementDetail}
                                                    </p>
                                                )}
                                                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                                                    <span className="text-sm font-bold text-foreground">{formatCurrency(lead.estimatedValue)}</span>
                                                    <span className="text-[10px] text-muted-foreground">{formatDate(lead.createdAt.toISOString())}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        className="w-full py-2 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-all"
                                        onClick={() => setShowForm(true)}
                                    >
                                        + Añadir Lead
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* List View */}
            {view === 'list' && (
                <div className="glass-card overflow-hidden">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Empresa</th>
                                <th>Servicio</th>
                                <th>Estado</th>
                                <th>Valor Est.</th>
                                <th>Creado</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leads.map((lead) => (
                                <tr key={lead.id}>
                                    <td className="text-sm font-medium">{lead.companyName}</td>
                                    <td className="text-sm text-muted-foreground">{lead.serviceRequested}</td>
                                    <td>
                                        <span className={cn('badge',
                                            lead.status === 'WON' ? 'badge-success' :
                                                lead.status === 'LOST' ? 'badge-danger' :
                                                    lead.status === 'PROPOSAL' ? 'badge-info' : 'badge-neutral'
                                        )}>
                                            {pipelineStages.find(s => s.key === lead.status)?.label || lead.status}
                                        </span>
                                    </td>
                                    <td className="text-sm font-semibold">{formatCurrency(lead.estimatedValue)}</td>
                                    <td className="text-xs text-muted-foreground">{formatDate(lead.createdAt.toISOString())}</td>
                                    <td className="text-right">
                                        <button className="btn-ghost p-1.5"><MoreHorizontal className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && <LeadForm onClose={() => setShowForm(false)} />}
        </div>
    )
}
