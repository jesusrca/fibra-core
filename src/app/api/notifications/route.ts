import { requireAuthUser } from '@/lib/server-auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const user = await requireAuthUser()

        const notifications = await prisma.notification.findMany({
            where: { userId: user.id },
            select: {
                id: true,
                type: true,
                message: true,
                read: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 20
        })

        return Response.json({ notifications })
    } catch (error) {
        console.error('Notifications API error:', error)
        return Response.json({ notifications: [] }, { status: 200 })
    }
}

export async function PATCH() {
    try {
        const user = await requireAuthUser()
        await prisma.notification.updateMany({
            where: {
                userId: user.id,
                read: false
            },
            data: { read: true }
        })
        return Response.json({ success: true })
    } catch (error) {
        console.error('Notifications mark-all-read API error:', error)
        return Response.json({ success: false }, { status: 500 })
    }
}
