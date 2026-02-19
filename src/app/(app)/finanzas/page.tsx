import { FinanzasClient } from '@/components/finanzas/finanzas-client'
import prisma from '@/lib/prisma'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { unstable_cache } from 'next/cache'

export const dynamic = 'force-dynamic'

const getFinanzasData = unstable_cache(
    async () =>
        withPrismaRetry(() =>
            Promise.all([
                prisma.fixedCost.findMany({
                    orderBy: { dueDate: 'asc' }
                }),
                prisma.payroll.findMany({
                    include: { user: true },
                    orderBy: { paymentDate: 'desc' }
                }),
                prisma.user.findMany({
                    select: { id: true, name: true, email: true, role: true },
                    orderBy: { name: 'asc' }
                })
            ])
        ),
    ['finanzas-data-v1'],
    { revalidate: 15 }
)

export default async function FinanzasPage() {
    await requireModuleAccess('finanzas')

    const [fixedCosts, payroll, users] = await getFinanzasData()

    return (
        <FinanzasClient
            fixedCosts={fixedCosts}
            payroll={payroll}
            users={users}
        />
    )
}
