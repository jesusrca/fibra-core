'use client'

import { useState, useOptimistic, startTransition } from 'react'
import { Plus, Building2, MoreHorizontal, Rocket, Loader2, Handshake, Target, Users, Briefcase, Mail, Phone, MapPin, Globe } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { LeadForm } from './lead-form'
import { Lead, LeadStatus, User, Client, Contact } from '@prisma/client'
import { convertLeadToProject, updateLeadStatus } from '@/lib/actions/crm'

interface ComercialClientProps {
    initialLeads: (Lead & { client: any; contact: any })[]
    users: User[]
    clients: Client[]
    contacts: (Contact & { client: any })[]
}

const pipelineStages = [
    { key: LeadStatus.NEW, label: 'Nuevo Lead', color: 'border-blue-500/40', dot: 'bg-blue-500' },
    { key: LeadStatus.CONTACTED, label: 'Contactado', color: 'border-purple-500/40', dot: 'bg-purple-500' },
    { key: LeadStatus.QUALIFIED, label: 'Calificado', color: 'border-[hsl(var(--warning-text))]/40', dot: 'bg-[hsl(var(--warning-text))]' },
    { key: LeadStatus.PROPOSAL, label: 'Propuesta', color: 'border-[hsl(var(--info-text))]/40', dot: 'bg-[hsl(var(--info-text))]' },
    { key: LeadStatus.WON, label: 'Ganado', color: 'border-[hsl(var(--success-text))]/40', dot: 'bg-[hsl(var(--success-text))]' },
] as const

