import prisma from '@/lib/prisma'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { unstable_cache } from 'next/cache'
import { FacturasClient } from '@/components/facturas/facturas-client'
import { toSignedStorageUrl } from '@/lib/storage'

export const dynamic = 'force-dynamic'

const getFacturasData = unstable_cache(
    async () =>
        withPrismaRetry(() =>
            Promise.all([
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
                    take: 300
                }),
                prisma.client.findMany({
                    select: { id: true, name: true },
                    orderBy: { name: 'asc' },
                    take: 150
                }),
                prisma.project.findMany({
                    select: { id: true, name: true },
                    orderBy: { updatedAt: 'desc' },
                    take: 200
                }),
                prisma.quote.findMany({
                    select: {
                        id: true,
                        budget: true,
                        lead: { select: { companyName: true } }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 200
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
                    take: 200
                })
            ])
        ),
    ['facturas-data-v1'],
    { revalidate: 15 }
)

export default async function FacturasPage() {
    await requireModuleAccess('facturas')
    const [invoices, clients, projects, quotes, projectMilestones] = await getFacturasData()
    const invoicesForUi = await Promise.all(
        invoices.map(async (invoice) => ({
            ...invoice,
            fileRef: invoice.fileUrl,
            fileUrl: await toSignedStorageUrl(invoice.fileUrl, {
                defaultBucket: process.env.SUPABASE_INVOICE_BUCKET || 'invoice-files',
                expiresIn: 60 * 60 * 24 * 7
            })
        }))
    )

    const invoicesToIssueProjection = projectMilestones
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

    return (
        <FacturasClient
            invoices={invoicesForUi as any}
            clients={clients}
            projects={projects}
            quotes={quotes}
            invoicesToIssueProjection={invoicesToIssueProjection}
        />
    )
}
