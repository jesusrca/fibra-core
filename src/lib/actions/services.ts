'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'

const DEFAULT_SERVICES = [
    {
        name: 'Branding',
        description: 'Desarrollo de identidad de marca y sistema visual.',
        averagePrice: 2500,
        currency: 'USD'
    },
    {
        name: 'Diseño Web',
        description: 'Diseño y prototipado de sitios web corporativos o e-commerce.',
        averagePrice: 3200,
        currency: 'USD'
    },
    {
        name: 'Gestión de Redes Sociales',
        description: 'Planificación, contenido y gestión de canales sociales.',
        averagePrice: 1200,
        currency: 'USD'
    },
    {
        name: 'Producción Audiovisual',
        description: 'Videos, piezas multimedia y producción de contenido audiovisual.',
        averagePrice: 2800,
        currency: 'USD'
    },
    {
        name: 'Campañas de Performance',
        description: 'Gestión de pauta digital enfocada en leads y conversiones.',
        averagePrice: 1800,
        currency: 'USD'
    }
] as const

function normalizeName(name: string) {
    return name.trim().replace(/\s+/g, ' ')
}

export async function ensureDefaultServices() {
    try {
        await withPrismaRetry(() =>
            prisma.serviceCatalog.createMany({
                data: DEFAULT_SERVICES,
                skipDuplicates: true
            })
        )
    } catch (error) {
        console.error('Error ensuring default services:', error)
    }
}

export async function listServicesCatalog() {
    try {
        await requireModuleAccess('marketing')
        return await withPrismaRetry(() =>
            prisma.serviceCatalog.findMany({
                orderBy: [{ isActive: 'desc' }, { name: 'asc' }]
            })
        )
    } catch (error) {
        console.error('Error listing services catalog:', error)
        return []
    }
}

export async function createServiceCatalog(data: {
    name: string
    description?: string
    averagePrice?: number
    currency?: string
    isActive?: boolean
}) {
    try {
        await requireModuleAccess('marketing')
        const name = normalizeName(data.name || '')
        if (!name) return { success: false, error: 'El nombre del servicio es obligatorio' }

        const duplicate = await withPrismaRetry(() =>
            prisma.serviceCatalog.findFirst({
                where: { name: { equals: name, mode: 'insensitive' } },
                select: { id: true }
            })
        )
        if (duplicate) return { success: false, error: 'Ya existe un servicio con ese nombre' }

        const service = await withPrismaRetry(() =>
            prisma.serviceCatalog.create({
                data: {
                    name,
                    description: (data.description || '').trim() || null,
                    averagePrice: Math.max(Number(data.averagePrice || 0), 0),
                    currency: (data.currency || 'USD').toUpperCase(),
                    isActive: data.isActive ?? true
                }
            })
        )

        revalidatePath('/marketing')
        revalidatePath('/proyectos')
        return { success: true, service }
    } catch (error) {
        console.error('Error creating service catalog:', error)
        return { success: false, error: 'Error al crear el servicio' }
    }
}

export async function updateServiceCatalog(
    id: string,
    data: {
        name: string
        description?: string
        averagePrice?: number
        currency?: string
        isActive?: boolean
    }
) {
    try {
        await requireModuleAccess('marketing')
        const name = normalizeName(data.name || '')
        if (!name) return { success: false, error: 'El nombre del servicio es obligatorio' }

        const duplicate = await withPrismaRetry(() =>
            prisma.serviceCatalog.findFirst({
                where: {
                    id: { not: id },
                    name: { equals: name, mode: 'insensitive' }
                },
                select: { id: true }
            })
        )
        if (duplicate) return { success: false, error: 'Ya existe otro servicio con ese nombre' }

        const service = await withPrismaRetry(() =>
            prisma.serviceCatalog.update({
                where: { id },
                data: {
                    name,
                    description: (data.description || '').trim() || null,
                    averagePrice: Math.max(Number(data.averagePrice || 0), 0),
                    currency: (data.currency || 'USD').toUpperCase(),
                    isActive: data.isActive ?? true
                }
            })
        )

        revalidatePath('/marketing')
        revalidatePath('/proyectos')
        return { success: true, service }
    } catch (error) {
        console.error('Error updating service catalog:', error)
        return { success: false, error: 'Error al actualizar el servicio' }
    }
}
