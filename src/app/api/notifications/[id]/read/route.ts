import { requireAuthUser } from '@/lib/server-auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface Context {
    params: Promise<{ id: string }>
}

export async function PATCH(_: Request, { params }: Context) {
    try {
        const user = await requireAuthUser()
        const { id } = await params

        await prisma.notification.updateMany({
            where: {
                id,
                userId: user.id
            },
            data: { read: true }
        })

        return Response.json({ success: true })
    } catch (error) {
        console.error('Notification mark-read API error:', error)
        return Response.json({ success: false }, { status: 500 })
    }
}
