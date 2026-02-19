import { DashboardClient } from '@/components/dashboard/dashboard-client'
import prisma from '@/lib/prisma'
import { InvoiceStatus, LeadStatus, ProjectStatus } from '@prisma/client'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { unstable_cache } from 'next/cache'

export const dynamic = 'force-dynamic'

type DateRangePreset = '7d' | '30d' | '90d' | 'custom'
type PageSearchParams = Record<string, string | string[] | undefined>

function firstParam(value: string | string[] | undefined) {
    if (Array.isArray(value)) return value[0]
    return value
}

function parseInputDate(dateStr: string, endOfDay = false) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null
    const time = endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z'
    const parsed = new Date(`${dateStr}${time}`)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed
}

function toInputDate(date: Date) {
    return date.toISOString().slice(0, 10)
}

function resolveRange(searchParams?: PageSearchParams) {
    const rawRange = firstParam(searchParams?.range)
    const range = rawRange === '7d' || rawRange === '30d' || rawRange === '90d' || rawRange === 'custom'
        ? rawRange
        : '30d'

    const today = new Date()
    const to = new Date(today)
    to.setUTCHours(23, 59, 59, 999)

    if (range === 'custom') {
        const fromInput = firstParam(searchParams?.from)
        const toInput = firstParam(searchParams?.to)
        const fromDate = fromInput ? parseInputDate(fromInput) : null
        const toDate = toInput ? parseInputDate(toInput, true) : null

        if (fromDate && toDate && fromDate <= toDate) {
            return {
                range: 'custom' as DateRangePreset,
                from: fromDate,
                to: toDate,
                fromInput: toInputDate(fromDate),
                toInput: toInputDate(toDate)
            }
        }
    }

    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30
    const from = new Date(today)
    from.setUTCDate(from.getUTCDate() - (days - 1))
    from.setUTCHours(0, 0, 0, 0)

    return {
        range: (range === 'custom' ? '30d' : range) as DateRangePreset,
        from,
        to,
        fromInput: toInputDate(from),
        toInput: toInputDate(to)
    }
}

const getDashboardData = unstable_cache(
    async (fromIso: string, toIso: string) => {
        const fromDate = new Date(fromIso)
        const toDate = new Date(toIso)
        const now = new Date()
        const startOfToday = new Date(now)
        startOfToday.setHours(0, 0, 0, 0)
        const next7Days = new Date(startOfToday)
        next7Days.setDate(next7Days.getDate() + 7)
        const leadDateRange = { createdAt: { gte: fromDate, lte: toDate } }
        const projectDateRange = { updatedAt: { gte: fromDate, lte: toDate } }
        const transactionDateRange = { date: { gte: fromDate, lte: toDate } }
        const taskDateRange = { createdAt: { gte: fromDate, lte: toDate } }

        return withPrismaRetry(() =>
            Promise.all([
                prisma.lead.aggregate({
                    where: {
                        status: { notIn: [LeadStatus.WON, LeadStatus.LOST] },
                        ...leadDateRange
                    },
                    _sum: { estimatedValue: true }
                }),
                prisma.lead.count({
                    where: {
                        status: { notIn: [LeadStatus.WON, LeadStatus.LOST] },
                        ...leadDateRange
                    }
                }),
                prisma.lead.aggregate({
                    where: { status: LeadStatus.WON, ...leadDateRange },
                    _sum: { estimatedValue: true }
                }),
                prisma.project.groupBy({
                    by: ['status'],
                    where: projectDateRange,
                    orderBy: {
                        status: 'asc'
                    },
                    _count: { _all: true }
                }),
                prisma.project.findMany({
                    where: {
                        status: { in: [ProjectStatus.ACTIVE, ProjectStatus.REVIEW] },
                        ...projectDateRange
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
                    where: transactionDateRange,
                    select: {
                        id: true,
                        category: true,
                        subcategory: true,
                        amount: true,
                        description: true,
                        date: true
                    },
                    orderBy: { date: 'desc' },
                    take: 120
                }),
                prisma.lead.findMany({
                    where: leadDateRange,
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
                        status: { not: 'DONE' },
                        ...taskDateRange
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 3
                }),
                prisma.invoice.aggregate({
                    where: {
                        status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] }
                    },
                    _sum: { amount: true }
                }),
                prisma.invoice.findMany({
                    where: {
                        status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
                        dueDate: { not: null, lte: next7Days }
                    },
                    select: {
                        id: true,
                        invoiceNumber: true,
                        amount: true,
                        dueDate: true,
                        status: true,
                        client: { select: { name: true } }
                    },
                    orderBy: { dueDate: 'asc' },
                    take: 12
                }),
                prisma.user.findMany({
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        timezone: true,
                        schedule: true,
                        birthday: true
                    },
                    orderBy: { name: 'asc' },
                    take: 80
                })
            ])
        )
    },
    ['dashboard-data-v3'],
    { revalidate: 20 }
)

