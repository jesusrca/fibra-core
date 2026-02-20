'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CalendarClock, CheckCircle2, ListTodo } from 'lucide-react'
import { updateTaskStatus } from '@/lib/actions/projects'
import { cn, formatDate } from '@/lib/utils'

type TaskRow = {
    id: string
    title: string
    description: string | null
    status: string
    priority: string
    startDate: Date | string | null
    dueDate: Date | string | null
    updatedAt: Date | string
    projectId: string
    project: {
        id: string
        name: string
        client: { id: string; name: string } | null
    }
    assignee: { id: string; name: string; email: string } | null
}

interface TasksClientProps {
    initialTasks: TaskRow[]
    users: Array<{ id: string; name: string; role: string }>
    projects: Array<{ id: string; name: string }>
    filters: {
        q: string
        status: string
        priority: string
        assigneeId: string
        projectId: string
        overdueOnly: boolean
        page: number
        pageSize: number
    }
    pagination: { total: number; totalPages: number }
    insights: { overdue: number; dueThisWeek: number; done: number }
}

const taskStatusOptions = [
    { value: 'ALL', label: 'Todos los estados' },
    { value: 'TODO', label: 'Por hacer' },
    { value: 'IN_PROGRESS', label: 'En progreso' },
    { value: 'DONE', label: 'Completada' },
]

const priorityOptions = [
    { value: 'ALL', label: 'Todas las prioridades' },
    { value: 'HIGH', label: 'Alta' },
    { value: 'MEDIUM', label: 'Media' },
    { value: 'LOW', label: 'Baja' },
]

