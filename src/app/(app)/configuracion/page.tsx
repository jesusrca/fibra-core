import prisma from '@/lib/prisma'
import { requireModuleAccess } from '@/lib/server-auth'
import { ConfiguracionClient } from '@/components/configuracion/configuracion-client'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionPage() {
    await requireModuleAccess('configuracion')

    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            telegramId: true
        },
        orderBy: { name: 'asc' }
    })

    return <ConfiguracionClient users={users} />
}
