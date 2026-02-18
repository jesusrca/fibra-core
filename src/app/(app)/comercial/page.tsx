'use client'

import { useState } from 'react'
import { Plus, Search, Mail, Phone, Building2, MoreHorizontal, User, FileText, ArrowRight } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { mockLeads, type Lead } from '@/lib/mock-data'

const pipelineStages = [
    { key: 'new', label: 'Nuevo Lead', color: 'border-blue-500/40', dot: 'bg-blue-400' },
    { key: 'contacted', label: 'Contactado', color: 'border-purple-500/40', dot: 'bg-purple-400' },
    { key: 'qualified', label: 'Calificado', color: 'border-gold-500/40', dot: 'bg-gold-400' },
    { key: 'proposal', label: 'Propuesta', color: 'border-electric-500/40', dot: 'bg-electric-400' },
    { key: 'won', label: 'Ganado', color: 'border-emerald-500/40', dot: 'bg-emerald-400' },
] as const

export default function ComercialPage() {
    const [view, setView] = useState<'pipeline' | 'list'>('pipeline')
    const [showForm, setShowForm] = useState(false)

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Gestión Comercial</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Pipeline de ventas y gestión de clientes</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex border border-border rounded-lg overflow-hidden">
                        {(['pipeline', 'list'] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={cn('px-3 py-1.5 text-xs font-medium transition-all', view === v ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}
                            >
                                {v === 'pipeline' ? '⬛ Pipeline' : '☰ Lista'}
                            </button>
                        ))}
                    </div>
                    <button className="btn-primary" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Nuevo Lead</button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Valor del Pipeline', value: formatCurrency(mockLeads.reduce((s, l) => s + (l.status !== 'won' && l.status !== 'lost' ? l.value : 0), 0)), color: 'text-electric-400' },
                    { label: 'Tasa de Cierre', value: '72%', color: 'text-emerald-400' },
                    { label: 'Leads Activos', value: mockLeads.filter(l => l.status !== 'won' && l.status !== 'lost').length, color: 'text-gold-400' },
                    { label: 'Ventas del Mes', value: formatCurrency(22000), color: 'text-foreground' },
                ].map((s) => (
                    <div key={s.label} className="glass-card p-4">
                        <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Pipeline View */}
            {view === 'pipeline' && (
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    {pipelineStages.map((stage) => {
                        const stageLeads = mockLeads.filter((l) => l.status === stage.key)
                        const stageValue = stageLeads.reduce((s, l) => s + l.value, 0)
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
                                                <h3 className="text-sm font-medium group-hover:text-primary transition-colors">{lead.name}</h3>
                                                <button className="text-muted-foreground hover:text-foreground">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Building2 className="w-3 h-3" />
                                                    <span>{lead.company}</span>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground line-clamp-2">
                                                    Requerimiento: Identidad visual completa y estrategia de lanzamiento para nueva línea de productos.
                                                </p>
                                                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                                                    <span className="text-xs font-bold text-foreground">{formatCurrency(lead.value)}</span>
                                                    <span className="text-[10px] text-muted-foreground">{formatDate(lead.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button className="w-full py-2 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-all">
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
                                <th>Contacto</th>
                                <th>Empresa</th>
                                <th>Estado</th>
                                <th>Valor Est.</th>
                                <th>Fuente</th>
                                <th>Creado</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockLeads.map((lead) => (
                                <tr key={lead.id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                                                {lead.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{lead.name}</p>
                                                <p className="text-[10px] text-muted-foreground">{lead.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="text-sm text-muted-foreground">{lead.company}</td>
                                    <td>
                                        <span className={cn('badge',
                                            lead.status === 'won' ? 'badge-success' :
                                                lead.status === 'lost' ? 'badge-danger' :
                                                    lead.status === 'proposal' ? 'badge-info' : 'badge-neutral'
                                        )}>
                                            {pipelineStages.find(s => s.key === lead.status)?.label || lead.status}
                                        </span>
                                    </td>
                                    <td className="text-sm font-semibold">{formatCurrency(lead.value)}</td>
                                    <td className="text-xs text-muted-foreground">{lead.source}</td>
                                    <td className="text-xs text-muted-foreground">{formatDate(lead.createdAt)}</td>
                                    <td className="text-right">
                                        <button className="btn-ghost p-1.5"><MoreHorizontal className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal for New Lead (Simplified) */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowForm(false)}>
                    <div className="glass-card p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Nuevo Lead / Cotización</h2>
                            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">✕</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="form-label">Nombre del Contacto</label>
                                <input type="text" className="form-input" placeholder="Nombre completo" />
                            </div>
                            <div>
                                <label className="form-label">Empresa</label>
                                <input type="text" className="form-input" placeholder="Nombre de la empresa" />
                            </div>
                            <div>
                                <label className="form-label">Email</label>
                                <input type="email" className="form-input" placeholder="correo@empresa.com" />
                            </div>
                            <div>
                                <label className="form-label">Valor Estimado</label>
                                <input type="number" className="form-input" placeholder="0.00" />
                            </div>
                            <div>
                                <label className="form-label">Fuente</label>
                                <select className="form-input">
                                    <option>Web</option>
                                    <option>LinkedIn</option>
                                    <option>Referido</option>
                                    <option>Instagram</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="form-label">Requerimiento / Nota</label>
                                <textarea className="form-input min-h-[100px]" placeholder="Describe lo que el cliente necesita..."></textarea>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button className="flex-1 btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                            <button className="flex-1 btn-primary justify-center">Crear Lead</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
