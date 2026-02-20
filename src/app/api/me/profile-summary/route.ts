import prisma from '@/lib/prisma'
import { requireAuthUser } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { toSignedStorageUrl } from '@/lib/storage'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
    try {
        const user = await requireAuthUser()
        const profile = await withPrismaRetry(() =>
            prisma.user.findUnique({
                where: { id: user.id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true
                }
            })
        )

        if (!profile) {
            return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })
        }

        const avatarUrl = await toSignedStorageUrl(profile.avatarUrl, {
            defaultBucket: process.env.SUPABASE_PROFILE_BUCKET || 'profile-images',
            expiresIn: 60 * 60 * 24 * 7
        })

        return Response.json({
            id: profile.id,
            name: profile.name,
            email: profile.email,
            avatarUrl
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo obtener el perfil'
        return Response.json({ error: message }, { status: 500 })
    }
}

