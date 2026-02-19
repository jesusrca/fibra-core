import { ComercialClient } from '@/components/crm/comercial-client'
import prisma from '@/lib/prisma'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { unstable_cache } from 'next/cache'

export const dynamic = 'force-dynamic'

const getComercialData = unstable_cache(
    async () =>
        withPrismaRetry(() => Promise.all([
            prisma.lead.findMany({
                orderBy: { createdAt: 'desc' },
                include: {
                    client: { select: { id: true, name: true } },
                    contact: { select: { id: true, firstName: true, lastName: true, email: true } }
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
                select: { id: true, name: true },
                orderBy: { updatedAt: 'desc' },
                take: 120
            })
        ])),
    ['comercial-data-v2'],
    { revalidate: 15 }
)

export default async function ComercialPage() {
    await requireModuleAccess('comercial')

    const [leads, users, clients, contacts, quotes, invoices, projects] = await getComercialData()

    return (
        <ComercialClient
            initialLeads={leads as any}
            users={users as any}
            clients={clients}
            contacts={contacts}
            quotes={quotes as any}
            invoices={invoices as any}
            projects={projects as any}
        />
    )
}
