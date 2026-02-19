import { ComercialClient } from '@/components/crm/comercial-client'
import prisma from '@/lib/prisma'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'

export const dynamic = 'force-dynamic'

export default async function ComercialPage() {
    await requireModuleAccess('comercial')

    const [leads, users, clients, contacts] = await withPrismaRetry(() => prisma.$transaction([
        prisma.lead.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                client: { select: { id: true, name: true } },
                contact: { select: { id: true, firstName: true, lastName: true, email: true } }
            },
            take: 120
        }),
        prisma.user.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true, updatedAt: true }
        }),
        prisma.client.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true, country: true, industry: true, mainEmail: true, createdAt: true, updatedAt: true, taxId: true, address: true, referredBy: true },
            take: 200
        }),
        prisma.contact.findMany({
            include: { client: { select: { id: true, name: true } } },
            orderBy: { firstName: 'asc' },
            take: 200
        })
    ]))

    return (
        <ComercialClient
            initialLeads={leads as any}
            users={users as any}
            clients={clients}
            contacts={contacts}
        />
    )
}
