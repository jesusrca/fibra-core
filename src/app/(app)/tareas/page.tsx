import prisma from '@/lib/prisma'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { unstable_cache } from 'next/cache'
import { TasksClient } from '@/components/tasks/tasks-client'

export const dynamic = 'force-dynamic'

type PageSearchParams = Record<string, string | string[] | undefined>

function firstParam(value: string | string[] | undefined) {
    if (Array.isArray(value)) return value[0]
    return value
}

function normalizePage(value?: string, fallback = 1) {
    const parsed = Number.parseInt(value || '', 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const getTasksData = unstable_cache(
    async (
        page: number,
        pageSize: number,
        q: string,
        status: string,
        priority: string,
        assigneeId: string,
        projectId: string,
        overdueOnly: boolean
    ) =>
        withPrismaRetry(async () => {
            const where: any = {
                ...(status !== 'ALL' ? { status } : {}),
                ...(priority !== 'ALL' ? { priority } : {}),
                ...(assigneeId ? { assigneeId } : {}),
                ...(projectId ? { projectId } : {}),
                ...(q
                    ? {
                        OR: [
                            { title: { contains: q, mode: 'insensitive' } },
                            { description: { contains: q, mode: 'insensitive' } },
                            { project: { name: { contains: q, mode: 'insensitive' } } },
                            { project: { client: { name: { contains: q, mode: 'insensitive' } } } },
                            { assignee: { name: { contains: q, mode: 'insensitive' } } },
                        ]
                    }
                    : {}),
            }

            if (overdueOnly) {
                where.dueDate = { lt: new Date() }
                where.status = status === 'ALL' ? { not: 'DONE' } : status
            }

            const [tasks, total, users, projects, overdueCount, dueThisWeekCount, doneCount] = await Promise.all([
                prisma.task.findMany({
                    where,
                    include: {
                        project: {
                            select: {
                                id: true,
                                name: true,
                                client: { select: { id: true, name: true } }
                            }
                        },
                        assignee: { select: { id: true, name: true, email: true } }
                    },
                    orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
                    skip: (page - 1) * pageSize,
                    take: pageSize
                }),
                prisma.task.count({ where }),
                prisma.user.findMany({
                    select: { id: true, name: true, role: true },
                    orderBy: { name: 'asc' }
                }),
                prisma.project.findMany({
                    select: { id: true, name: true },
                    orderBy: { updatedAt: 'desc' },
                    take: 200
                }),
                prisma.task.count({
                    where: {
                        ...where,
                        dueDate: { lt: new Date() },
                        status: { not: 'DONE' }
                    }
                }),
                prisma.task.count({
                    where: {
                        ...where,
                        dueDate: {
                            gte: new Date(new Date().setHours(0, 0, 0, 0)),
                            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                        },
                        status: { not: 'DONE' }
                    }
                }),
                prisma.task.count({
                    where: {
                        ...where,
                        status: 'DONE'
                    }
                })
            ])

            return {
                tasks,
                total,
                users,
                projects,
                insights: {
                    overdue: overdueCount,
                    dueThisWeek: dueThisWeekCount,
                    done: doneCount
                }
            }
        }),
    ['tareas-data-v1'],
    { revalidate: 15 }
)

export default async function TareasPage({ searchParams }: { searchParams?: PageSearchParams }) {
    await requireModuleAccess('tareas')

    const page = normalizePage(firstParam(searchParams?.page), 1)
    const pageSize = normalizePage(firstParam(searchParams?.pageSize), 20)
    const q = (firstParam(searchParams?.q) || '').trim()
    const status = (firstParam(searchParams?.status) || 'ALL').toUpperCase()
    const priority = (firstParam(searchParams?.priority) || 'ALL').toUpperCase()
    const assigneeId = (firstParam(searchParams?.assigneeId) || '').trim()
    const projectId = (firstParam(searchParams?.projectId) || '').trim()
    const overdueOnly = firstParam(searchParams?.overdueOnly) === 'true'

    const { tasks, total, users, projects, insights } = await getTasksData(
        page,
        pageSize,
        q,
        status,
        priority,
        assigneeId,
        projectId,
        overdueOnly
    )
    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    return (
        <TasksClient
            initialTasks={tasks as any}
            users={users as any}
            projects={projects}
            filters={{ q, status, priority, assigneeId, projectId, overdueOnly, page, pageSize }}
            pagination={{ total, totalPages }}
            insights={insights}
        />
    )
}
