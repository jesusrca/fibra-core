import { ComercialClient } from '@/components/crm/comercial-client'
import prisma from '@/lib/prisma'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { unstable_cache } from 'next/cache'
import { ensureComercialDataQualityNotifications } from '@/lib/data-quality-notifications'
import { syncInvoicesFromMilestones } from '@/lib/actions/crm'
import { LeadStatus } from '@prisma/client'
import { paginationQuerySchema } from '@/lib/validation/schemas'

export const dynamic = 'force-dynamic'

type PageSearchParams = Record<string, string | string[] | undefined>

function firstParam(value: string | string[] | undefined) {
    if (Array.isArray(value)) return value[0]
    return value
}

const getComercialData = unstable_cache(
    async (page: number, pageSize: number, q: string, status: string) =>
        withPrismaRetry(() => Promise.all([
            prisma.lead.findMany({
                where: {
                    ...(status !== 'ALL' ? { status: status as LeadStatus } : {}),
                    ...(q
                        ? {
                            OR: [
                                { companyName: { contains: q, mode: 'insensitive' } },
                                { serviceRequested: { contains: q, mode: 'insensitive' } },
                                { source: { contains: q, mode: 'insensitive' } },
                            ]
                        }
                        : {}),
                },
                orderBy: { createdAt: 'desc' },
                include: {
                    client: { select: { id: true, name: true } },
                    contact: { select: { id: true, firstName: true, lastName: true, email: true } },
                    activities: {
                        orderBy: { date: 'desc' },
                        take: 20,
                        select: {
                            id: true,
                            type: true,
                            description: true,
                            date: true,
                            contact: { select: { id: true, firstName: true, lastName: true } }
                        }
                    }
                },
                skip: (page - 1) * pageSize,
                take: pageSize
            }),
            prisma.lead.count({
                where: {
                    ...(status !== 'ALL' ? { status: status as LeadStatus } : {}),
                    ...(q
                        ? {
                            OR: [
                                { companyName: { contains: q, mode: 'insensitive' } },
                                { serviceRequested: { contains: q, mode: 'insensitive' } },
                                { source: { contains: q, mode: 'insensitive' } },
                            ]
                        }
                        : {}),
                },
            }),
            prisma.user.findMany({
                orderBy: { name: 'asc' },
                select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true, updatedAt: true }
            }),
            prisma.client.findMany({
                orderBy: { name: 'asc' },
                select: { id: true, name: true, country: true, industry: true, mainEmail: true, createdAt: true, updatedAt: true, taxId: true, address: true, referredBy: true },
                take: 120
            }),
            prisma.contact.findMany({
                include: {
                    client: { select: { id: true, name: true } },
                    emailMessages: {
                        orderBy: { receivedAt: 'desc' },
                        take: 3,
                        select: {
                            id: true,
                            subject: true,
                            snippet: true,
                            fromEmail: true,
                            receivedAt: true,
                            project: { select: { id: true, name: true } }
                        }
                    }
                },
                orderBy: { firstName: 'asc' },
                take: 120
            }),
            prisma.quote.findMany({
                include: {
                    lead: {
                        select: {
                            id: true,
                            companyName: true,
                            serviceRequested: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 120
            }),
            prisma.invoice.findMany({
                include: {
                    client: { select: { id: true, name: true } },
                    project: { select: { id: true, name: true } },
                    quote: {
                        select: {
                            id: true,
                            lead: { select: { companyName: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 120
            }),
            prisma.project.findMany({
                select: {
                    id: true,
                    name: true,
                    budget: true,
                    startDate: true,
                    status: true,
                    quote: { select: { installmentsCount: true } },
                    milestones: { select: { id: true, status: true } },
                    invoices: { select: { id: true, status: true } }
                },
                orderBy: { updatedAt: 'desc' },
                take: 120
            }),
            prisma.lead.findMany({
                select: {
                    id: true,
                    source: true,
                    status: true,
                    estimatedValue: true,
                    createdAt: true
                },
                orderBy: { createdAt: 'desc' },
                take: 400
            })
        ])),
    ['comercial-data-v4'],
    { revalidate: 15 }
)

export default async function ComercialPage({ searchParams }: { searchParams?: PageSearchParams }) {
    const user = await requireModuleAccess('comercial')
    await syncInvoicesFromMilestones()
    await ensureComercialDataQualityNotifications(user.id)

    const query = paginationQuerySchema.parse({
        page: firstParam(searchParams?.page),
        pageSize: firstParam(searchParams?.pageSize) || '20',
        q: firstParam(searchParams?.q) || '',
        status: firstParam(searchParams?.status) || 'ALL',
    })
    const status = query.status.toUpperCase()
    const allowedStatuses = new Set(['ALL', ...Object.values(LeadStatus)])
    const safeStatus = allowedStatuses.has(status) ? status : 'ALL'

    const [leads, totalLeads, users, clients, contacts, quotes, invoices, projects, leadSeries] = await getComercialData(
        query.page,
        query.pageSize,
        query.q,
        safeStatus
    )
    const invoicesToIssueProjection = projects
        .map((project) => {
            const now = new Date()
            const parsedStartDate = project.startDate ? new Date(project.startDate) : now
            const startDate = Number.isNaN(parsedStartDate.getTime()) ? now : parsedStartDate
            const totalMilestones = Math.max(project.milestones.length, 1)
            const completedMilestones = project.milestones.filter((m) => m.status === 'COMPLETED').length
            const issuedInvoices = project.invoices.filter((inv) => inv.status !== 'CANCELLED').length
            const installments = Math.max(project.quote?.installmentsCount || 0, 0)
            const monthsElapsed = Math.max(
                0,
                (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth())
            )
            const accruedInstallments = (project.status === 'ACTIVE' || project.status === 'REVIEW' || project.status === 'COMPLETED')
                ? Math.min(installments, monthsElapsed + 1)
                : 0
            const pendingToIssue = Math.max(Math.max(completedMilestones, accruedInstallments) - issuedInvoices, 0)
            const divisor = Math.max(totalMilestones, installments, 1)
            const installmentAmount = Math.round(((project.budget || 0) / divisor) * 100) / 100
            return {
                projectId: project.id,
                projectName: project.name,
                pendingToIssue,
                installmentAmount,
                totalAmount: Math.round(pendingToIssue * installmentAmount * 100) / 100
            }
        })
        .filter((row) => row.pendingToIssue > 0)
        .sort((a, b) => b.totalAmount - a.totalAmount)

    const probabilityByStatus: Record<LeadStatus, number> = {
        NEW: 0.1,
        CONTACTED: 0.25,
        QUALIFIED: 0.45,
        PROPOSAL: 0.7,
        WON: 1,
        LOST: 0,
    }
    const weightedPipeline = leadSeries
        .filter((l) => l.status !== 'WON' && l.status !== 'LOST')
        .reduce((acc, lead) => acc + (lead.estimatedValue || 0) * probabilityByStatus[lead.status], 0)

    const forecastByMonthMap = new Map<string, number>()
    const now = new Date()
    const monthKeys: string[] = []
    for (let i = 0; i < 3; i += 1) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        monthKeys.push(key)
        forecastByMonthMap.set(key, 0)
    }

    leadSeries.forEach((lead) => {
        if (lead.status === 'WON' || lead.status === 'LOST') return
        const offset = lead.status === 'NEW' ? 2 : lead.status === 'CONTACTED' ? 1 : 0
        const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const weight = probabilityByStatus[lead.status]
        forecastByMonthMap.set(key, (forecastByMonthMap.get(key) || 0) + (lead.estimatedValue || 0) * weight)
    })

    const forecastByMonth = monthKeys.map((key) => {
        const [year, month] = key.split('-').map(Number)
        const date = new Date(year, month - 1, 1)
        return {
            key,
            label: date.toLocaleDateString('es-PE', { month: 'short' }).replace('.', ''),
            value: Math.round((forecastByMonthMap.get(key) || 0) * 100) / 100
        }
    })

    const goalsVsRealMap = new Map<string, { source: string; forecast: number; won: number }>()
    leadSeries.forEach((lead) => {
        const source = (lead.source || 'Sin fuente').trim()
        const current = goalsVsRealMap.get(source) || { source, forecast: 0, won: 0 }
        if (lead.status === 'WON') {
            current.won += lead.estimatedValue || 0
        } else if (lead.status !== 'LOST') {
            current.forecast += (lead.estimatedValue || 0) * probabilityByStatus[lead.status]
        }
        goalsVsRealMap.set(source, current)
    })
    const goalsVsReal = Array.from(goalsVsRealMap.values())
        .map((row) => ({
            source: row.source,
            goal: Math.round(row.forecast * 1.2 * 100) / 100,
            forecast: Math.round(row.forecast * 100) / 100,
            real: Math.round(row.won * 100) / 100,
        }))
        .sort((a, b) => b.forecast - a.forecast)
        .slice(0, 8)

    const totalPages = Math.max(1, Math.ceil(totalLeads / query.pageSize))

    return (
        <ComercialClient
            initialLeads={leads as any}
            users={users as any}
            clients={clients}
            contacts={contacts}
            quotes={quotes as any}
            invoices={invoices as any}
            projects={projects.map((project) => ({ id: project.id, name: project.name })) as any}
            invoicesToIssueProjection={invoicesToIssueProjection}
            leadFilters={{ q: query.q, status: safeStatus, page: query.page, pageSize: query.pageSize }}
            leadPagination={{ total: totalLeads, totalPages }}
            leadInsights={{
                weightedPipeline,
                forecastByMonth,
                goalsVsReal
            }}
        />
    )
}
