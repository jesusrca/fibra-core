import { ComercialClient } from '@/components/crm/comercial-client'
import prisma from '@/lib/prisma'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { unstable_cache } from 'next/cache'
import { ensureComercialDataQualityNotifications } from '@/lib/data-quality-notifications'

export const dynamic = 'force-dynamic'

const getComercialData = unstable_cache(
    async () =>
        withPrismaRetry(() => Promise.all([
            prisma.lead.findMany({
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
                take: 80
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
                include: { client: { select: { id: true, name: true } } },
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
                    milestones: { select: { id: true, status: true } },
                    invoices: { select: { id: true, status: true } }
                },
                orderBy: { updatedAt: 'desc' },
                take: 120
            })
        ])),
    ['comercial-data-v3'],
    { revalidate: 15 }
)

export default async function ComercialPage() {
    const user = await requireModuleAccess('comercial')
    await ensureComercialDataQualityNotifications(user.id)

    const [leads, users, clients, contacts, quotes, invoices, projects] = await getComercialData()
    const invoicesToIssueProjection = projects
        .map((project) => {
            const totalMilestones = Math.max(project.milestones.length, 1)
            const completedMilestones = project.milestones.filter((m) => m.status === 'COMPLETED').length
            const issuedInvoices = project.invoices.filter((inv) => inv.status !== 'CANCELLED').length
            const pendingToIssue = Math.max(completedMilestones - issuedInvoices, 0)
            const installmentAmount = Math.round(((project.budget || 0) / totalMilestones) * 100) / 100
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
        />
    )
}