export function ComercialClient({ initialLeads, users, clients, contacts }: ComercialClientProps) {
    const [activeTab, setActiveTab] = useState<'leads' | 'contacts' | 'companies'>('leads')
    const [view, setView] = useState<'pipeline' | 'list'>('pipeline')
    const [showForm, setShowForm] = useState(false)
    const [convertingId, setConvertingId] = useState<string | null>(null)
    const [selectedLead, setSelectedLead] = useState<(Lead & { client: any; contact: any }) | null>(null)
    const [showEditForm, setShowEditForm] = useState(false)
    const [draggingId, setDraggingId] = useState<string | null>(null)

    // Optimistic UI for Leads
    const [optimisticLeads, addOptimisticLead] = useOptimistic(
        initialLeads,
        (state, newLeadOrUpdate: any) => {
            // Find if existing
            const index = state.findIndex(l => l.id === newLeadOrUpdate.id)
            if (index !== -1) {
                // Update
                const newState = [...state]
                newState[index] = { ...newState[index], ...newLeadOrUpdate }
                return newState
            } else {
                // Add new (not fully implemented in this simplistic view but good for future)
                return [...state, newLeadOrUpdate]
            }
        }
    )

    const onDragStart = (e: React.DragEvent, leadId: string) => {
        setDraggingId(leadId)
        e.dataTransfer.setData('leadId', leadId)
    }

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const onDrop = async (e: React.DragEvent, status: LeadStatus) => {
        e.preventDefault()
        const leadId = e.dataTransfer.getData('leadId')
        setDraggingId(null)

        if (leadId) {
            const lead = optimisticLeads.find(l => l.id === leadId)
            if (lead && lead.status !== status) {
                // Optimistic Update
                startTransition(() => {
                    addOptimisticLead({ id: leadId, status })
                })

                // Server Action
                const result = await updateLeadStatus(leadId, status)
                if (!result.success) {
                    alert('Error al actualizar: ' + result.error)
                }
            }
        }
    }

    const handleChangeStatus = async (leadId: string, status: LeadStatus) => {
        // Optimistic Update
        startTransition(() => {
            addOptimisticLead({ id: leadId, status })
        })

        if (selectedLead?.id === leadId) {
            const updatedLead = optimisticLeads.find(l => l.id === leadId)
            if (updatedLead) {
                setSelectedLead({ ...updatedLead, status })
            }
        }

        // Server Action
        const result = await updateLeadStatus(leadId, status)
        if (!result.success) {
            alert('Error al actualizar: ' + result.error)
        }
    }

    async function handleConvert(leadId: string) {
        setConvertingId(leadId)
        const defaultDirector = users.find(u => u.role === 'ADMIN' || u.role === 'PROYECTOS') || users[0]
        if (!defaultDirector) {
            alert('No hay directores disponibles')
            setConvertingId(null)
            return
        }

        const result = await convertLeadToProject(leadId, defaultDirector.id)
        if (!result.success) {
            alert(result.error)
        }
        setConvertingId(null)
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold text-foreground font-display">Hub Comercial</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">CRM, Pipeline de ventas y gestión de relaciones</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-primary" onClick={() => setShowForm(true)}>
                        <Plus className="w-4 h-4" /> Nuevo {activeTab === 'leads' ? 'Lead' : activeTab === 'contacts' ? 'Contacto' : 'Cliente'}
                    </button>
                </div>
            </div>

            {/* CRM Tabs */}
            <div className="flex border-b border-border/40 gap-6">
                {[
                    { id: 'leads', label: 'Pipeline / Leads', icon: Target },
                    { id: 'contacts', label: 'Contactos', icon: Users },
                    { id: 'companies', label: 'Empresas / Clientes', icon: Briefcase },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "flex items-center gap-2 px-1 py-4 text-sm font-medium transition-all relative border-b-2",
                            activeTab === tab.id
                                ? "text-primary border-primary"
                                : "text-muted-foreground border-transparent hover:text-foreground"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'leads' && (
                <>
                    <div className="flex justify-end gap-3 items-center">
                        {/* Summary Stats Minimal */}
                        <div className="flex gap-4 mr-auto">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Total Pipeline:</span>
                                <span className="text-sm font-bold">{formatCurrency(optimisticLeads.reduce((s, l) => s + (l.status !== 'WON' ? l.estimatedValue : 0), 0))}</span>
                            </div>
                        </div>

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
                    </div>

                    {view === 'pipeline' ? (
                        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                            {pipelineStages.map((stage) => {
                                const stageLeads = optimisticLeads.filter((l) => l.status === stage.key)
                                const stageValue = stageLeads.reduce((s, l) => s + l.estimatedValue, 0)
                                return (
                                    <div
                                        key={stage.key}
                                        className="flex-shrink-0 w-80"
                                        onDragOver={onDragOver}
                                        onDrop={(e) => onDrop(e, stage.key)}
                                    >
                                        <div className={cn('glass-card p-3 mb-3 border-t-2', stage.color)}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn('w-2 h-2 rounded-full', stage.dot)} />
                                                    <span className="text-sm font-semibold">{stage.label}</span>
                                                </div>
                                                <span className="badge badge-neutral">{stageLeads.length}</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-1">{formatCurrency(stageValue)}</p>
                                        </div>
                                        <div className="space-y-3">
                                            {stageLeads.map((lead) => (
                                                <div
                                                    key={lead.id}
                                                    draggable
                                                    onDragStart={(e) => onDragStart(e, lead.id)}
                                                    onClick={() => setSelectedLead(lead)}
                                                    className={cn(
                                                        "glass-card p-4 hover:border-primary/40 transition-all cursor-pointer group",
                                                        draggingId === lead.id && "opacity-40 grayscale"
                                                    )}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex flex-col">
                                                            <h3 className="text-sm font-medium group-hover:text-primary transition-colors">
                                                                {lead.companyName || 'Sin Empresa'}
                                                            </h3>
                                                            {lead.clientId && (
                                                                <span className="text-[9px] text-success font-bold uppercase tracking-wider">Cliente Existente</span>
                                                            )}
                                                            <div className="mt-2">
                                                                <select
                                                                    value={lead.status}
                                                                    onChange={(e) => { e.stopPropagation(); handleChangeStatus(lead.id, e.target.value as LeadStatus); }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className={cn(
                                                                        "text-[10px] bg-muted/50 border-none rounded px-1.5 py-0.5 font-bold uppercase tracking-tighter cursor-pointer hover:bg-muted transition-colors focus:ring-0",
                                                                        lead.status === 'WON' ? 'text-success' :
                                                                            lead.status === 'LOST' ? 'text-danger' :
                                                                                'text-muted-foreground'
                                                                    )}
                                                                >
                                                                    {pipelineStages.map(s => (
                                                                        <option key={s.key} value={s.key}>{s.label}</option>
                                                                    ))}
                                                                    <option value={LeadStatus.LOST}>Perdido</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            {(lead.status === 'PROPOSAL' || lead.status === 'QUALIFIED') && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleConvert(lead.id); }}
                                                                    disabled={convertingId === lead.id}
                                                                    className="p-1 hover:bg-success/10 text-success rounded transition-colors"
                                                                    title="Convertir a Proyecto"
                                                                >
                                                                    {convertingId === lead.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
                                                                </button>
                                                            )}
                                                            <button className="text-muted-foreground hover:text-foreground">
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <Building2 className="w-3 h-3" />
                                                            <span>{lead.serviceRequested || 'Sin Servicio'}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between pt-2 border-t border-border/40">
                                                            <span className="text-sm font-bold text-foreground">{formatCurrency(lead.estimatedValue)}</span>
                                                            <span className="text-[10px] text-muted-foreground">{formatDate(lead.createdAt)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="glass-card table-container">
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
                                    {optimisticLeads.map((lead) => (
                                        <tr key={lead.id}>
                                            <td className="text-sm font-medium whitespace-nowrap">{lead.companyName}</td>
                                            <td className="text-sm text-muted-foreground whitespace-nowrap">{lead.serviceRequested}</td>
                                            <td className="whitespace-nowrap">
                                                <select
                                                    value={lead.status}
                                                    onChange={(e) => handleChangeStatus(lead.id, e.target.value as LeadStatus)}
                                                    className={cn(
                                                        'bg-transparent border-none text-xs font-semibold focus:ring-0 cursor-pointer rounded-full px-2 py-0.5',
                                                        lead.status === 'WON' ? 'text-success bg-success/10' :
                                                            lead.status === 'LOST' ? 'text-danger bg-danger/10' :
                                                                lead.status === 'PROPOSAL' ? 'text-info bg-info/10' : 'text-primary bg-primary/10'
                                                    )}
                                                    disabled={false}
                                                >
                                                    {pipelineStages.map(s => (
                                                        <option key={s.key} value={s.key} className="bg-card text-foreground">{s.label}</option>
                                                    ))}
                                                    <option value={LeadStatus.LOST} className="bg-card text-foreground">Perdido</option>
                                                </select>
                                            </td>
                                            <td className="text-sm font-semibold whitespace-nowrap">{formatCurrency(lead.estimatedValue)}</td>
                                            <td className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(lead.createdAt)}</td>
                                            <td className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {(lead.status === 'PROPOSAL' || lead.status === 'QUALIFIED') && (
                                                        <button
                                                            onClick={() => handleConvert(lead.id)}
                                                            disabled={convertingId === lead.id}
                                                            className="btn-ghost p-1.5 text-success"
                                                        >
                                                            {convertingId === lead.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
                                                        </button>
                                                    )}
                                                    <button className="btn-ghost p-1.5"><MoreHorizontal className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'contacts' && (
                <div className="glass-card table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Empresa</th>
                                <th>Email</th>
                                <th>País</th>
                                <th>Especialidad</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contacts.map((contact) => (
                                <tr key={contact.id} className="hover:bg-primary/5 transition-colors cursor-pointer">
                                    <td className="whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                                {contact.firstName?.[0] || 'C'}{contact.lastName?.[0] || ''}
                                            </div>
                                            <span className="text-sm font-medium">{contact.firstName} {contact.lastName}</span>
                                        </div>
                                    </td>
                                    <td className="text-sm text-muted-foreground whitespace-nowrap">{contact.client?.name || '-'}</td>
                                    <td className="text-sm text-muted-foreground whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-3 h-3" />
                                            {contact.email}
                                        </div>
                                    </td>
                                    <td className="text-sm text-muted-foreground whitespace-nowrap">{contact.country || '-'}</td>
                                    <td className="text-sm text-muted-foreground whitespace-nowrap">
                                        <span className="badge badge-neutral">{contact.specialty || 'General'}</span>
                                    </td>
                                    <td className="text-right">
                                        <button className="btn-ghost p-1.5"><MoreHorizontal className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'companies' && (
                <div className="glass-card table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Empresa</th>
                                <th>RUC/ID</th>
                                <th>Industria</th>
                                <th>País</th>
                                <th>Email Principal</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map((client) => (
                                <tr key={client.id} className="hover:bg-primary/5 transition-colors cursor-pointer">
                                    <td className="whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-gold-500/10 flex items-center justify-center text-gold-500">
                                                <Briefcase className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium">{client.name}</span>
                                        </div>
                                    </td>
                                    <td className="text-sm text-muted-foreground whitespace-nowrap">{client.taxId || '-'}</td>
                                    <td className="text-sm text-muted-foreground whitespace-nowrap">{client.industry || '-'}</td>
                                    <td className="text-sm text-muted-foreground whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-3 h-3" />
                                            {client.country || '-'}
                                        </div>
                                    </td>
                                    <td className="text-sm text-muted-foreground whitespace-nowrap">{client.mainEmail || '-'}</td>
                                    <td className="text-right">
                                        <button className="btn-ghost p-1.5"><MoreHorizontal className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && <LeadForm clients={clients} onClose={() => setShowForm(false)} />}
            {showEditForm && selectedLead && (
                <LeadForm
                    clients={clients}
                    initialData={selectedLead}
                    onClose={() => {
                        setShowEditForm(false)
                        setSelectedLead(null)
                    }}
                />
            )}

            {/* Lead Detail Modal */}
            {selectedLead && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setSelectedLead(null)}>
                    <div className="glass-card p-8 w-full max-w-2xl mx-4 relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelectedLead(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-xl">✕</button>

                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <Target className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-foreground">{selectedLead.companyName}</h2>
                                <div className="flex items-center gap-3 mt-1">
                                    <select
                                        value={selectedLead.status}
                                        onChange={(e) => handleChangeStatus(selectedLead.id, e.target.value as LeadStatus)}
                                        className={cn(
                                            'bg-transparent border border-border/60 text-xs font-bold uppercase tracking-wider focus:ring-2 focus:ring-primary/40 cursor-pointer rounded-lg px-3 py-1.5',
                                            selectedLead.status === 'WON' ? 'text-success border-success/40' :
                                                selectedLead.status === 'LOST' ? 'text-danger border-danger/40' :
                                                    selectedLead.status === 'PROPOSAL' ? 'text-info border-info/40' : 'text-primary border-primary/40'
                                        )}
                                    >
                                        {pipelineStages.map(s => (
                                            <option key={s.key} value={s.key} className="bg-card text-foreground">{s.label}</option>
                                        ))}
                                        <option value={LeadStatus.LOST} className="bg-card text-foreground text-danger">Lead Perdido</option>
                                    </select>
                                    <span className="text-xs text-muted-foreground ml-2">ID: {selectedLead.id.substring(0, 8)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mb-8">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Servicio Solicitado</p>
                                    <p className="text-sm font-medium">{selectedLead.serviceRequested}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Valor Estimado</p>
                                    <p className="text-xl font-bold text-primary">{formatCurrency(selectedLead.estimatedValue)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Fecha de Creación</p>
                                    <p className="text-sm">{formatDate(selectedLead.createdAt)}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Contacto Principal</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                                            {selectedLead.contact?.firstName?.[0] || 'C'}
                                        </div>
                                        <span className="text-sm font-medium">{selectedLead.contact?.firstName} {selectedLead.contact?.lastName || ''}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 ml-8">{selectedLead.contact?.email || 'Sin email'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Requerimientos Detallados</p>
                                    <div className="p-3 bg-muted/30 rounded-lg border border-border/40 min-h-[80px]">
                                        <p className="text-xs text-muted-foreground italic">
                                            {selectedLead.requirementDetail || 'No hay detalles específicos registrados para este lead.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-6 border-t border-border/40">
                            {(selectedLead.status === 'PROPOSAL' || selectedLead.status === 'QUALIFIED') && (
                                <button
                                    className="btn-primary flex-1 justify-center gap-2"
                                    onClick={() => handleConvert(selectedLead.id)}
                                >
                                    <Rocket className="w-4 h-4" /> Convertir a Proyecto
                                </button>
                            )}
                            <button
                                className="btn-secondary flex-1 justify-center"
                                onClick={() => setShowEditForm(true)}
                            >
                                Editar Información
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
