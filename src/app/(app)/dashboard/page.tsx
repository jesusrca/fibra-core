import { DashboardClient } from '@/components/dashboard/dashboard-client'
import { mockNotifications, mockTransactions } from '@/lib/mock-data'
import prisma from '@/lib/prisma'
import { LeadStatus, ProjectStatus } from '@prisma/client'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    await requireModuleAccess('dashboard')

    let pipelineAgg = { _sum: { estimatedValue: 0 } }
    let opportunitiesCount = 0
    let wonRevenueAgg = { _sum: { estimatedValue: 0 } }
    let groupedProjects: Array<{ status: ProjectStatus; _count: { _all: number } }> = []
    let activeProjects: any[] = []
    let recentTransactions: any[] = []

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
                })
            ])
        )

        ;[
            pipelineAgg,
            opportunitiesCount,
            wonRevenueAgg,
            groupedProjects,
            activeProjects,
            recentTransactions
        ] = data as typeof data
    } catch (error) {
        console.error('Dashboard data fetch failed, using fallback data:', error)
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

    const stats = {
        totalRevenue: wonRevenueAgg._sum.estimatedValue || 22700, // fallback until full accounting module
        activeProjectsCount,
        pipelineValue: pipelineAgg._sum.estimatedValue || 0,
        opportunitiesCount,
        projectsByStatus,
        recentTransactions: recentTransactions.length ? recentTransactions : mockTransactions.slice(0, 5),
        activeProjects,
        recentNotifications: mockNotifications.filter(n => !n.read),
    }

    return <DashboardClient stats={stats as any} />
}
