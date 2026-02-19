import { EquipoClient } from '@/components/equipo/equipo-client'
import prisma from '@/lib/prisma'
import { requireModuleAccess } from '@/lib/server-auth'
import { unstable_cache } from 'next/cache'
import { withPrismaRetry } from '@/lib/prisma-retry'

export const dynamic = 'force-dynamic'

const getEquipoData = unstable_cache(
    async () =>
        withPrismaRetry(() =>
            prisma.user.findMany({
                orderBy: { name: 'asc' }
            })
        ),
    ['equipo-data-v1'],
    { revalidate: 15 }
)

export default async function EquipoPage() {
    await requireModuleAccess('equipo')
    const users = await getEquipoData()

    return <EquipoClient initialUsers={users} />
}
