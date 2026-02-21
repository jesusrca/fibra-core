'use client'

import { useState, useOptimistic, startTransition, useEffect } from 'react'
import { Plus, Building2, MoreHorizontal, Rocket, Loader2, Target, Users, Briefcase, Mail, MapPin, FileText, Receipt, Trash2 } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { LeadForm } from './lead-form'
import { ContactForm } from './contact-form'
import { CompanyForm } from './company-form'
import { QuoteForm } from './quote-form'
import { InvoiceForm } from './invoice-form'
import { InvoiceStatus, Lead, LeadStatus, User, Client, Contact } from '@prisma/client'
import { convertLeadToProject, createLeadActivity, deleteClient, deleteContact, syncInvoicesFromMilestones, updateInvoiceStatus, updateLeadStatus, updateQuoteStatus } from '@/lib/actions/crm'
import { useRouter } from 'next/navigation'

type QuoteStatus = 'PENDING' | 'SENT' | 'ACCEPTED' | 'REJECTED'

interface QuoteItem {
    id: string
    leadId: string
    proposalDetail: string | null
    servicesOffered: string | null
    budget: number
    paymentMethod: string | null
    paymentCountry: string | null
    status: QuoteStatus
    installmentsCount: number
    createdAt: Date
    sentDate: Date | null
    acceptedDate: Date | null
    rejectedDate: Date | null
    lead: {
        id: string
        companyName: string | null
        serviceRequested: string | null
    }
}

interface InvoiceItem {
    id: string
    invoiceNumber: string
    fileUrl: string | null
    fileRef?: string | null
    quoteId: string | null
    clientId: string
    projectId: string | null
    amount: number
    status: InvoiceStatus
    issueDate: Date
    dueDate: Date | null
    paymentMethod: string | null
    paymentBank?: string | null
    paymentCountry: string | null
    client: { id: string; name: string } | null
    project: { id: string; name: string } | null
    quote: { id: string; lead: { companyName: string | null } } | null
}

interface ProjectItem {
    id: string
    name: string
    clientId?: string | null
    clientName?: string | null
    quoteId?: string | null
}

interface BankItem {
    id: string
    name: string
}

interface LeadActivityItem {
    id: string
    type: string
    description: string
    date: Date
    contact: { id: string; firstName: string; lastName: string } | null
}

type LeadRow = Lead & {
    client: { id: string; name: string } | null
    contact: { id: string; firstName: string; lastName: string; email: string } | null
    activities: LeadActivityItem[]
}

interface ComercialClientProps {
    initialLeads: LeadRow[]
    users: User[]
    clients: Client[]
    contacts: (Contact & {
        client: { id: string; name: string }
        emailMessages?: Array<{
            id: string
            subject: string | null
            snippet: string | null
            fromEmail: string
            receivedAt: Date | string
            project: { id: string; name: string } | null
        }>
    })[]
    quotes: QuoteItem[]
    invoices: InvoiceItem[]
    projects: ProjectItem[]
    banks: BankItem[]
    invoicesToIssueProjection: Array<{
        projectId: string
        projectName: string
        pendingToIssue: number
        installmentAmount: number
        totalAmount: number
    }>
    initialTab?: 'leads' | 'contacts' | 'companies' | 'quotes' | 'invoices'
    editClientId?: string
    focusContactId?: string
    leadFilters: { q: string; status: string; page: number; pageSize: number }
    leadPagination: { total: number; totalPages: number }
    leadInsights: {
        weightedPipeline: number
        forecastByMonth: Array<{ key: string; label: string; value: number }>
        goalsVsReal: Array<{ source: string; goal: number; forecast: number; real: number }>
    }
}

const pipelineStages = [
    { key: LeadStatus.NEW, label: 'Nuevo Lead', color: 'border-blue-500/40', dot: 'bg-blue-500' },
    { key: LeadStatus.CONTACTED, label: 'Contactado', color: 'border-purple-500/40', dot: 'bg-purple-500' },
    { key: LeadStatus.QUALIFIED, label: 'Calificado', color: 'border-[hsl(var(--warning-text))]/40', dot: 'bg-[hsl(var(--warning-text))]' },
    { key: LeadStatus.PROPOSAL, label: 'Propuesta', color: 'border-[hsl(var(--info-text))]/40', dot: 'bg-[hsl(var(--info-text))]' },
    { key: LeadStatus.WON, label: 'Ganado', color: 'border-[hsl(var(--success-text))]/40', dot: 'bg-[hsl(var(--success-text))]' },
] as const