export default async function DashboardPage({ searchParams }: { searchParams?: PageSearchParams }) {
    await requireModuleAccess('dashboard')
    const resolvedRange = resolveRange(searchParams)

    let pipelineAgg: { _sum: { estimatedValue: number | null } } = { _sum: { estimatedValue: 0 } }
    let opportunitiesCount = 0
    let wonRevenueAgg: { _sum: { estimatedValue: number | null } } = { _sum: { estimatedValue: 0 } }
    let groupedProjects: any[] = []
    let activeProjects: any[] = []
    let transactionsInRange: any[] = []
    let recentLeads: any[] = []
    let recentTasks: any[] = []
    let receivablesAgg: { _sum: { amount: number | null } } = { _sum: { amount: 0 } }
    let receivableAlerts: any[] = []
    let teamUsers: Array<{
        id: string
        name: string
        role: string
        timezone: string | null
        schedule: string | null
        birthday: Date | null
    }> = []

    try {
        const data = await getDashboardData(resolvedRange.from.toISOString(), resolvedRange.to.toISOString())

        ;[
            pipelineAgg,
            opportunitiesCount,
            wonRevenueAgg,
            groupedProjects,
            activeProjects,
            transactionsInRange,
            recentLeads,
            recentTasks,
            receivablesAgg,
            receivableAlerts,
            teamUsers
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
    transactionsInRange.forEach((t: any) => {
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
    const recentTransactions = transactionsInRange.slice(0, 5)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const receivablesSummary = receivableAlerts.reduce(
        (acc, invoice) => {
            if (!invoice.dueDate) return acc
            const dueDate = new Date(invoice.dueDate)
            dueDate.setHours(0, 0, 0, 0)
            if (dueDate < today || invoice.status === InvoiceStatus.OVERDUE) acc.overdueCount += 1
            else acc.dueSoonCount += 1
            return acc
        },
        { overdueCount: 0, dueSoonCount: 0 }
    )

    const receivableNotifications = receivableAlerts.map((invoice) => {
        const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null
        const isOverdue = !!dueDate && (invoice.status === InvoiceStatus.OVERDUE || dueDate < today)
        const suffix = dueDate ? dueDate.toLocaleDateString('es-PE') : 'sin fecha'
        return {
            id: `invoice-${invoice.id}`,
            message: isOverdue
                ? `Factura vencida ${invoice.invoiceNumber} (${invoice.client?.name || 'Sin cliente'})`
                : `Factura por cobrar ${invoice.invoiceNumber} vence ${suffix}`,
            createdAt: dueDate || new Date()
        }
    })

    const recentNotifications = [
        ...receivableNotifications,
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

    const startToday = new Date(today)

    const team = teamUsers
        .map((user) => {
            let nextBirthday: Date | null = null
            let daysUntilNextBirthday: number | null = null
            if (user.birthday) {
                const birthday = new Date(user.birthday)
                const candidate = new Date(startToday)
                candidate.setMonth(birthday.getMonth(), birthday.getDate())
                candidate.setHours(0, 0, 0, 0)
                if (candidate < startToday) candidate.setFullYear(candidate.getFullYear() + 1)
                nextBirthday = candidate
                daysUntilNextBirthday = Math.round((candidate.getTime() - startToday.getTime()) / (1000 * 60 * 60 * 24))
            }
            return {
                id: user.id,
                name: user.name,
                role: user.role,
                timezone: user.timezone || null,
                schedule: user.schedule || null,
                birthday: user.birthday ? new Date(user.birthday).toISOString() : null,
                nextBirthday: nextBirthday ? nextBirthday.toISOString() : null,
                daysUntilNextBirthday
            }
        })
        .sort((a, b) => {
            const aDays = a.daysUntilNextBirthday ?? 9999
            const bDays = b.daysUntilNextBirthday ?? 9999
            return aDays - bDays
        })
        .slice(0, 10)

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
        receivables: {
            totalPendingAmount: receivablesAgg._sum.amount || 0,
            overdueCount: receivablesSummary.overdueCount,
            dueSoonCount: receivablesSummary.dueSoonCount,
            items: receivableAlerts
        },
        team,
        filters: {
            range: resolvedRange.range,
            from: resolvedRange.fromInput,
            to: resolvedRange.toInput,
            label: `${resolvedRange.from.toLocaleDateString('es-PE')} - ${resolvedRange.to.toLocaleDateString('es-PE')}`
        }
    }

    return <DashboardClient stats={stats as any} />
}
