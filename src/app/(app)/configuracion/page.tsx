import prisma from '@/lib/prisma'
import { requireModuleAccess } from '@/lib/server-auth'
import { ConfiguracionClient } from '@/components/configuracion/configuracion-client'
import { unstable_cache } from 'next/cache'
import { withPrismaRetry } from '@/lib/prisma-retry'

export const dynamic = 'force-dynamic'

const getConfiguracionData = unstable_cache(
    async () =>
        withPrismaRetry(() =>
            prisma.user.findMany({
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    telegramId: true
                },
                orderBy: { name: 'asc' }
            })
        ),
    ['configuracion-data-v1'],
    { revalidate: 30 }
)

export default async function ConfiguracionPage() {
    await requireModuleAccess('configuracion')

    const users = await getConfiguracionData()

    return <ConfiguracionClient users={users} />
}
