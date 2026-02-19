'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'

function normalizePlatform(value: string) {
    return value.trim().toUpperCase().replace(/\s+/g, '_')
}

function toSafeInt(value: number | string | undefined) {
    const n = Number(value ?? 0)
    if (!Number.isFinite(n)) return 0
    return Math.max(Math.round(n), 0)
}

export async function createSocialMetric(data: {
    platform: string
    followers?: number
    impressions?: number
    interactions?: number
    clicks?: number
    leads?: number
    recordedAt?: Date
    notes?: string
}) {
    try {
        await requireModuleAccess('marketing')
        const platform = normalizePlatform(data.platform || '')
        if (!platform) return { success: false, error: 'La plataforma es obligatoria' }

        const metric = await withPrismaRetry(() =>
            prisma.socialMetric.create({
                data: {
                    platform,
                    followers: toSafeInt(data.followers),
                    impressions: toSafeInt(data.impressions),
                    interactions: toSafeInt(data.interactions),
                    clicks: toSafeInt(data.clicks),
                    leads: toSafeInt(data.leads),
                    recordedAt: data.recordedAt || new Date(),
                    notes: (data.notes || '').trim() || null
                }
            })
        )

        revalidatePath('/marketing')
        return { success: true, metric }
    } catch (error) {
        console.error('Error creating social metric:', error)
        return { success: false, error: 'Error al crear la métrica social' }
    }
}

export async function updateSocialMetric(id: string, data: {
    platform: string
    followers?: number
    impressions?: number
    interactions?: number
    clicks?: number
    leads?: number
    recordedAt?: Date
    notes?: string
}) {
    try {
        await requireModuleAccess('marketing')
        const platform = normalizePlatform(data.platform || '')
        if (!platform) return { success: false, error: 'La plataforma es obligatoria' }

        const metric = await withPrismaRetry(() =>
            prisma.socialMetric.update({
                where: { id },
                data: {
                    platform,
                    followers: toSafeInt(data.followers),
                    impressions: toSafeInt(data.impressions),
                    interactions: toSafeInt(data.interactions),
                    clicks: toSafeInt(data.clicks),
                    leads: toSafeInt(data.leads),
                    recordedAt: data.recordedAt || new Date(),
                    notes: (data.notes || '').trim() || null
                }
            })
        )

        revalidatePath('/marketing')
        return { success: true, metric }
    } catch (error) {
        console.error('Error updating social metric:', error)
        return { success: false, error: 'Error al actualizar la métrica social' }
    }
}

export async function deleteSocialMetric(id: string) {
    try {
        await requireModuleAccess('marketing')
        await withPrismaRetry(() =>
            prisma.socialMetric.delete({
                where: { id }
            })
        )

        revalidatePath('/marketing')
        return { success: true }
    } catch (error) {
        console.error('Error deleting social metric:', error)
        return { success: false, error: 'Error al eliminar la métrica social' }
    }
}
