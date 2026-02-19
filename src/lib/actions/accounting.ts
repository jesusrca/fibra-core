'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { Role, TransactionCategory } from '@prisma/client'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { createNotificationForRoles } from '@/lib/notifications'

export async function getTransactions() {
    try {
        await requireModuleAccess('contabilidad')
        return await withPrismaRetry(() => prisma.transaction.findMany({
            orderBy: { date: 'desc' }
        }))
    } catch (error) {
        console.error('Error fetching transactions:', error)
        return []
    }
}

export async function createTransaction(data: {
    category: TransactionCategory // INCOME, EXPENSE, TRANSFER
    subcategory?: string
    amount: number
    description: string
    date: Date
    projectId?: string
}) {
    try {
        await requireModuleAccess('contabilidad')
        const transaction = await withPrismaRetry(() => prisma.transaction.create({
            data: {
                category: data.category,
                subcategory: data.subcategory,
                amount: data.amount,
                description: data.description,
                date: data.date,
                projectId: data.projectId,
            }
        }))
        await createNotificationForRoles({
            roles: [Role.ADMIN, Role.GERENCIA, Role.CONTABILIDAD, Role.FINANZAS],
            type: 'finance_update',
            message: `Nueva transacción ${transaction.category}: ${transaction.description || 'Sin descripción'}`
        })
        revalidatePath('/contabilidad')
        revalidatePath('/dashboard')
        revalidatePath('/proyectos')
        if (data.projectId) {
            revalidatePath(`/proyectos/${data.projectId}`)
        }
        return { success: true, transaction }
    } catch (error) {
        console.error('Error creating transaction:', error)
        return { success: false, error: 'Error al crear la transacción' }
    }
}

export async function deleteTransaction(id: string) {
    try {
        await requireModuleAccess('contabilidad')
        await withPrismaRetry(() => prisma.transaction.delete({
            where: { id }
        }))
        revalidatePath('/contabilidad')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error deleting transaction:', error)
        return { success: false, error: 'Error al eliminar la transacción' }
    }
}
