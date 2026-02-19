import { ContabilidadClient } from '@/components/contabilidad/contabilidad-client'
import prisma from '@/lib/prisma'
import { requireModuleAccess } from '@/lib/server-auth'
import { unstable_cache } from 'next/cache'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { InvoiceStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

const getContabilidadData = unstable_cache(
    async () =>
        withPrismaRetry(() =>
            Promise.all([
                prisma.transaction.findMany({
                    include: {
                        invoice: {
                            select: { id: true, invoiceNumber: true }
                        }
                    },
                    orderBy: { date: 'desc' }
                }),
                prisma.invoice.findMany({
                    where: {
                        status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] }
                    },
                    select: {
                        id: true,
                        invoiceNumber: true,
                        amount: true,
                        dueDate: true,
                        status: true,
                        client: { select: { name: true } },
                        project: { select: { name: true } }
                    },
                    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
                    take: 50
                }),
                prisma.invoice.findMany({
                    select: {
                        id: true,
                        invoiceNumber: true,
                        amount: true,
                        client: { select: { name: true } },
                        project: { select: { name: true } }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 120
                })
            ])
        ),
    ['contabilidad-data-v2'],
    { revalidate: 15 }
)

export default async function ContabilidadPage() {
    await requireModuleAccess('contabilidad')
    const [transactions, pendingInvoices, invoices] = await getContabilidadData()

    return <ContabilidadClient initialTransactions={transactions} pendingInvoices={pendingInvoices} invoices={invoices} />
}
