import prisma from '@/lib/prisma'
import { requireModuleAccess } from '@/lib/server-auth'
import { ConfiguracionClient } from '@/components/configuracion/configuracion-client'
import { unstable_cache } from 'next/cache'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { ensureDefaultAccountingBanks } from '@/lib/actions/accounting-settings'

export const dynamic = 'force-dynamic'

const getConfiguracionData = unstable_cache(
    async () =>
        withPrismaRetry(() =>
            Promise.all([
                prisma.user.findMany({
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        telegramId: true
                    },
                    orderBy: { name: 'asc' }
                }),
                prisma.accountingBank.findMany({
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        isActive: true,
                        createdAt: true
                    },
                    orderBy: [{ isActive: 'desc' }, { name: 'asc' }]
                })
            ])
        ),
    ['configuracion-data-v2'],
    { revalidate: 30 }
)

export default async function ConfiguracionPage() {
    await requireModuleAccess('configuracion')
    await ensureDefaultAccountingBanks()

    const [users, accountingBanks] = await getConfiguracionData()

    return <ConfiguracionClient users={users} accountingBanks={accountingBanks} />
}