export function ComercialClient({
    initialLeads,
    users,
    clients,
    contacts,
    quotes,
    invoices,
    projects,
    banks,
    invoicesToIssueProjection,
    initialTab,
    editClientId,
    focusContactId,
    leadFilters,
    leadPagination,
    leadInsights
}: ComercialClientProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'leads' | 'contacts' | 'companies' | 'quotes' | 'invoices'>(initialTab || 'leads')
    const [view, setView] = useState<'pipeline' | 'list'>('pipeline')
    const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null)
    const [activityType, setActivityType] = useState('NOTE')
    const [activityDescription, setActivityDescription] = useState('')
    const [savingActivity, setSavingActivity] = useState(false)
    const [convertingId, setConvertingId] = useState<string | null>(null)

    const [showLeadForm, setShowLeadForm] = useState(false)
    const [showLeadEditForm, setShowLeadEditForm] = useState(false)
    const [showContactForm, setShowContactForm] = useState(false)
    const [showCompanyForm, setShowCompanyForm] = useState(false)
    const [showQuoteForm, setShowQuoteForm] = useState(false)
    const [showInvoiceForm, setShowInvoiceForm] = useState(false)

    const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
    const [selectedCompany, setSelectedCompany] = useState<Client | null>(null)
    const [selectedQuote, setSelectedQuote] = useState<QuoteItem | null>(null)
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null)
    const [syncingInvoices, setSyncingInvoices] = useState(false)
    const [deletingContactId, setDeletingContactId] = useState<string | null>(null)
    const [deletingClientId, setDeletingClientId] = useState<string | null>(null)
    const [leadSearch, setLeadSearch] = useState(leadFilters.q || '')
    const [leadStatusFilter, setLeadStatusFilter] = useState(leadFilters.status || 'ALL')

    const [quoteRows, setQuoteRows] = useState(quotes)
    const [invoiceRows, setInvoiceRows] = useState(invoices)

    const [optimisticLeads, addOptimisticLead] = useOptimistic(
        initialLeads,
        (state, update: { id: string; status: LeadStatus }) => {
            const idx = state.findIndex((lead) => lead.id === update.id)
            if (idx === -1) return state
            const cloned = [...state]
            cloned[idx] = { ...cloned[idx], status: update.status }
            return cloned
        }
    )

    useEffect(() => {
        setQuoteRows(quotes)
    }, [quotes])

    useEffect(() => {
        setInvoiceRows(invoices)
    }, [invoices])

    useEffect(() => {
        if (!initialTab) return
        setActiveTab(initialTab)
    }, [initialTab])

    useEffect(() => {
        if (!editClientId) return
        const clientToEdit = clients.find((client) => client.id === editClientId)
        if (!clientToEdit) return
        setActiveTab('companies')
        setSelectedCompany(clientToEdit)
        setShowCompanyForm(true)
    }, [editClientId, clients])

    useEffect(() => {
        if (!focusContactId) return
        const contactToEdit = contacts.find((contact) => contact.id === focusContactId)
        if (!contactToEdit) return
        setActiveTab('contacts')
        setSelectedContact(contactToEdit)
        setShowContactForm(true)
    }, [focusContactId, contacts])

    const openCreateModal = () => {
        if (activeTab === 'leads') setShowLeadForm(true)
        if (activeTab === 'contacts') {
            setSelectedContact(null)
            setShowContactForm(true)
        }
        if (activeTab === 'companies') {
            setSelectedCompany(null)
            setShowCompanyForm(true)
        }
        if (activeTab === 'quotes') {
            setSelectedQuote(null)
            setShowQuoteForm(true)
        }
        if (activeTab === 'invoices') {
            setSelectedInvoice(null)
            setShowInvoiceForm(true)
        }
    }

    const createButtonLabel = activeTab === 'leads'
        ? 'Lead'
        : activeTab === 'contacts'
            ? 'Contacto'
            : activeTab === 'companies'
                ? 'Empresa'
                : activeTab === 'quotes'
                    ? 'Cotización'
                    : 'Factura'

    const getLeadCurrency = (lead: { currency?: string | null }) =>
        (lead.currency || '').toUpperCase() === 'PEN' ? 'PEN' : 'USD'

    const handleChangeStatus = async (leadId: string, status: LeadStatus) => {
        startTransition(() => {
            addOptimisticLead({ id: leadId, status })
        })
        const result = await updateLeadStatus(leadId, status)
        if (!result.success) alert(result.error)
    }

    const handleQuoteStatus = async (quoteId: string, status: QuoteStatus) => {
        setQuoteRows((rows) => rows.map((row) => row.id === quoteId ? { ...row, status } : row))
        const result = await updateQuoteStatus(quoteId, status)
        if (!result.success) alert(result.error)
    }

    const handleInvoiceStatus = async (invoiceId: string, status: InvoiceStatus) => {
        setInvoiceRows((rows) => rows.map((row) => row.id === invoiceId ? { ...row, status } : row))
        const result = await updateInvoiceStatus(invoiceId, status)
        if (!result.success) alert(result.error)
    }

    const handleSyncInvoicesFromMilestones = async () => {
        if (syncingInvoices) return
        setSyncingInvoices(true)
        const result = await syncInvoicesFromMilestones()
        if (!result.success) {
            alert(result.error)
        } else {
            alert(`Sincronización completada. Facturas creadas: ${result.createdCount}`)
        }
        setSyncingInvoices(false)
    }

    const handleConvert = async (leadId: string) => {
        setConvertingId(leadId)
        const defaultDirector = users.find((user) => user.role === 'ADMIN' || user.role === 'PROYECTOS') || users[0]
        if (!defaultDirector) {
            alert('No hay directores disponibles')
            setConvertingId(null)
            return
        }
        const result = await convertLeadToProject(leadId, defaultDirector.id)
        if (!result.success) alert(result.error)
        if (result.success) {
            startTransition(() => {
                addOptimisticLead({ id: leadId, status: LeadStatus.WON })
            })
            router.refresh()
        }
        setConvertingId(null)
    }

    const handleCreateActivity = async () => {
        if (!selectedLead) return
        const description = activityDescription.trim()
        if (!description || savingActivity) return

        setSavingActivity(true)
        const result = await createLeadActivity({
            leadId: selectedLead.id,
            type: activityType,
            description,
            contactId: selectedLead.contact?.id || undefined
        })

        if (!result.success || !result.activity) {
            alert(result.error || 'No se pudo guardar la actividad')
            setSavingActivity(false)
            return
        }

        const newActivity = result.activity as LeadActivityItem
        setSelectedLead((prev) => {
            if (!prev || prev.id !== selectedLead.id) return prev
            return { ...prev, activities: [newActivity, ...(prev.activities || [])] }
        })
        setActivityDescription('')
        setActivityType('NOTE')
        setSavingActivity(false)
    }

    const handleDeleteContact = async (id: string) => {
        if (!confirm('¿Eliminar este contacto? Esta acción no se puede deshacer.')) return
        setDeletingContactId(id)
        const result = await deleteContact(id)
        if (!result.success) alert(result.error)
        setDeletingContactId(null)
    }

    const handleDeleteClient = async (id: string) => {
        if (!confirm('¿Eliminar esta empresa? Esta acción no se puede deshacer.')) return
        setDeletingClientId(id)
        const result = await deleteClient(id)
        if (!result.success) alert(result.error)
        setDeletingClientId(null)
    }

    const applyLeadFilters = () => {
        const params = new URLSearchParams()
        if (leadSearch.trim()) params.set('q', leadSearch.trim())
        if (leadStatusFilter && leadStatusFilter !== 'ALL') params.set('status', leadStatusFilter)
        params.set('page', '1')
        params.set('pageSize', String(leadFilters.pageSize || 20))
        router.push(`/comercial?${params.toString()}`)
    }

    const goToLeadsPage = (page: number) => {
        const params = new URLSearchParams()
        if (leadSearch.trim()) params.set('q', leadSearch.trim())
        if (leadStatusFilter && leadStatusFilter !== 'ALL') params.set('status', leadStatusFilter)
        params.set('page', String(page))
        params.set('pageSize', String(leadFilters.pageSize || 20))
        router.push(`/comercial?${params.toString()}`)
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold text-foreground font-display">Hub Comercial</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">CRM, cotizaciones y facturación comercial</p>
                </div>
                <button className="btn-primary" onClick={openCreateModal}>
                    <Plus className="w-4 h-4" /> Nuevo {createButtonLabel}
                </button>
            </div>

            <div className="flex border-b border-border/40 gap-6 overflow-x-auto no-scrollbar">
                {[
                    { id: 'leads', label: 'Pipeline / Leads', icon: Target },
                    { id: 'contacts', label: 'Contactos', icon: Users },
                    { id: 'companies', label: 'Empresas', icon: Briefcase },
                    { id: 'quotes', label: 'Cotizaciones', icon: FileText },
                    { id: 'invoices', label: 'Facturas', icon: Receipt },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            'flex items-center gap-2 px-1 py-4 text-sm font-medium transition-all relative border-b-2 whitespace-nowrap',
                            activeTab === tab.id
                                ? 'text-primary border-primary'
                                : 'text-muted-foreground border-transparent hover:text-foreground'
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'leads' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="glass-card p-4">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Pipeline ponderado</p>
                            <p className="text-2xl font-bold mt-1 text-primary">{formatCurrency(leadInsights.weightedPipeline)}</p>
                        </div>
                        <div className="glass-card p-4">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Leads visibles</p>
                            <p className="text-2xl font-bold mt-1">{leadPagination.total}</p>
                        </div>
                        <div className="glass-card p-4">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Pronóstico próximo mes</p>
                            <p className="text-2xl font-bold mt-1 text-[hsl(var(--success-text))]">
                                {formatCurrency(leadInsights.forecastByMonth[1]?.value || 0)}
                            </p>
                        </div>
                    </div>

                    <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
                        <input
                            className="form-input"
                            placeholder="Buscar leads por empresa, servicio o fuente..."
                            value={leadSearch}
                            onChange={(e) => setLeadSearch(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') applyLeadFilters() }}
                        />
                        <select className="form-input sm:w-56" value={leadStatusFilter} onChange={(e) => setLeadStatusFilter(e.target.value)}>
                            <option value="ALL">Todos los estados</option>
                            <option value="NEW">Nuevo</option>
                            <option value="CONTACTED">Contactado</option>
                            <option value="QUALIFIED">Calificado</option>
                            <option value="PROPOSAL">Propuesta</option>
                            <option value="WON">Ganado</option>
                            <option value="LOST">Perdido</option>
                        </select>
                        <button className="btn-secondary sm:w-32" onClick={applyLeadFilters}>Aplicar</button>
                    </div>

                    <div className="flex justify-end gap-3 items-center">
                        <div className="flex gap-4 mr-auto">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Total Pipeline:</span>
                                <span className="text-sm font-bold">{formatCurrency(optimisticLeads.reduce((sum, lead) => sum + (lead.status !== 'WON' ? lead.estimatedValue : 0), 0))}</span>
                            </div>
                        </div>

                        <div className="flex border border-border rounded-lg overflow-hidden bg-card">
                            {(['pipeline', 'list'] as const).map((option) => (
                                <button
                                    key={option}
                                    onClick={() => setView(option)}
                                    className={cn(
                                        'px-3 py-1.5 text-xs font-medium transition-all',
                                        view === option ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    {option === 'pipeline' ? '⬛ Pipeline' : '☰ Lista'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div className="glass-card p-4">
                            <h3 className="text-sm font-semibold mb-2">Forecast de cierres (3 meses)</h3>
                            <div className="space-y-2">
                                {leadInsights.forecastByMonth.map((item) => (
                                    <div key={item.key} className="flex items-center justify-between text-sm border-b border-border/30 pb-1">
                                        <span className="capitalize">{item.label}</span>
                                        <span className="font-semibold">{formatCurrency(item.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="glass-card p-4">
                            <h3 className="text-sm font-semibold mb-2">Meta vs real por canal</h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                {leadInsights.goalsVsReal.map((row) => (
                                    <div key={row.source} className="text-sm border-b border-border/30 pb-1">
                                        <p className="font-medium">{row.source}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Meta: {formatCurrency(row.goal)} · Forecast: {formatCurrency(row.forecast)} · Real: {formatCurrency(row.real)}
                                        </p>
                                    </div>
                                ))}
                                {leadInsights.goalsVsReal.length === 0 && <p className="text-xs text-muted-foreground">Sin datos suficientes.</p>}
                            </div>
                        </div>
                    </div>

                    {view === 'pipeline' ? (
                        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                            {pipelineStages.map((stage) => {
                                const stageLeads = optimisticLeads.filter((lead) => lead.status === stage.key)
                                const stageValue = stageLeads.reduce((sum, lead) => sum + lead.estimatedValue, 0)
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
                                            <p className="text-[10px] text-muted-foreground mt-1">{formatCurrency(stageValue)}</p>
                                        </div>

                                        <div className="space-y-3">
                                            {stageLeads.map((lead) => (
                                                <div key={lead.id} className="glass-card p-4 hover:border-primary/40 transition-all cursor-pointer group" onClick={() => setSelectedLead(lead)}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex flex-col">
                                                            <h3 className="text-sm font-medium group-hover:text-primary transition-colors">{lead.companyName || 'Sin Empresa'}</h3>
                                                            <div className="mt-2">
                                                                <select
                                                                    value={lead.status}
                                                                    onChange={(e) => {
                                                                        e.stopPropagation()
                                                                        handleChangeStatus(lead.id, e.target.value as LeadStatus)
                                                                    }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="text-[10px] bg-muted/50 border-none rounded px-1.5 py-0.5 font-bold uppercase tracking-tighter cursor-pointer hover:bg-muted transition-colors focus:ring-0"
                                                                >
                                                                    {pipelineStages.map((statusOption) => (
                                                                        <option key={statusOption.key} value={statusOption.key}>{statusOption.label}</option>
                                                                    ))}
                                                                    <option value={LeadStatus.LOST}>Perdido</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                        {(lead.status === 'PROPOSAL' || lead.status === 'QUALIFIED') && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleConvert(lead.id)
                                                                }}
                                                                disabled={convertingId === lead.id}
                                                                className="p-1 hover:bg-success/10 text-success rounded transition-colors"
                                                                title="Convertir a Proyecto"
                                                            >
                                                                {convertingId === lead.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <Building2 className="w-3 h-3" />
                                                            <span>{lead.serviceRequested || 'Sin Servicio'}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between pt-2 border-t border-border/40">
                                                            <span className="text-sm font-bold text-foreground">{formatCurrency(lead.estimatedValue, getLeadCurrency(lead as { currency?: string | null }))}</span>
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
                                            <td className="text-sm font-medium whitespace-nowrap">{lead.companyName || '-'}</td>
                                            <td className="text-sm text-muted-foreground whitespace-nowrap">{lead.serviceRequested || '-'}</td>
                                            <td className="whitespace-nowrap">
                                                <select
                                                    value={lead.status}
                                                    onChange={(e) => handleChangeStatus(lead.id, e.target.value as LeadStatus)}
                                                    className="bg-transparent border-none text-xs font-semibold focus:ring-0 cursor-pointer rounded-full px-2 py-0.5"
                                                >
                                                    {pipelineStages.map((statusOption) => (
                                                        <option key={statusOption.key} value={statusOption.key} className="bg-card text-foreground">{statusOption.label}</option>
                                                    ))}
                                                    <option value={LeadStatus.LOST} className="bg-card text-foreground">Perdido</option>
                                                </select>
                                            </td>
                                            <td className="text-sm font-semibold whitespace-nowrap">{formatCurrency(lead.estimatedValue, getLeadCurrency(lead as { currency?: string | null }))}</td>
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
                                                    <button className="btn-ghost p-1.5" onClick={() => setSelectedLead(lead)}>
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Página {leadFilters.page} de {leadPagination.totalPages}</span>
                        <div className="flex gap-2">
                            <button
                                className="btn-secondary h-8 px-3"
                                disabled={leadFilters.page <= 1}
                                onClick={() => goToLeadsPage(leadFilters.page - 1)}
                            >
                                Anterior
                            </button>
                            <button
                                className="btn-secondary h-8 px-3"
                                disabled={leadFilters.page >= leadPagination.totalPages}
                                onClick={() => goToLeadsPage(leadFilters.page + 1)}
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
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
                                <th>Correos vinculados</th>
                                <th>País</th>
                                <th>Especialidad</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contacts.map((contact) => (
                                <tr key={contact.id} className="hover:bg-primary/5 transition-colors">
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
                                    <td className="text-xs text-muted-foreground">
                                        <div className="space-y-1 max-w-[260px]">
                                            {(contact.emailMessages || []).slice(0, 2).map((mailItem) => (
                                                <div key={mailItem.id} className="rounded-md border border-border/40 px-2 py-1 bg-secondary/20">
                                                    <p className="truncate font-medium text-foreground">{mailItem.subject || '(Sin asunto)'}</p>
                                                    <p className="truncate">{mailItem.snippet || mailItem.fromEmail}</p>
                                                    {mailItem.project?.id && (
                                                        <a href={`/proyectos/${mailItem.project.id}`} className="text-primary hover:underline">
                                                            {mailItem.project.name}
                                                        </a>
                                                    )}
                                                </div>
                                            ))}
                                            {(contact.emailMessages || []).length === 0 && <span>Sin correos</span>}
                                        </div>
                                    </td>
                                    <td className="text-sm text-muted-foreground whitespace-nowrap">{contact.country || '-'}</td>
                                    <td className="text-sm text-muted-foreground whitespace-nowrap">
                                        <span className="badge badge-neutral">{contact.specialty || 'General'}</span>
                                    </td>
                                    <td className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                className="btn-ghost p-1.5 text-danger"
                                                onClick={() => handleDeleteContact(contact.id)}
                                                disabled={deletingContactId === contact.id}
                                                title="Eliminar contacto"
                                            >
                                                {deletingContactId === contact.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                            <button
                                                className="btn-ghost p-1.5"
                                                onClick={() => {
                                                    setSelectedContact(contact)
                                                    setShowContactForm(true)
                                                }}
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </div>
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
                                <tr key={client.id} className="hover:bg-primary/5 transition-colors">
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
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                className="btn-ghost p-1.5 text-danger"
                                                onClick={() => handleDeleteClient(client.id)}
                                                disabled={deletingClientId === client.id}
                                                title="Eliminar empresa"
                                            >
                                                {deletingClientId === client.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                            <button
                                                className="btn-ghost p-1.5"
                                                onClick={() => {
                                                    setSelectedCompany(client)
                                                    setShowCompanyForm(true)
                                                }}
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'quotes' && (
                <div className="glass-card table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Empresa</th>
                                <th>Servicio</th>
                                <th>Presupuesto</th>
                                <th>Estado</th>
                                <th>Fecha</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quoteRows.map((quote) => (
                                <tr key={quote.id}>
                                    <td className="text-xs font-mono">{quote.id.slice(0, 8)}</td>
                                    <td className="text-sm">{quote.lead?.companyName || '-'}</td>
                                    <td className="text-sm text-muted-foreground">{quote.lead?.serviceRequested || '-'}</td>
                                    <td className="text-sm font-semibold">{formatCurrency(quote.budget)}</td>
                                    <td>
                                        <select
                                            value={quote.status}
                                            onChange={(e) => handleQuoteStatus(quote.id, e.target.value as QuoteStatus)}
                                            className="form-input py-1 text-xs"
                                        >
                                            <option value="PENDING">PENDING</option>
                                            <option value="SENT">SENT</option>
                                            <option value="ACCEPTED">ACCEPTED</option>
                                            <option value="REJECTED">REJECTED</option>
                                        </select>
                                    </td>
                                    <td className="text-xs text-muted-foreground">{formatDate(quote.createdAt)}</td>
                                    <td className="text-right">
                                        <button
                                            className="btn-ghost p-1.5"
                                            onClick={() => {
                                                setSelectedQuote(quote)
                                                setShowQuoteForm(true)
                                            }}
                                        >
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {quoteRows.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">No hay cotizaciones registradas.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'invoices' && (
                <div className="space-y-4">
                    <div className="glass-card p-4 border border-primary/20 bg-primary/5">
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">Facturas por emitir (auto por hitos)</h3>
                                <p className="text-xs text-muted-foreground">Si hay hitos completados sin facturar, puedes sincronizar aquí.</p>
                            </div>
                            <button className="btn-primary h-9" onClick={handleSyncInvoicesFromMilestones} disabled={syncingInvoices}>
                                {syncingInvoices ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sincronizar por hitos'}
                            </button>
                        </div>
                        {invoicesToIssueProjection.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                {invoicesToIssueProjection.map((row) => (
                                    <div key={row.projectId} className="flex items-center justify-between border border-border/40 rounded-lg px-3 py-2 bg-background/60">
                                        <div>
                                            <p className="text-sm font-medium">{row.projectName}</p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {row.pendingToIssue} pendiente(s) x {formatCurrency(row.installmentAmount)}
                                            </p>
                                        </div>
                                        <p className="text-sm font-semibold text-primary">{formatCurrency(row.totalAmount)}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">No hay facturas pendientes por emitir según hitos completados.</p>
                        )}
                    </div>

                    <div className="glass-card table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Número</th>
                                    <th>Archivo</th>
                                    <th>Cliente</th>
                                    <th>Proyecto</th>
                                    <th>Monto</th>
                                    <th>Vencimiento</th>
                                    <th>Estado</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoiceRows.map((invoice) => (
                                    <tr key={invoice.id}>
                                        <td className="text-sm font-medium">{invoice.invoiceNumber}</td>
                                        <td className="text-xs">
                                            {invoice.fileUrl ? (
                                                <a href={invoice.fileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                                    Ver PDF
                                                </a>
                                            ) : '-'}
                                        </td>
                                        <td className="text-sm text-muted-foreground">{invoice.client?.name || '-'}</td>
                                        <td className="text-sm text-muted-foreground">{invoice.project?.name || '-'}</td>
                                        <td className="text-sm font-semibold">{formatCurrency(invoice.amount)}</td>
                                        <td className="text-xs text-muted-foreground">{invoice.dueDate ? formatDate(invoice.dueDate) : '-'}</td>
                                        <td>
                                            <select
                                                value={invoice.status}
                                                onChange={(e) => handleInvoiceStatus(invoice.id, e.target.value as InvoiceStatus)}
                                                className="form-input py-1 text-xs"
                                            >
                                                <option value={InvoiceStatus.DRAFT}>DRAFT</option>
                                                <option value={InvoiceStatus.SENT}>SENT</option>
                                                <option value={InvoiceStatus.PAID}>PAID</option>
                                                <option value={InvoiceStatus.OVERDUE}>OVERDUE</option>
                                                <option value={InvoiceStatus.CANCELLED}>CANCELLED</option>
                                            </select>
                                        </td>
                                        <td className="text-right">
                                            <button
                                                className="btn-ghost p-1.5"
                                                onClick={() => {
                                                    setSelectedInvoice(invoice)
                                                    setShowInvoiceForm(true)
                                                }}
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {invoiceRows.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="text-center py-8 text-sm text-muted-foreground">No hay facturas registradas.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showLeadForm && (
                <LeadForm
                    clients={clients}
                    contacts={contacts.map((contact) => ({
                        id: contact.id,
                        firstName: contact.firstName,
                        lastName: contact.lastName,
                        email: contact.email,
                        clientId: contact.clientId
                    }))}
                    onClose={() => setShowLeadForm(false)}
                />
            )}

            {showLeadEditForm && selectedLead && (
                <LeadForm
                    clients={clients}
                    contacts={contacts.map((contact) => ({
                        id: contact.id,
                        firstName: contact.firstName,
                        lastName: contact.lastName,
                        email: contact.email,
                        clientId: contact.clientId
                    }))}
                    initialData={selectedLead}
                    onClose={() => {
                        setShowLeadEditForm(false)
                        setSelectedLead(null)
                    }}
                />
            )}

            {showContactForm && (
                <ContactForm
                    clients={clients}
                    initialData={selectedContact}
                    onClose={() => {
                        setShowContactForm(false)
                        setSelectedContact(null)
                    }}
                />
            )}

            {showCompanyForm && (
                <CompanyForm
                    initialData={selectedCompany}
                    onClose={() => {
                        setShowCompanyForm(false)
                        setSelectedCompany(null)
                    }}
                />
            )}

            {showQuoteForm && (
                <QuoteForm
                    leads={initialLeads.map((lead) => ({
                        id: lead.id,
                        companyName: lead.companyName,
                        serviceRequested: lead.serviceRequested
                    }))}
                    initialData={selectedQuote}
                    onClose={() => {
                        setShowQuoteForm(false)
                        setSelectedQuote(null)
                    }}
                />
            )}

            {showInvoiceForm && (
                <InvoiceForm
                    clients={clients.map((client) => ({ id: client.id, name: client.name }))}
                    projects={projects}
                    banks={banks}
                    quotes={quoteRows.map((quote) => ({
                        id: quote.id,
                        budget: quote.budget,
                        lead: { companyName: quote.lead?.companyName || null }
                    }))}
                    initialData={selectedInvoice}
                    onClose={() => {
                        setShowInvoiceForm(false)
                        setSelectedInvoice(null)
                    }}
                />
            )}

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
                                        className="bg-transparent border border-border/60 text-xs font-bold uppercase tracking-wider focus:ring-2 focus:ring-primary/40 cursor-pointer rounded-lg px-3 py-1.5"
                                    >
                                        {pipelineStages.map((statusOption) => (
                                            <option key={statusOption.key} value={statusOption.key} className="bg-card text-foreground">{statusOption.label}</option>
                                        ))}
                                        <option value={LeadStatus.LOST} className="bg-card text-foreground">Lead Perdido</option>
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
                                    <p className="text-xl font-bold text-primary">{formatCurrency(selectedLead.estimatedValue, getLeadCurrency(selectedLead as { currency?: string | null }))}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Fecha de Creación</p>
                                    <p className="text-sm">{formatDate(selectedLead.createdAt)}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Contacto Principal</p>
                                    <p className="text-sm">{selectedLead.contact ? `${selectedLead.contact.firstName} ${selectedLead.contact.lastName}` : 'Sin contacto'}</p>
                                    <p className="text-xs text-muted-foreground">{selectedLead.contact?.email || ''}</p>
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

                        <div className="pt-6 border-t border-border/40">
                            <div className="mb-4">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2">Actividades del Lead</p>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                    {(selectedLead.activities || []).length === 0 && (
                                        <div className="text-xs text-muted-foreground italic p-2 border border-border/40 rounded-lg bg-muted/20">
                                            Aún no hay actividades registradas.
                                        </div>
                                    )}
                                    {(selectedLead.activities || []).map((activity) => (
                                        <div key={activity.id} className="p-2.5 border border-border/40 rounded-lg bg-muted/20">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] uppercase tracking-wider font-bold text-primary">{activity.type}</span>
                                                <span className="text-[10px] text-muted-foreground">{formatDate(activity.date)}</span>
                                            </div>
                                            <p className="text-xs mt-1">{activity.description}</p>
                                            {activity.contact && (
                                                <p className="text-[10px] text-muted-foreground mt-1">
                                                    Contacto: {activity.contact.firstName} {activity.contact.lastName}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-[160px_1fr_auto] gap-2 mb-6">
                                <select
                                    value={activityType}
                                    onChange={(e) => setActivityType(e.target.value)}
                                    className="form-input text-xs"
                                >
                                    <option value="NOTE">Nota</option>
                                    <option value="CALL">Llamada</option>
                                    <option value="EMAIL">Email</option>
                                    <option value="MEETING">Reunión</option>
                                    <option value="CHAT">Chat</option>
                                </select>
                                <input
                                    value={activityDescription}
                                    onChange={(e) => setActivityDescription(e.target.value)}
                                    placeholder="Agregar actividad o nota..."
                                    className="form-input text-sm"
                                />
                                <button
                                    className="btn-secondary px-4"
                                    onClick={handleCreateActivity}
                                    disabled={savingActivity || !activityDescription.trim()}
                                >
                                    {savingActivity ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                                </button>
                            </div>

                            <div className="flex gap-3">
                            {(selectedLead.status === 'PROPOSAL' || selectedLead.status === 'QUALIFIED') && (
                                <button className="btn-primary flex-1 justify-center gap-2" onClick={() => handleConvert(selectedLead.id)}>
                                    <Rocket className="w-4 h-4" /> Convertir a Proyecto
                                </button>
                            )}
                            <button className="btn-secondary flex-1 justify-center" onClick={() => setShowLeadEditForm(true)}>
                                Editar Información
                            </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
