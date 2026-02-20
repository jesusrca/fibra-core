import { EquipoClient } from '@/components/equipo/equipo-client'
import prisma from '@/lib/prisma'
import { requireModuleAccess } from '@/lib/server-auth'
import { unstable_cache } from 'next/cache'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { toSignedStorageUrl } from '@/lib/storage'

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
    const usersWithSignedAvatar = await Promise.all(
        users.map(async (user) => ({
            ...user,
            avatarUrl: await toSignedStorageUrl(user.avatarUrl, {
                defaultBucket: process.env.SUPABASE_PROFILE_BUCKET || 'profile-images',
                expiresIn: 60 * 60 * 24 * 7
            })
        }))
    )

    return <EquipoClient initialUsers={usersWithSignedAvatar as any} />
}
