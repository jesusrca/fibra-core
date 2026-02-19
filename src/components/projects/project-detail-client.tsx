'use client'

import { useState, useOptimistic, startTransition } from 'react'
import {
    CheckCircle2, Clock, Plus,
    ArrowLeft, Users, Target, ReceiptText
} from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createMilestone, updateMilestoneStatus, createTask, updateTaskStatus } from '@/lib/actions/projects'
import { createTransaction } from '@/lib/actions/accounting'
import { createSupplierPayment, createSupplierWork } from '@/lib/actions/suppliers'

interface ProjectDetailClientProps {
    project: any
    users: any[]
    suppliers: Array<{
        id: string
        name: string
        category?: string | null
        city?: string | null
    }>
}

export function ProjectDetailClient({ project, users, suppliers }: ProjectDetailClientProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'finance'>('overview')
    const [showMilestoneForm, setShowMilestoneForm] = useState(false)
    const [showTaskForm, setShowTaskForm] = useState(false)
    const [showExpenseForm, setShowExpenseForm] = useState(false)
    const [showSupplierWorkForm, setShowSupplierWorkForm] = useState(false)
    const [showSupplierPaymentForm, setShowSupplierPaymentForm] = useState(false)
    const [selectedSupplierWorkId, setSelectedSupplierWorkId] = useState<string | null>(null)
    const [supplierInstallments, setSupplierInstallments] = useState(1)
    const [installmentDates, setInstallmentDates] = useState<string[]>([new Date().toISOString().split('T')[0]])
    const [supplierWorkError, setSupplierWorkError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const closeSupplierWorkForm = () => {
        setShowSupplierWorkForm(false)
        setSupplierInstallments(1)
        setInstallmentDates([new Date().toISOString().split('T')[0]])
        setSupplierWorkError(null)
    }

    const [optimisticTasks, addOptimisticTask] = useOptimistic(
        project.tasks || [],
        (state: any[], newTaskOrUpdate: any) => {
            const index = state.findIndex(t => t.id === newTaskOrUpdate.id)
            if (index !== -1) {
                const newState = [...state]
                newState[index] = { ...newState[index], ...newTaskOrUpdate }
                return newState
            }
            return [...state, newTaskOrUpdate]
        }
    )

    const [optimisticMilestones, addOptimisticMilestone] = useOptimistic(
        project.milestones || [],
        (state: any[], newMilestoneOrUpdate: any) => {
            const index = state.findIndex(m => m.id === newMilestoneOrUpdate.id)
            if (index !== -1) {
                const newState = [...state]
                newState[index] = { ...newState[index], ...newMilestoneOrUpdate }
                return newState
            }
            return [...state, newMilestoneOrUpdate]
        }
    )

    // Calculate progress
    const completedMilestones = optimisticMilestones?.filter((m: any) => m.status === 'COMPLETED').length || 0
    const totalMilestones = optimisticMilestones?.length || 0
    const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0

    // Calculate finances
    const income = project.transactions?.filter((t: any) => t.category === 'INCOME').reduce((s: number, t: any) => s + t.amount, 0) || 0
    const expenses = project.transactions?.filter((t: any) => t.category === 'EXPENSE').reduce((s: number, t: any) => s + t.amount, 0) || 0
    const margin = income - expenses
    const supplierWorks = project.suppliers || []
    const supplierCommitted = supplierWorks.reduce((sum: number, work: any) => sum + (work.totalBudget || 0), 0)
    const supplierPayments = supplierWorks.flatMap((work: any) =>
        (work.payments || []).map((payment: any) => ({
            ...payment,
            supplierWork: {
                id: work.id,
                supplierName: work.supplier?.name || work.supplierName,
                serviceProvided: work.serviceProvided
            }
        }))
    )
    const supplierPaid = supplierPayments
        .filter((payment: any) => payment.status === 'PAID')
        .reduce((sum: number, payment: any) => sum + payment.amount, 0)
    const supplierPending = Math.max(supplierCommitted - supplierPaid, 0)
    const issuedInvoicesCount = (project.invoices || []).length
    const milestonesForBilling = Math.max(totalMilestones, 1)
    const installmentEstimate = project.budget / milestonesForBilling
    const invoicesToIssue = Math.max(completedMilestones - issuedInvoicesCount, 0)
    const amountToIssue = invoicesToIssue * installmentEstimate

    const handleCreateMilestone = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        await createMilestone({
            projectId: project.id,
            name: formData.get('name') as string,
            dueDate: new Date(formData.get('dueDate') as string),
            status: 'PENDING'
        })

        setLoading(false)
        setShowMilestoneForm(false)
    }

    const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        await createTask({
            projectId: project.id,
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            priority: formData.get('priority') as string,
            assigneeId: formData.get('assigneeId') as string,
            dueDate: formData.get('dueDate') ? new Date(formData.get('dueDate') as string) : undefined
        })

        setLoading(false)
        setShowTaskForm(false)
    }

    const handleCreateExpense = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        await createTransaction({
            category: 'EXPENSE' as any,
            projectId: project.id,
            amount: parseFloat(formData.get('amount') as string),
            description: formData.get('description') as string,
            date: new Date(formData.get('date') as string),
            subcategory: 'Project Expense'
        })

        setLoading(false)
        setShowExpenseForm(false)
    }

    const handleCreateSupplierWork = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSupplierWorkError(null)
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        const supplierId = (formData.get('supplierId') as string || '').trim() || undefined
        const supplierName = (formData.get('supplierName') as string || '').trim() || undefined

        const normalizedInstallments = Math.max(1, supplierInstallments)
        const validDates = installmentDates.slice(0, normalizedInstallments).filter((date) => !!date)
        if (validDates.length !== normalizedInstallments) {
            setLoading(false)
            setSupplierWorkError('Debes indicar una fecha para cada cuota')
            return
        }

        const result = await createSupplierWork({
            projectId: project.id,
            supplierId,
            supplierName,
            serviceProvided: formData.get('serviceProvided') as string,
            totalBudget: parseFloat(formData.get('totalBudget') as string || '0'),
            installmentsCount: normalizedInstallments,
            installmentDates: validDates.map((date) => new Date(`${date}T00:00:00`))
        })

        setLoading(false)
        if (!result.success) {
            setSupplierWorkError(result.error || 'No se pudo registrar el presupuesto')
            return
        }
        closeSupplierWorkForm()
    }

    const handleCreateSupplierPayment = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!selectedSupplierWorkId) return
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        await createSupplierPayment({
            supplierWorkId: selectedSupplierWorkId,
            amount: parseFloat(formData.get('amount') as string || '0'),
            status: formData.get('status') as string,
            issueDate: formData.get('issueDate') ? new Date(formData.get('issueDate') as string) : undefined,
            paymentDate: formData.get('paymentDate') ? new Date(formData.get('paymentDate') as string) : undefined,
            receiptUrl: ((formData.get('receiptUrl') as string) || '').trim() || undefined,
            description: ((formData.get('description') as string) || '').trim() || undefined
        })

        setLoading(false)
        setShowSupplierPaymentForm(false)
        setSelectedSupplierWorkId(null)
    }

    const toggleMilestone = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED'

        startTransition(() => {
            addOptimisticMilestone({ id, status: newStatus })
        })

        await updateMilestoneStatus(id, newStatus, project.id)
    }

    const toggleTask = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE'

        startTransition(() => {
            addOptimisticTask({ id, status: newStatus })
        })

        await updateTaskStatus(id, newStatus, project.id)
    }

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Link href="/proyectos" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors w-fit">
                    <ArrowLeft className="w-4 h-4" /> Volver a proyectos
                </Link>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-foreground font-display">{project.name}</h1>
                            <span className={cn(
                                'badge',
                                project.status === 'ACTIVE' ? 'badge-info' :
                                    project.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'
                            )}>
                                {project.status}
                            </span>
                        </div>
                        <p className="text-muted-foreground mt-1 flex items-center gap-2">
                            <Users className="w-4 h-4" /> {project.client?.name}
                            <span className="text-border">|</span>
                            <span className="text-xs font-mono bg-secondary px-1.5 py-0.5 rounded">{project.serviceType}</span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="btn-secondary"
                            onClick={() => setShowTaskForm(true)}
                        >
                            <Plus className="w-4 h-4" /> Nueva Tarea
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-border">
                <div className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={cn(
                            "pb-3 text-sm font-medium transition-all relative",
                            activeTab === 'overview' ? "text-primary after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Resumen
                    </button>
                    <button
                        onClick={() => setActiveTab('tasks')}
                        className={cn(
                            "pb-3 text-sm font-medium transition-all relative",
                            activeTab === 'tasks' ? "text-primary after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Tareas y Hitos
                    </button>
                    <button
                        onClick={() => setActiveTab('finance')}
                        className={cn(
                            "pb-3 text-sm font-medium transition-all relative",
                            activeTab === 'finance' ? "text-primary after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Finanzas
                    </button>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        {/* Status Card */}
                        <div className="glass-card p-6">
                            <h3 className="section-title mb-4">Progreso del Proyecto</h3>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-electric-400 rounded-full transition-all duration-1000"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <span className="text-xl font-bold text-foreground">{progress}%</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Inicio</p>
                                    <p className="font-medium">{project.startDate ? formatDate(project.startDate) : 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Deadline</p>
                                    <p className="font-medium">{project.endDate ? formatDate(project.endDate) : 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Director</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                                            {project.director?.name?.[0]}
                                        </div>
                                        <p className="font-medium text-sm">{project.director?.name}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity / Tasks Preview */}
                        <div className="glass-card p-6">
                            <h3 className="section-title mb-4">Entregables Próximos</h3>
                            <div className="space-y-3">
                                {optimisticMilestones?.filter((m: any) => m.status !== 'COMPLETED').slice(0, 3).map((m: any) => (
                                    <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                                        <div className="flex items-center gap-3">
                                            <Target className="w-4 h-4 text-primary" />
                                            <span className="font-medium text-sm">{m.name}</span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">{formatDate(m.dueDate)}</span>
                                    </div>
                                ))}
                                {(!optimisticMilestones || optimisticMilestones.length === 0) && (
                                    <p className="text-muted-foreground text-sm italic">No hay hitos definidos.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Finance Mini Summary */}
                        <div className="glass-card p-6 bg-gradient-to-br from-background to-secondary/20">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="section-title">Balance Financiero</h3>
                                <button className="btn-secondary text-xs" onClick={() => setShowExpenseForm(true)}><Plus className="w-3 h-3" /> Gasto</button>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Presupuesto Total</span>
                                    <span className="font-bold text-lg">{formatCurrency(project.budget)}</span>
                                </div>
                                <div className="h-px bg-border/50" />
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Facturado</span>
                                    <span className="text-success font-medium">+{formatCurrency(income)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Gastos</span>
                                    <span className="text-danger font-medium">-{formatCurrency(expenses)}</span>
                                </div>
                                <div className="pt-2 flex justify-between items-center">
                                    <span className="font-bold text-sm">Margen Actual</span>
                                    <span className={cn("font-bold", margin >= 0 ? "text-success" : "text-danger")}>
                                        {formatCurrency(margin)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'tasks' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Milestones Column */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="section-title">Hitos del Proyecto</h3>
                            <button className="btn-secondary text-xs" onClick={() => setShowMilestoneForm(true)}><Plus className="w-3 h-3" /> Agregar</button>
                        </div>
                        <div className="space-y-3">
                            {optimisticMilestones?.map((m: any) => (
                                <div key={m.id} className={cn("glass-card p-4 flex items-center gap-4 transition-all", m.status === 'COMPLETED' ? "opacity-60" : "")}>
                                    <button
                                        onClick={() => toggleMilestone(m.id, m.status)}
                                        className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                                            m.status === 'COMPLETED' ? "bg-success border-success text-white" : "border-muted-foreground hover:border-primary"
                                        )}
                                    >
                                        {m.status === 'COMPLETED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                    </button>
                                    <div className="flex-1">
                                        <p className={cn("font-medium text-sm", m.status === 'COMPLETED' ? "line-through text-muted-foreground" : "")}>{m.name}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(m.dueDate)}</p>
                                    </div>
                                    <span className={cn("badge", m.status === 'COMPLETED' ? "badge-success" : "badge-neutral")}>
                                        {m.status === 'COMPLETED' ? 'Completado' : 'Pendiente'}
                                    </span>
                                </div>
                            ))}
                            {(!project.milestones || project.milestones.length === 0) && (
                                <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                                    No hay hitos registrados
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tasks Column */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="section-title">Lista de Tareas</h3>
                            <button className="btn-secondary text-xs" onClick={() => setShowTaskForm(true)}><Plus className="w-3 h-3" /> Agregar</button>
                        </div>
                        <div className="space-y-3">
                            {optimisticTasks.map((t: any) => (
                                <div key={t.id} className="glass-card p-4">
                                    <div className="flex items-start gap-3">
                                        <button
                                            onClick={() => toggleTask(t.id, t.status)}
                                            className={cn("mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                                t.status === 'DONE' ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground hover:border-primary"
                                            )}
                                        >
                                            {t.status === 'DONE' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <p className={cn("font-medium text-sm truncate", t.status === 'DONE' ? "line-through text-muted-foreground" : "")}>{t.title}</p>
                                                <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
                                                    t.priority === 'HIGH' ? "bg-red-500/10 text-red-500" :
                                                        t.priority === 'MEDIUM' ? "bg-yellow-500/10 text-yellow-500" : "bg-neutral-500/10 text-neutral-500"
                                                )}>
                                                    {t.priority}
                                                </span>
                                            </div>
                                            {t.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{t.description}</p>}
                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex items-center gap-2">
                                                    {t.assignee && (
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-secondary rounded-full">
                                                            <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                                                                {t.assignee.name[0]}
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground">{t.assignee.name.split(' ')[0]}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {t.dueDate && (
                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                        <Clock className="w-3 h-3" /> {formatDate(t.dueDate)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!optimisticTasks || optimisticTasks.length === 0) && (
                                <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                                    No hay tareas pendientes
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'finance' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                        <div className="kpi-card border border-electric-500/20">
                            <p className="text-xs text-muted-foreground font-medium mb-2">Presupuesto proyecto</p>
                            <p className="text-2xl font-bold text-[hsl(var(--info-text))]">{formatCurrency(project.budget)}</p>
                        </div>
                        <div className="kpi-card border border-red-500/20">
                            <p className="text-xs text-muted-foreground font-medium mb-2">Gasto interno</p>
                            <p className="text-2xl font-bold text-[hsl(var(--danger-text))]">{formatCurrency(expenses)}</p>
                        </div>
                        <div className="kpi-card border border-amber-500/20">
                            <p className="text-xs text-muted-foreground font-medium mb-2">Comprometido proveedores</p>
                            <p className="text-2xl font-bold text-amber-500">{formatCurrency(supplierCommitted)}</p>
                        </div>
                        <div className="kpi-card border border-emerald-500/20">
                            <p className="text-xs text-muted-foreground font-medium mb-2">Pagado proveedores</p>
                            <p className="text-2xl font-bold text-[hsl(var(--success-text))]">{formatCurrency(supplierPaid)}</p>
                        </div>
                        <div className="kpi-card border border-blue-500/20">
                            <p className="text-xs text-muted-foreground font-medium mb-2">Por emitir (hitos)</p>
                            <p className="text-2xl font-bold text-blue-500">{formatCurrency(amountToIssue)}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">{invoicesToIssue} factura(s) sugerida(s)</p>
                        </div>
                    </div>

                    <div className="glass-card p-5">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="section-title">Proyección de Cobranza por Hitos</h3>
                            <span className="badge badge-neutral">Estimado</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Hitos completados: <span className="font-semibold text-foreground">{completedMilestones}</span> ·
                            Facturas registradas: <span className="font-semibold text-foreground">{issuedInvoicesCount}</span> ·
                            Valor por cuota estimado: <span className="font-semibold text-foreground">{formatCurrency(installmentEstimate)}</span>
                        </p>
                    </div>

                    <div className="glass-card p-5">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="section-title">Presupuesto por Proveedor</h3>
                            <button className="btn-secondary text-xs" onClick={() => setShowSupplierWorkForm(true)}>
                                <Plus className="w-3 h-3" /> Agregar proveedor al proyecto
                            </button>
                        </div>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Proveedor</th>
                                        <th>Servicio</th>
                                        <th>Presupuesto</th>
                                        <th>Cuotas</th>
                                        <th>Pagado</th>
                                        <th>Pendiente</th>
                                        <th className="text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {supplierWorks.map((work: any) => {
                                        const paid = (work.payments || [])
                                            .filter((payment: any) => payment.status === 'PAID')
                                            .reduce((sum: number, payment: any) => sum + payment.amount, 0)
                                        const pending = Math.max((work.totalBudget || 0) - paid, 0)
                                        return (
                                            <tr key={work.id}>
                                                <td className="font-medium whitespace-nowrap">{work.supplier?.name || work.supplierName}</td>
                                                <td className="text-muted-foreground whitespace-nowrap">{work.serviceProvided}</td>
                                                <td className="whitespace-nowrap">{formatCurrency(work.totalBudget)}</td>
                                                <td className="whitespace-nowrap">{work.installmentsCount}</td>
                                                <td className="whitespace-nowrap text-[hsl(var(--success-text))]">{formatCurrency(paid)}</td>
                                                <td className="whitespace-nowrap text-amber-500">{formatCurrency(pending)}</td>
                                                <td className="text-right">
                                                    <button
                                                        className="btn-ghost p-1.5"
                                                        onClick={() => {
                                                            setSelectedSupplierWorkId(work.id)
                                                            setShowSupplierPaymentForm(true)
                                                        }}
                                                        title="Registrar pago"
                                                    >
                                                        <ReceiptText className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {supplierWorks.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                                                No hay proveedores asociados a este proyecto.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="glass-card p-5">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="section-title">Pagos y Comprobantes</h3>
                            <span className="badge badge-neutral">{supplierPayments.length} registros</span>
                        </div>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Proveedor</th>
                                        <th>Concepto</th>
                                        <th>Monto</th>
                                        <th>Estado</th>
                                        <th>Fecha pago</th>
                                        <th>Comprobante</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {supplierPayments.map((payment: any) => (
                                        <tr key={payment.id}>
                                            <td className="font-medium whitespace-nowrap">{payment.supplierWork.supplierName}</td>
                                            <td className="text-muted-foreground whitespace-nowrap">{payment.description || payment.supplierWork.serviceProvided}</td>
                                            <td className="whitespace-nowrap">{formatCurrency(payment.amount)}</td>
                                            <td>
                                                <span className={cn(
                                                    'badge',
                                                    payment.status === 'PAID' ? 'badge-success' : payment.status === 'CANCELLED' ? 'badge-danger' : 'badge-warning'
                                                )}>
                                                    {payment.status}
                                                </span>
                                            </td>
                                            <td className="text-muted-foreground whitespace-nowrap">
                                                {payment.paymentDate ? formatDate(payment.paymentDate) : 'Pendiente'}
                                            </td>
                                            <td className="whitespace-nowrap">
                                                {payment.receiptUrl ? (
                                                    <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">
                                                        Ver recibo
                                                    </a>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">Sin recibo</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {supplierPayments.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                                                No hay pagos registrados para proveedores.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="pt-4 mt-4 border-t border-border/40 flex justify-between text-xs text-muted-foreground">
                            <span>Pendiente por pagar proveedores</span>
                            <span className="font-semibold text-amber-500">{formatCurrency(supplierPending)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            {showSupplierWorkForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={closeSupplierWorkForm}>
                    <div className="modal-form-card p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="section-title mb-4">Nuevo Presupuesto de Proveedor</h3>
                        <form onSubmit={handleCreateSupplierWork} className="space-y-4">
                            {supplierWorkError && (
                                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg">
                                    {supplierWorkError}
                                </div>
                            )}
                            <div>
                                <label className="form-label">Proveedor existente (opcional)</label>
                                <select name="supplierId" className="form-input" defaultValue="">
                                    <option value="">Seleccionar proveedor...</option>
                                    {suppliers.map((supplier) => (
                                        <option key={supplier.id} value={supplier.id}>
                                            {supplier.name}{supplier.category ? ` · ${supplier.category}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Nombre proveedor (si no está en lista)</label>
                                <input name="supplierName" type="text" className="form-input" placeholder="Proveedor externo" />
                            </div>
                            <div>
                                <label className="form-label">Servicio</label>
                                <input name="serviceProvided" type="text" className="form-input" required placeholder="Ej: Impresión de piezas" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Presupuesto total</label>
                                    <input name="totalBudget" type="number" step="0.01" className="form-input" required placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="form-label">Cantidad de cuotas</label>
                                    <input
                                        name="installmentsCount"
                                        type="number"
                                        min={1}
                                        className="form-input"
                                        value={supplierInstallments}
                                        onChange={(e) => {
                                            const nextValue = Math.max(1, parseInt(e.target.value || '1', 10))
                                            setSupplierInstallments(nextValue)
                                            setInstallmentDates((prev) => {
                                                const next = [...prev]
                                                while (next.length < nextValue) next.push('')
                                                return next.slice(0, nextValue)
                                            })
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="form-label">Fechas por cuota</label>
                                {Array.from({ length: supplierInstallments }, (_, index) => (
                                    <div key={`installment-date-${index}`} className="grid grid-cols-[88px_1fr] gap-2 items-center">
                                        <span className="text-xs text-muted-foreground">Cuota {index + 1}</span>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={installmentDates[index] || ''}
                                            onChange={(e) => {
                                                const value = e.target.value
                                                setInstallmentDates((prev) => {
                                                    const next = [...prev]
                                                    next[index] = value
                                                    return next
                                                })
                                            }}
                                            required
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" className="btn-secondary flex-1" onClick={closeSupplierWorkForm}>Cancelar</button>
                                <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showSupplierPaymentForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => { setShowSupplierPaymentForm(false); setSelectedSupplierWorkId(null) }}>
                    <div className="modal-form-card p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="section-title mb-4">Registrar Pago a Proveedor</h3>
                        <form onSubmit={handleCreateSupplierPayment} className="space-y-4">
                            <div>
                                <label className="form-label">Monto</label>
                                <input name="amount" type="number" step="0.01" className="form-input" required placeholder="0.00" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Estado</label>
                                    <select name="status" className="form-input" defaultValue="PENDING">
                                        <option value="PENDING">PENDING</option>
                                        <option value="PAID">PAID</option>
                                        <option value="CANCELLED">CANCELLED</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Fecha emisión</label>
                                    <input name="issueDate" type="date" className="form-input" defaultValue={new Date().toISOString().split('T')[0]} />
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Fecha pago (opcional)</label>
                                <input name="paymentDate" type="date" className="form-input" />
                            </div>
                            <div>
                                <label className="form-label">Comprobante (URL)</label>
                                <input name="receiptUrl" type="url" className="form-input" placeholder="https://..." />
                            </div>
                            <div>
                                <label className="form-label">Descripción</label>
                                <input name="description" type="text" className="form-input" placeholder="Detalle del pago" />
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" className="btn-secondary flex-1" onClick={() => { setShowSupplierPaymentForm(false); setSelectedSupplierWorkId(null) }}>Cancelar</button>
                                <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showMilestoneForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowMilestoneForm(false)}>
                    <div className="modal-form-card p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="section-title mb-4">Nuevo Hito</h3>
                        <form onSubmit={handleCreateMilestone} className="space-y-4">
                            <div>
                                <label className="form-label">Nombre del Hito</label>
                                <input name="name" type="text" className="form-input" required placeholder="Ej: Entrega de Mockups" />
                            </div>
                            <div>
                                <label className="form-label">Fecha Límite</label>
                                <input name="dueDate" type="date" className="form-input" required />
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" className="btn-secondary flex-1" onClick={() => setShowMilestoneForm(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showTaskForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowTaskForm(false)}>
                    <div className="modal-form-card p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="section-title mb-4">Nueva Tarea</h3>
                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <div>
                                <label className="form-label">Título</label>
                                <input name="title" type="text" className="form-input" required placeholder="Ej: Revisar textos finales" />
                            </div>
                            <div>
                                <label className="form-label">Descripción</label>
                                <textarea name="description" className="form-input min-h-[80px]" placeholder="Detalles de la tarea..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Prioridad</label>
                                    <select name="priority" className="form-input">
                                        <option value="LOW">Baja</option>
                                        <option value="MEDIUM" selected>Media</option>
                                        <option value="HIGH">Alta</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Asignado a</label>
                                    <select name="assigneeId" className="form-input">
                                        <option value="">Sin asignar</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Fecha Límite (Opcional)</label>
                                <input name="dueDate" type="date" className="form-input" />
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" className="btn-secondary flex-1" onClick={() => setShowTaskForm(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showExpenseForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowExpenseForm(false)}>
                    <div className="modal-form-card p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="section-title mb-4">Nuevo Gasto del Proyecto</h3>
                        <form onSubmit={handleCreateExpense} className="space-y-4">
                            <div>
                                <label className="form-label">Descripción</label>
                                <input name="description" type="text" className="form-input" required placeholder="Ej: Pago a freelance..." />
                            </div>
                            <div>
                                <label className="form-label">Monto</label>
                                <input name="amount" type="number" step="0.01" className="form-input" required placeholder="0.00" />
                            </div>
                            <div>
                                <label className="form-label">Fecha</label>
                                <input name="date" type="date" className="form-input" required defaultValue={new Date().toISOString().split('T')[0]} />
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" className="btn-secondary flex-1" onClick={() => setShowExpenseForm(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
