'use client'

import { useState } from 'react'
import { Plus, Calendar, Users, DollarSign, CheckCircle2 } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { ProjectForm } from './project-form'

const statusColumns = [
    { key: 'PLANNING', label: 'Planeación', color: 'border-purple-500/40', dot: 'bg-purple-500' },
    { key: 'ACTIVE', label: 'Activo', color: 'border-[hsl(var(--info-text))]/40', dot: 'bg-[hsl(var(--info-text))]' },
    { key: 'REVIEW', label: 'Revisión', color: 'border-[hsl(var(--warning-text))]/40', dot: 'bg-[hsl(var(--warning-text))]' },
    { key: 'COMPLETED', label: 'Completado', color: 'border-[hsl(var(--success-text))]/40', dot: 'bg-[hsl(var(--success-text))]' },
] as const

const priorityBadge: Record<string, string> = {
    HIGH: 'badge-danger',
    MEDIUM: 'badge-warning',
    LOW: 'badge-neutral',
}

const priorityLabel: Record<string, string> = {
    HIGH: 'Alta',
    MEDIUM: 'Media',
    LOW: 'Baja',
}

interface ProjectClientProps {
    initialProjects: any[]
    clients: any[]
    users: any[]
}

export function ProjectClient({ initialProjects, clients, users }: ProjectClientProps) {
    const [view, setView] = useState<'kanban' | 'list'>('kanban')
    const [showForm, setShowForm] = useState(false)

    // Calculate progress based on milestones if available
    const getProjectProgress = (project: any) => {
        if (!project.milestones || project.milestones.length === 0) return 0
        const completed = project.milestones.filter((m: any) => m.status === 'COMPLETED').length
        return Math.round((completed / project.milestones.length) * 100)
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Proyectos</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{initialProjects.length} proyectos en total</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex border border-border rounded-lg overflow-hidden h-9 bg-background/50">
                        {(['kanban', 'list'] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={cn(
                                    'px-3 text-xs font-medium transition-all flex items-center gap-1.5',
                                    view === v ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {v === 'kanban' ? '⬛ Kanban' : '☰ Lista'}
                            </button>
                        ))}
                    </div>
                    <button className="btn-primary" onClick={() => setShowForm(true)}>
                        <Plus className="w-4 h-4" /> Nuevo Proyecto
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Proyectos', value: initialProjects.length, color: 'text-foreground' },
                    { label: 'Activos', value: initialProjects.filter((p) => p.status === 'ACTIVE').length, color: 'text-[hsl(var(--info-text))]' },
                    { label: 'En Revisión', value: initialProjects.filter((p) => p.status === 'REVIEW').length, color: 'text-[hsl(var(--warning-text))]' },
                    { label: 'Completados', value: initialProjects.filter((p) => p.status === 'COMPLETED').length, color: 'text-[hsl(var(--success-text))]' },
                ].map((s) => (
                    <div key={s.label} className="glass-card p-5 relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className={cn('text-3xl font-bold tracking-tight', s.color)}>{s.value}</p>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
                        </div>
                        <div className="absolute right-[-10%] bottom-[-20%] opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                            <CheckCircle2 size={80} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Kanban */}
            {view === 'kanban' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
                    {statusColumns.map((col) => {
                        const colProjects = initialProjects.filter((p) => p.status === col.key)
                        return (
                            <div key={col.key} className="flex flex-col gap-4">
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2">
                                        <div className={cn('w-2.5 h-2.5 rounded-full shadow-[0_0_8px] shadow-current', col.dot.replace('bg-', 'text-'))} />
                                        <span className="text-sm font-bold uppercase tracking-wider">{col.label}</span>
                                    </div>
                                    <span className="text-[10px] bg-secondary border border-border px-1.5 py-0.5 rounded font-mono text-muted-foreground uppercase">
                                        {colProjects.length} items
                                    </span>
                                </div>

                                <div className="space-y-4 min-h-[500px] p-2 bg-secondary/10 rounded-xl border border-dashed border-border/40">
                                    {colProjects.map((p) => {
                                        const progress = getProjectProgress(p)
                                        return (
                                            <div
                                                key={p.id}
                                                className="glass-card p-4 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer group"
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-2.5">
                                                    <h3 className="text-sm font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">{p.name}</h3>
                                                </div>

                                                <p className="text-[11px] font-medium text-muted-foreground mb-4 flex items-center gap-1.5">
                                                    <Users size={12} /> {p.client?.name || 'Compañía Desconocida'}
                                                </p>

                                                <div className="space-y-2 mb-4">
                                                    <div className="flex justify-between text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                                                        <span>Progreso</span>
                                                        <span>{progress}%</span>
                                                    </div>
                                                    <div className="w-full bg-background/50 rounded-full h-1.5 overflow-hidden border border-border/20">
                                                        <div
                                                            className="h-full rounded-full bg-gradient-to-r from-primary to-electric-400 transition-all duration-500"
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-3 border-t border-border/40">
                                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                                                        <Calendar size={12} className="text-primary/60" />
                                                        {p.deadline ? formatDate(p.deadline) : 'Sin fecha'}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-foreground">
                                                        {formatCurrency(p.budget)}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}

                                    {colProjects.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-24 text-muted-foreground/40 italic text-xs">
                                            Sin proyectos
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* List view */}
            {view === 'list' && (
                <div className="glass-card overflow-hidden">
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Proyecto</th>
                                    <th>Cliente</th>
                                    <th>Director</th>
                                    <th>Estado</th>
                                    <th>Progreso</th>
                                    <th>Presupuesto</th>
                                    <th>Deadline</th>
                                </tr>
                            </thead>
                            <tbody>
                                {initialProjects.map((p) => {
                                    const progress = getProjectProgress(p)
                                    return (
                                        <tr key={p.id} className="group cursor-pointer">
                                            <td className="font-semibold whitespace-nowrap py-4">
                                                <p className="group-hover:text-primary transition-colors">{p.name}</p>
                                                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{p.serviceType}</p>
                                            </td>
                                            <td className="text-muted-foreground whitespace-nowrap text-xs font-medium">
                                                {p.client?.name}
                                            </td>
                                            <td className="text-muted-foreground whitespace-nowrap text-xs font-medium">
                                                {p.director?.name}
                                            </td>
                                            <td className="whitespace-nowrap">
                                                <span className={cn(
                                                    'badge uppercase text-[9px] font-bold',
                                                    p.status === 'ACTIVE' ? 'badge-info' :
                                                        p.status === 'COMPLETED' ? 'badge-success' :
                                                            p.status === 'REVIEW' ? 'badge-warning' : 'badge-neutral'
                                                )}>
                                                    {statusColumns.find((c) => c.key === p.status)?.label}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-20 bg-secondary rounded-full h-1.5 overflow-hidden">
                                                        <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-muted-foreground">{progress}%</span>
                                                </div>
                                            </td>
                                            <td className="text-foreground whitespace-nowrap font-mono text-xs tabular-nums">
                                                {formatCurrency(p.budget)}
                                            </td>
                                            <td className="text-muted-foreground whitespace-nowrap text-xs">
                                                {p.deadline ? formatDate(p.deadline) : '—'}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showForm && (
                <ProjectForm
                    onClose={() => setShowForm(false)}
                    clients={clients}
                    users={users}
                />
            )}
        </div>
    )
}
