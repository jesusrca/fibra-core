'use client'

import { useState } from 'react'
import { Plus, Calendar, Users, DollarSign } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { mockProjects, mockTasks, type Project } from '@/lib/mock-data'

const statusColumns = [
    { key: 'planning', label: 'Planeación', color: 'border-purple-500/40', dot: 'bg-purple-500' },
    { key: 'active', label: 'Activo', color: 'border-[hsl(var(--info-text))]/40', dot: 'bg-[hsl(var(--info-text))]' },
    { key: 'review', label: 'Revisión', color: 'border-[hsl(var(--warning-text))]/40', dot: 'bg-[hsl(var(--warning-text))]' },
    { key: 'completed', label: 'Completado', color: 'border-[hsl(var(--success-text))]/40', dot: 'bg-[hsl(var(--success-text))]' },
] as const

const priorityBadge: Record<string, string> = {
    high: 'badge-danger',
    medium: 'badge-warning',
    low: 'badge-neutral',
}

const priorityLabel: Record<string, string> = {
    high: 'Alta',
    medium: 'Media',
    low: 'Baja',
}

export default function ProyectosPage() {
    const [view, setView] = useState<'kanban' | 'list'>('kanban')
    const [showForm, setShowForm] = useState(false)

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Proyectos</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{mockProjects.length} proyectos en total</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex border border-border rounded-lg overflow-hidden">
                        {(['kanban', 'list'] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={cn('px-3 py-1.5 text-xs font-medium transition-all', view === v ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}
                            >
                                {v === 'kanban' ? '⬛ Kanban' : '☰ Lista'}
                            </button>
                        ))}
                    </div>
                    <button className="btn-primary" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Nuevo Proyecto</button>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                {[
                    { label: 'Total Proyectos', value: mockProjects.length, color: 'text-foreground' },
                    { label: 'Activos', value: mockProjects.filter((p) => p.status === 'active').length, color: 'text-[hsl(var(--info-text))]' },
                    { label: 'En Revisión', value: mockProjects.filter((p) => p.status === 'review').length, color: 'text-[hsl(var(--warning-text))]' },
                    { label: 'Completados', value: mockProjects.filter((p) => p.status === 'completed').length, color: 'text-[hsl(var(--success-text))]' },
                ].map((s) => (
                    <div key={s.label} className="glass-card p-4">
                        <p className={cn('text-3xl font-bold', s.color)}>{s.value}</p>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Kanban */}
            {view === 'kanban' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {statusColumns.map((col) => {
                        const colProjects = mockProjects.filter((p) => p.status === col.key)
                        return (
                            <div key={col.key} className={cn('glass-card p-4 border-t-2', col.color)}>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className={cn('w-2 h-2 rounded-full', col.dot)} />
                                    <span className="text-sm font-semibold">{col.label}</span>
                                    <span className="ml-auto badge badge-neutral">{colProjects.length}</span>
                                </div>
                                <div className="space-y-3">
                                    {colProjects.map((p) => (
                                        <div key={p.id} className="bg-secondary/40 border border-border/40 rounded-lg p-3 hover:border-primary/30 transition-all cursor-pointer">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <p className="text-sm font-medium text-foreground leading-snug">{p.name}</p>
                                                <span className={cn('badge flex-shrink-0', priorityBadge[p.priority])}>{priorityLabel[p.priority]}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-3">{p.client}</p>
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                    <span>Progreso</span>
                                                    <span>{p.progress}%</span>
                                                </div>
                                                <div className="w-full bg-background rounded-full h-1.5">
                                                    <div className="h-1.5 rounded-full bg-gradient-to-r from-electric-500 to-electric-400" style={{ width: `${p.progress}%` }} />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(p.deadline)}</span>
                                                <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{formatCurrency(p.budget)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* List view */}
            {view === 'list' && (
                <div className="glass-card p-5 table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Proyecto</th>
                                <th>Cliente</th>
                                <th>Estado</th>
                                <th>Prioridad</th>
                                <th>Progreso</th>
                                <th>Presupuesto</th>
                                <th>Deadline</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockProjects.map((p) => (
                                <tr key={p.id}>
                                    <td className="font-medium whitespace-nowrap">
                                        <p>{p.name}</p>
                                        <p className="text-[10px] text-muted-foreground whitespace-nowrap">Branding</p>
                                    </td>
                                    <td className="text-muted-foreground whitespace-nowrap">{p.client}</td>
                                    <td className="whitespace-nowrap">
                                        <span className={cn('badge', p.status === 'active' ? 'badge-info' : p.status === 'completed' ? 'badge-success' : p.status === 'review' ? 'badge-warning' : 'badge-neutral')}>
                                            {statusColumns.find((c) => c.key === p.status)?.label}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap"><span className={cn('badge', priorityBadge[p.priority])}>{priorityLabel[p.priority]}</span></td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 sm:w-20 bg-secondary rounded-full h-1.5">
                                                <div className="h-1.5 rounded-full bg-electric-500" style={{ width: `${p.progress}%` }} />
                                            </div>
                                            <span className="text-xs text-muted-foreground">{p.progress}%</span>
                                        </div>
                                    </td>
                                    <td className="text-foreground whitespace-nowrap">{formatCurrency(p.budget)}</td>
                                    <td className="text-muted-foreground whitespace-nowrap">{formatDate(p.deadline)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Tasks section */}
            <div className="glass-card p-5">
                <h2 className="section-title mb-4">Tareas Recientes</h2>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Tarea</th>
                                <th>Asignado a</th>
                                <th>Estado</th>
                                <th>Prioridad</th>
                                <th>Vencimiento</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockTasks.map((t) => (
                                <tr key={t.id}>
                                    <td className="font-medium whitespace-nowrap">{t.title}</td>
                                    <td className="text-muted-foreground whitespace-nowrap">{t.assignee}</td>
                                    <td className="whitespace-nowrap">
                                        <span className={cn('badge', t.status === 'done' ? 'badge-success' : t.status === 'in_progress' ? 'badge-info' : t.status === 'review' ? 'badge-warning' : 'badge-neutral')}>
                                            {t.status === 'done' ? 'Hecho' : t.status === 'in_progress' ? 'En Progreso' : t.status === 'review' ? 'Revisión' : 'Por Hacer'}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap"><span className={cn('badge', priorityBadge[t.priority])}>{priorityLabel[t.priority]}</span></td>
                                    <td className="text-muted-foreground whitespace-nowrap">{formatDate(t.dueDate)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