export function TasksClient({
    initialTasks,
    users,
    projects,
    filters,
    pagination,
    insights
}: TasksClientProps) {
    const router = useRouter()
    const [tasks, setTasks] = useState(initialTasks)
    const [search, setSearch] = useState(filters.q || '')
    const [status, setStatus] = useState(filters.status || 'ALL')
    const [priority, setPriority] = useState(filters.priority || 'ALL')
    const [assigneeId, setAssigneeId] = useState(filters.assigneeId || '')
    const [projectId, setProjectId] = useState(filters.projectId || '')
    const [overdueOnly, setOverdueOnly] = useState(Boolean(filters.overdueOnly))
    const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)

    useEffect(() => {
        setTasks(initialTasks)
    }, [initialTasks])

    const pageSummary = useMemo(() => {
        const now = new Date()
        const overdue = tasks.filter((task) => task.dueDate && new Date(task.dueDate) < now && task.status !== 'DONE').length
        return {
            total: tasks.length,
            overdue
        }
    }, [tasks])

    const applyFilters = () => {
        const params = new URLSearchParams()
        if (search.trim()) params.set('q', search.trim())
        if (status !== 'ALL') params.set('status', status)
        if (priority !== 'ALL') params.set('priority', priority)
        if (assigneeId) params.set('assigneeId', assigneeId)
        if (projectId) params.set('projectId', projectId)
        if (overdueOnly) params.set('overdueOnly', 'true')
        params.set('page', '1')
        params.set('pageSize', String(filters.pageSize || 20))
        router.push(`/tareas?${params.toString()}`)
    }

    const goToPage = (page: number) => {
        const params = new URLSearchParams()
        if (search.trim()) params.set('q', search.trim())
        if (status !== 'ALL') params.set('status', status)
        if (priority !== 'ALL') params.set('priority', priority)
        if (assigneeId) params.set('assigneeId', assigneeId)
        if (projectId) params.set('projectId', projectId)
        if (overdueOnly) params.set('overdueOnly', 'true')
        params.set('page', String(page))
        params.set('pageSize', String(filters.pageSize || 20))
        router.push(`/tareas?${params.toString()}`)
    }

    const handleTaskStatusChange = async (task: TaskRow, nextStatus: string) => {
        const previous = tasks
        setUpdatingTaskId(task.id)
        setTasks((state) => state.map((row) => (row.id === task.id ? { ...row, status: nextStatus } : row)))
        const result = await updateTaskStatus(task.id, nextStatus, task.projectId)
        setUpdatingTaskId(null)
        if (!result.success) {
            setTasks(previous)
            alert(result.error || 'No se pudo actualizar la tarea')
            return
        }
        router.refresh()
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Tareas</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Vista unificada de tareas de todos los proyectos
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-5">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase">
                        <ListTodo className="w-4 h-4" /> Total filtrado
                    </div>
                    <p className="text-3xl font-bold mt-2">{pagination.total}</p>
                </div>
                <div className="glass-card p-5">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase">
                        <AlertTriangle className="w-4 h-4" /> Vencidas
                    </div>
                    <p className="text-3xl font-bold mt-2 text-[hsl(var(--danger-text))]">{insights.overdue}</p>
                </div>
                <div className="glass-card p-5">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase">
                        <CalendarClock className="w-4 h-4" /> Próx. 7 días
                    </div>
                    <p className="text-3xl font-bold mt-2 text-[hsl(var(--warning-text))]">{insights.dueThisWeek}</p>
                </div>
                <div className="glass-card p-5">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase">
                        <CheckCircle2 className="w-4 h-4" /> Completadas
                    </div>
                    <p className="text-3xl font-bold mt-2 text-[hsl(var(--success-text))]">{insights.done}</p>
                </div>
            </div>

            <div className="glass-card p-4 grid grid-cols-1 xl:grid-cols-6 gap-3">
                <input
                    className="form-input xl:col-span-2"
                    placeholder="Buscar por tarea, proyecto, cliente o responsable..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') applyFilters()
                    }}
                />

                <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                    {taskStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>

                <select className="form-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                    {priorityOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>

                <select className="form-input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                    <option value="">Todos los proyectos</option>
                    {projects.map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                </select>

                <select className="form-input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                    <option value="">Todos los responsables</option>
                    {users.map((user) => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                </select>

                <label className="xl:col-span-2 inline-flex items-center gap-2 text-sm text-foreground">
                    <input
                        type="checkbox"
                        checked={overdueOnly}
                        onChange={(e) => setOverdueOnly(e.target.checked)}
                    />
                    Mostrar solo vencidas
                </label>

                <div className="xl:col-span-4 flex gap-2 justify-end">
                    <button
                        className="btn-secondary"
                        onClick={() => {
                            setSearch('')
                            setStatus('ALL')
                            setPriority('ALL')
                            setProjectId('')
                            setAssigneeId('')
                            setOverdueOnly(false)
                            router.push('/tareas?page=1&pageSize=20')
                        }}
                    >
                        Limpiar
                    </button>
                    <button className="btn-primary" onClick={applyFilters}>
                        Aplicar
                    </button>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Tarea</th>
                                <th>Proyecto</th>
                                <th>Cliente</th>
                                <th>Responsable</th>
                                <th>Prioridad</th>
                                <th>Estado</th>
                                <th>Inicio</th>
                                <th>Vencimiento</th>
                                <th>Última actualización</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map((task) => {
                                const dueDate = task.dueDate ? new Date(task.dueDate) : null
                                const isOverdue = Boolean(dueDate && dueDate < new Date() && task.status !== 'DONE')
                                return (
                                    <tr key={task.id}>
                                        <td>
                                            <div className="min-w-[220px]">
                                                <p className={cn('font-semibold', task.status === 'DONE' && 'line-through text-muted-foreground')}>
                                                    {task.title}
                                                </p>
                                                {task.description && (
                                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <Link href={`/proyectos/${task.project.id}`} className="text-primary hover:underline">
                                                {task.project.name}
                                            </Link>
                                        </td>
                                        <td className="text-muted-foreground text-xs">{task.project.client?.name || 'Sin cliente'}</td>
                                        <td className="text-xs">{task.assignee?.name || 'Sin asignar'}</td>
                                        <td>
                                            <span className={cn(
                                                'badge',
                                                task.priority === 'HIGH'
                                                    ? 'badge-danger'
                                                    : task.priority === 'MEDIUM'
                                                        ? 'badge-warning'
                                                        : 'badge-neutral'
                                            )}>
                                                {task.priority}
                                            </span>
                                        </td>
                                        <td>
                                            <select
                                                className="form-input h-8 py-0 text-xs"
                                                value={task.status}
                                                disabled={updatingTaskId === task.id}
                                                onChange={(e) => handleTaskStatusChange(task, e.target.value)}
                                            >
                                                <option value="TODO">TODO</option>
                                                <option value="IN_PROGRESS">IN_PROGRESS</option>
                                                <option value="DONE">DONE</option>
                                            </select>
                                        </td>
                                        <td className="text-xs text-muted-foreground">
                                            {task.startDate ? formatDate(task.startDate) : '—'}
                                        </td>
                                        <td className={cn('text-xs', isOverdue ? 'text-[hsl(var(--danger-text))] font-semibold' : 'text-muted-foreground')}>
                                            {task.dueDate ? formatDate(task.dueDate) : '—'}
                                        </td>
                                        <td className="text-xs text-muted-foreground">
                                            {formatDate(task.updatedAt)}
                                        </td>
                                    </tr>
                                )
                            })}
                            {tasks.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                                        No hay tareas con esos filtros.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                    Página {filters.page} de {pagination.totalPages} · Mostrando {pageSummary.total} tareas ({pageSummary.overdue} vencidas en esta página)
                </span>
                <div className="flex gap-2">
                    <button
                        className="btn-secondary h-8 px-3"
                        disabled={filters.page <= 1}
                        onClick={() => goToPage(filters.page - 1)}
                    >
                        Anterior
                    </button>
                    <button
                        className="btn-secondary h-8 px-3"
                        disabled={filters.page >= pagination.totalPages}
                        onClick={() => goToPage(filters.page + 1)}
                    >
                        Siguiente
                    </button>
                </div>
            </div>
        </div>
    )
}
