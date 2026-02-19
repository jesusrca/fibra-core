import { ProjectClient } from '@/components/projects/project-client'
import prisma from '@/lib/prisma'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { unstable_cache } from 'next/cache'
import { ensureDefaultServices } from '@/lib/actions/services'
import { ensureProjectDataQualityNotifications } from '@/lib/data-quality-notifications'

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
                }),
                prisma.serviceCatalog.findMany({
                    where: { isActive: true },
                    orderBy: { name: 'asc' },
                    select: { id: true, name: true }
                })
            ])
        ),
    ['proyectos-data-v2'],
    { revalidate: 15 }
)

export default async function ProyectosPage() {
    const user = await requireModuleAccess('proyectos')
    await ensureDefaultServices()
    await ensureProjectDataQualityNotifications(user.id)

    const [projects, clients, users, services] = await getProyectosData()

    return (
        <ProjectClient
            initialProjects={projects as any[]}
            clients={clients}
            users={users}
            services={services}
        />
    )
}
