import { ContabilidadClient } from '@/components/contabilidad/contabilidad-client'
import prisma from '@/lib/prisma'
import { requireModuleAccess } from '@/lib/server-auth'
import { unstable_cache } from 'next/cache'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { InvoiceStatus } from '@prisma/client'
import { ensureDefaultAccountingBanks } from '@/lib/actions/accounting-settings'

export const dynamic = 'force-dynamic'

async function getActiveBanksCompatible() {
    try {
        return await withPrismaRetry(() =>
            prisma.accountingBank.findMany({
                where: { isActive: true },
                select: { id: true, name: true, code: true, supportedCurrencies: true },
                orderBy: { name: 'asc' },
                take: 120
            })
        )
    } catch (error) {
        const message = error instanceof Error ? error.message : ''
        if (!message.includes('Unknown field `supportedCurrencies`')) throw error

        const legacyBanks = await withPrismaRetry(() =>
            prisma.accountingBank.findMany({
                where: { isActive: true },
                select: { id: true, name: true, code: true },
                orderBy: { name: 'asc' },
                take: 120
            })
        )
        return legacyBanks.map((bank) => ({
            ...bank,
            supportedCurrencies: ['PEN', 'USD']
        }))
    }
}

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
                        issueDate: true,
                        dueDate: true,
                        status: true,
                        paymentMethod: true,
                        paymentCountry: true,
                        quote: {
                            select: {
                                id: true,
                                lead: { select: { companyName: true } }
                            }
                        },
                        client: { select: { name: true } },
                        project: { select: { name: true } }
                    },
                    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
                    take: 120
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
                }),
                prisma.fixedCost.findMany({
                    orderBy: { dueDate: 'asc' },
                    take: 120
                }),
                prisma.payroll.findMany({
                    where: { status: 'PENDING' },
                    select: {
                        id: true,
                        salary: true,
                        bonus: true,
                        status: true,
                        paymentDate: true,
                        user: { select: { id: true, name: true, role: true } }
                    },
                    orderBy: { paymentDate: 'asc' },
                    take: 120
                }),
                prisma.supplierPayment.findMany({
                    where: { status: 'PENDING' },
                    select: {
                        id: true,
                        amount: true,
                        status: true,
                        issueDate: true,
                        paymentDate: true,
                        receiptUrl: true,
                        description: true,
                        supplierWork: {
                            select: {
                                id: true,
                                supplierName: true,
                                serviceProvided: true,
                                project: { select: { id: true, name: true } },
                                supplier: { select: { id: true, name: true } }
                            }
                        }
                    },
                    orderBy: [{ paymentDate: 'asc' }, { issueDate: 'asc' }],
                    take: 180
                }),
                getActiveBanksCompatible()
            ])
        ),
    ['contabilidad-data-v4'],
    { revalidate: 15 }
)

export default async function ContabilidadPage() {
    await requireModuleAccess('contabilidad')
    await ensureDefaultAccountingBanks()

    const [transactions, pendingInvoices, invoices, fixedCosts, pendingPayroll, pendingSupplierPayments, banks] = await getContabilidadData()

    return (
        <ContabilidadClient
            initialTransactions={transactions}
            pendingInvoices={pendingInvoices}
            invoices={invoices}
            fixedCosts={fixedCosts}
            pendingPayroll={pendingPayroll}
            pendingSupplierPayments={pendingSupplierPayments}
            banks={banks}
        />
    )
}
