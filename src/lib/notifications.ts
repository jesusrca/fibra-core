import prisma from '@/lib/prisma'
import { Role } from '@prisma/client'

export async function createNotificationForRoles(args: {
    roles: Role[]
    type: string
    message: string
}) {
    const users = await prisma.user.findMany({
        where: { role: { in: args.roles } },
        select: { id: true }
    })

    if (!users.length) return

    await prisma.notification.createMany({
        data: users.map((u) => ({
            userId: u.id,
            type: args.type,
            message: args.message
        }))
    })
}

export async function createNotificationForUser(args: {
    userId: string
    type: string
    message: string
}) {
    await prisma.notification.create({
        data: {
            userId: args.userId,
            type: args.type,
            message: args.message
        }
    })
}

export async function createNotificationForUserOnce(args: {
    userId: string
    type: string
    message: string
    dedupeHours?: number
}) {
    const dedupeHours = args.dedupeHours ?? 12
    const since = new Date(Date.now() - dedupeHours * 60 * 60 * 1000)

    const existing = await prisma.notification.findFirst({
        where: {
            userId: args.userId,
            type: args.type,
            createdAt: { gte: since }
        },
        select: { id: true }
    })

    if (existing) return { created: false as const }

    await prisma.notification.create({
        data: {
            userId: args.userId,
            type: args.type,
            message: args.message
        }
    })

    return { created: true as const }
}
