import { ProjectClient } from '@/components/projects/project-client'
import prisma from '@/lib/prisma'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { unstable_cache } from 'next/cache'

export const dynamic = 'force-dynamic'

const getProyectosData = unstable_cache(
    async () =>
        withPrismaRetry(() =>
            Promise.all([
                prisma.project.findMany({
                    include: {
                        client: true,
                        director: true,
                        milestones: true
                    },
                    orderBy: { updatedAt: 'desc' }
                }),
                prisma.client.findMany({
                    orderBy: { name: 'asc' }
                }),
                prisma.user.findMany({
                    orderBy: { name: 'asc' },
                    select: { id: true, name: true, email: true, role: true }
                })
            ])
        ),
    ['proyectos-data-v1'],
    { revalidate: 15 }
)

export default async function ProyectosPage() {
    await requireModuleAccess('proyectos')

    const [projects, clients, users] = await getProyectosData()

    return (
        <ProjectClient
            initialProjects={projects as any[]}
            clients={clients}
            users={users}
        />
    )
}
