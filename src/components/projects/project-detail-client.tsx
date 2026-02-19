'use client'

import { useState, useOptimistic, startTransition } from 'react'
import {
    Calendar, CheckCircle2, Clock, MoreHorizontal, Plus,
    ArrowLeft, Users, DollarSign, FileText, LayoutList,
    TrendingUp, TrendingDown, Target
} from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createMilestone, updateMilestoneStatus, createTask, updateTaskStatus } from '@/lib/actions/projects'
import { createTransaction } from '@/lib/actions/accounting'

interface ProjectDetailClientProps {
    project: any
    users: any[]
}

export function ProjectDetailClient({ project, users }: ProjectDetailClientProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'finance'>('overview')
    const [showMilestoneForm, setShowMilestoneForm] = useState(false)
    const [showTaskForm, setShowTaskForm] = useState(false)
    const [showExpenseForm, setShowExpenseForm] = useState(false)
    const [loading, setLoading] = useState(false)

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

            {/* Modals */}
            {showMilestoneForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowMilestoneForm(false)}>
                    <div className="glass-card p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
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
                    <div className="glass-card p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
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
                    <div className="glass-card p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
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
