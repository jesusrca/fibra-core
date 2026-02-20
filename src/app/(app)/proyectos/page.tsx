import { ProjectClient } from '@/components/projects/project-client'
import prisma from '@/lib/prisma'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { unstable_cache } from 'next/cache'
import { ensureDefaultServices } from '@/lib/actions/services'
import { ensureProjectDataQualityNotifications } from '@/lib/data-quality-notifications'
import { ProjectStatus } from '@prisma/client'
import { paginationQuerySchema } from '@/lib/validation/schemas'

export const dynamic = 'force-dynamic'

type PageSearchParams = Record<string, string | string[] | undefined>

function firstParam(value: string | string[] | undefined) {
    if (Array.isArray(value)) return value[0]
    return value
}

const getProyectosData = unstable_cache(
    async (page: number, pageSize: number, q: string, status: string) =>
        withPrismaRetry(() =>
            Promise.all([
                prisma.project.findMany({
                    where: {
                        ...(status !== 'ALL' ? { status: status as ProjectStatus } : {}),
                        ...(q
                            ? {
                                OR: [
                                    { name: { contains: q, mode: 'insensitive' } },
                                    { serviceType: { contains: q, mode: 'insensitive' } },
                                    { client: { name: { contains: q, mode: 'insensitive' } } },
                                ]
                            }
                            : {}),
                    },
                    include: {
                        client: true,
                        director: true,
                        milestones: true
                    },
                    orderBy: { updatedAt: 'desc' },
                    skip: (page - 1) * pageSize,
                    take: pageSize
                }),
                prisma.project.count({
                    where: {
                        ...(status !== 'ALL' ? { status: status as ProjectStatus } : {}),
                        ...(q
                            ? {
                                OR: [
                                    { name: { contains: q, mode: 'insensitive' } },
                                    { serviceType: { contains: q, mode: 'insensitive' } },
                                    { client: { name: { contains: q, mode: 'insensitive' } } },
                                ]
                            }
                            : {}),
                    },
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
    ['proyectos-data-v3'],
    { revalidate: 15 }
)

export default async function ProyectosPage({ searchParams }: { searchParams?: PageSearchParams }) {
    const user = await requireModuleAccess('proyectos')
    await ensureDefaultServices()
    await ensureProjectDataQualityNotifications(user.id)

    const query = paginationQuerySchema.parse({
        page: firstParam(searchParams?.page),
        pageSize: firstParam(searchParams?.pageSize) || '20',
        q: firstParam(searchParams?.q) || '',
        status: firstParam(searchParams?.status) || 'ALL',
    })
    const status = query.status.toUpperCase()
    const allowedStatuses = new Set(['ALL', ...Object.values(ProjectStatus)])
    const safeStatus = allowedStatuses.has(status) ? status : 'ALL'

    const [projects, totalProjects, clients, users, services] = await getProyectosData(query.page, query.pageSize, query.q, safeStatus)
    const totalPages = Math.max(1, Math.ceil(totalProjects / query.pageSize))

    return (
        <ProjectClient
            initialProjects={projects}
            clients={clients}
            users={users}
            services={services}
            filters={{ q: query.q, status: safeStatus, page: query.page, pageSize: query.pageSize }}
            pagination={{ total: totalProjects, totalPages }}
        />
    )
}
