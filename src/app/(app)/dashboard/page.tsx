import { DashboardClient } from '@/components/dashboard/dashboard-client'
import prisma from '@/lib/prisma'
import { LeadStatus, ProjectStatus } from '@prisma/client'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    await requireModuleAccess('dashboard')

    let pipelineAgg: { _sum: { estimatedValue: number | null } } = { _sum: { estimatedValue: 0 } }
    let opportunitiesCount = 0
    let wonRevenueAgg: { _sum: { estimatedValue: number | null } } = { _sum: { estimatedValue: 0 } }
    let groupedProjects: any[] = []
    let activeProjects: any[] = []
    let recentTransactions: any[] = []
    let recentLeads: any[] = []
    let recentTasks: any[] = []

    try {
        const data = await withPrismaRetry(() =>
            prisma.$transaction([
                prisma.lead.aggregate({
                    where: {
                        status: { notIn: [LeadStatus.WON, LeadStatus.LOST] }
                    },
                    _sum: { estimatedValue: true }
                }),
                prisma.lead.count({
                    where: {
                        status: { notIn: [LeadStatus.WON, LeadStatus.LOST] }
                    }
                }),
                prisma.lead.aggregate({
                    where: { status: LeadStatus.WON },
                    _sum: { estimatedValue: true }
                }),
                prisma.project.groupBy({
                    by: ['status'],
                    orderBy: {
                        status: 'asc'
                    },
                    _count: { _all: true }
                }),
                prisma.project.findMany({
                    where: {
                        status: { in: [ProjectStatus.ACTIVE, ProjectStatus.REVIEW] }
                    },
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        budget: true,
                        startDate: true,
                        endDate: true,
                        client: { select: { name: true } },
                        director: { select: { name: true } },
                        milestones: {
                            select: { id: true },
                            take: 3
                        }
                    },
                    take: 5,
                    orderBy: { updatedAt: 'desc' }
                }),
                prisma.transaction.findMany({
                    select: {
                        id: true,
                        category: true,
                        subcategory: true,
                        amount: true,
                        description: true,
                        date: true
                    },
                    orderBy: { date: 'desc' },
                    take: 5
                }),
                prisma.lead.findMany({
                    select: {
                        id: true,
                        companyName: true,
                        serviceRequested: true,
                        createdAt: true
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 3
                }),
                prisma.task.findMany({
                    select: {
                        id: true,
                        title: true,
                        dueDate: true,
                        createdAt: true
                    },
                    where: {
                        status: { not: 'DONE' }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 3
                })
            ])
        )

        ;[
            pipelineAgg,
            opportunitiesCount,
            wonRevenueAgg,
            groupedProjects,
            activeProjects,
            recentTransactions,
            recentLeads,
            recentTasks
        ] = data as typeof data
    } catch (error) {
        console.error('Dashboard data fetch failed:', error)
    }

    const statusCount = (status: ProjectStatus) =>
        groupedProjects.find((p) => p.status === status)?._count._all ?? 0

    const activeProjectsCount = statusCount(ProjectStatus.ACTIVE) + statusCount(ProjectStatus.REVIEW)

    const projectsByStatus = [
        { name: 'Activos', value: statusCount(ProjectStatus.ACTIVE) },
        { name: 'Revisión', value: statusCount(ProjectStatus.REVIEW) },
        { name: 'Planeación', value: statusCount(ProjectStatus.PLANNING) },
        { name: 'Completados', value: statusCount(ProjectStatus.COMPLETED) },
    ]

    const revenueByMonth = new Map<string, { month: string; ingresos: number; gastos: number }>()
    recentTransactions.forEach((t: any) => {
        const date = new Date(t.date)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const monthLabel = date.toLocaleString('es-PE', { month: 'short' })
        if (!revenueByMonth.has(key)) {
            revenueByMonth.set(key, { month: monthLabel, ingresos: 0, gastos: 0 })
        }
        const bucket = revenueByMonth.get(key)!
        if (t.category === 'INCOME') bucket.ingresos += t.amount
        if (t.category === 'EXPENSE') bucket.gastos += t.amount
    })
    const revenueSeries = Array.from(revenueByMonth.values()).reverse()

    const recentNotifications = [
        ...recentLeads.map((lead: any) => ({
            id: `lead-${lead.id}`,
            message: `Nuevo lead: ${lead.companyName || 'Sin empresa'}`,
            createdAt: lead.createdAt
        })),
        ...recentTasks.map((task: any) => ({
            id: `task-${task.id}`,
            message: `Tarea pendiente: ${task.title}`,
            createdAt: task.createdAt
        }))
    ]
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 5)

    const stats = {
        totalRevenue: wonRevenueAgg._sum.estimatedValue || 0,
        activeProjectsCount,
        pipelineValue: pipelineAgg._sum.estimatedValue || 0,
        opportunitiesCount,
        projectsByStatus,
        recentTransactions,
        activeProjects,
        recentNotifications,
        revenueSeries,
    }

    return <DashboardClient stats={stats as any} />
}
