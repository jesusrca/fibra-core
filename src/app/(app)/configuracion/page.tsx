import prisma from '@/lib/prisma'
import { requireModuleAccess } from '@/lib/server-auth'
import { ConfiguracionClient } from '@/components/configuracion/configuracion-client'
import { unstable_cache } from 'next/cache'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { ensureDefaultAccountingBanks } from '@/lib/actions/accounting-settings'

export const dynamic = 'force-dynamic'

async function getAccountingBanksCompatible() {
    try {
        return await withPrismaRetry(() =>
            prisma.accountingBank.findMany({
                select: {
                    id: true,
                    name: true,
                    code: true,
                    supportedCurrencies: true,
                    isActive: true,
                    createdAt: true
                },
                orderBy: [{ isActive: 'desc' }, { name: 'asc' }]
            })
        )
    } catch (error) {
        const message = error instanceof Error ? error.message : ''
        if (!message.includes('Unknown field `supportedCurrencies`')) throw error

        const legacyBanks = await withPrismaRetry(() =>
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
        )
        return legacyBanks.map((bank) => ({ ...bank, supportedCurrencies: ['PEN', 'USD'] }))
    }
}

const getConfiguracionData = unstable_cache(
    async (userId: string) =>
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
                getAccountingBanksCompatible(),
                prisma.emailIntegration.findMany({
                    where: { userId },
                    select: {
                        id: true,
                        provider: true,
                        accountEmail: true,
                        isActive: true,
                        lastSyncAt: true,
                        updatedAt: true
                    },
                    orderBy: { updatedAt: 'desc' }
                })
            ])
        ),
    ['configuracion-data-v3'],
    { revalidate: 30 }
)

export default async function ConfiguracionPage() {
    const user = await requireModuleAccess('configuracion')
    await ensureDefaultAccountingBanks()

    const [users, accountingBanks, emailIntegrations] = await getConfiguracionData(user.id)

    return <ConfiguracionClient users={users} accountingBanks={accountingBanks} emailIntegrations={emailIntegrations as any} />
}
