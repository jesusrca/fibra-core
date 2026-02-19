'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'

const DEFAULT_BANKS = [
    { name: 'BCP', code: 'BCP' },
    { name: 'Interbank', code: 'IBK' },
    { name: 'BBVA', code: 'BBVA' },
    { name: 'Scotiabank', code: 'SCOTIA' },
    { name: 'Banco de la Nación', code: 'BN' }
] as const

function normalizeText(value: string) {
    return value.trim().replace(/\s+/g, ' ')
}

export async function ensureDefaultAccountingBanks() {
    try {
        await withPrismaRetry(() =>
            prisma.accountingBank.createMany({
                data: DEFAULT_BANKS,
                skipDuplicates: true
            })
        )
    } catch (error) {
        console.error('Error ensuring default accounting banks:', error)
    }
}

export async function createAccountingBank(data: { name: string; code?: string; isActive?: boolean }) {
    try {
        await requireModuleAccess('configuracion')
        const name = normalizeText(data.name || '')
        if (!name) return { success: false, error: 'El nombre del banco es obligatorio' }

        const duplicate = await withPrismaRetry(() =>
            prisma.accountingBank.findFirst({
                where: { name: { equals: name, mode: 'insensitive' } },
                select: { id: true }
            })
        )
        if (duplicate) return { success: false, error: 'Ya existe un banco con ese nombre' }

        const bank = await withPrismaRetry(() =>
            prisma.accountingBank.create({
                data: {
                    name,
                    code: normalizeText(data.code || '') || null,
                    isActive: data.isActive ?? true
                }
            })
        )

        revalidatePath('/configuracion')
        revalidatePath('/contabilidad')
        return { success: true, bank }
    } catch (error) {
        console.error('Error creating accounting bank:', error)
        return { success: false, error: 'Error al crear el banco' }
    }
}

export async function updateAccountingBank(id: string, data: { name: string; code?: string; isActive?: boolean }) {
    try {
        await requireModuleAccess('configuracion')
        const name = normalizeText(data.name || '')
        if (!name) return { success: false, error: 'El nombre del banco es obligatorio' }

        const duplicate = await withPrismaRetry(() =>
            prisma.accountingBank.findFirst({
                where: {
                    id: { not: id },
                    name: { equals: name, mode: 'insensitive' }
                },
                select: { id: true }
            })
        )
        if (duplicate) return { success: false, error: 'Ya existe otro banco con ese nombre' }

        const bank = await withPrismaRetry(() =>
            prisma.accountingBank.update({
                where: { id },
                data: {
                    name,
                    code: normalizeText(data.code || '') || null,
                    isActive: data.isActive ?? true
                }
            })
        )

        revalidatePath('/configuracion')
        revalidatePath('/contabilidad')
        return { success: true, bank }
    } catch (error) {
        console.error('Error updating accounting bank:', error)
        return { success: false, error: 'Error al actualizar el banco' }
    }
}

export async function deleteAccountingBank(id: string) {
    try {
        await requireModuleAccess('configuracion')

        const bank = await withPrismaRetry(() =>
            prisma.accountingBank.findUnique({
                where: { id },
                select: { id: true, name: true }
            })
        )
        if (!bank) return { success: false, error: 'Banco no encontrado' }

        const linkedTransactions = await withPrismaRetry(() =>
            prisma.transaction.count({
                where: { bank: { equals: bank.name, mode: 'insensitive' } }
            })
        )
        if (linkedTransactions > 0) {
            return { success: false, error: 'No se puede eliminar: hay transacciones asociadas a este banco' }
        }

        await withPrismaRetry(() => prisma.accountingBank.delete({ where: { id } }))
        revalidatePath('/configuracion')
        revalidatePath('/contabilidad')
        return { success: true }
    } catch (error) {
        console.error('Error deleting accounting bank:', error)
        return { success: false, error: 'Error al eliminar el banco' }
    }
}
