'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { TransactionCategory } from '@prisma/client'

export async function getTransactions() {
    try {
        return await prisma.transaction.findMany({
            orderBy: { date: 'desc' }
        })
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
        const transaction = await prisma.transaction.create({
            data: {
                category: data.category,
                subcategory: data.subcategory,
                amount: data.amount,
                description: data.description,
                date: data.date,
                projectId: data.projectId,
            }
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
        await prisma.transaction.delete({
            where: { id }
        })
        revalidatePath('/contabilidad')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error deleting transaction:', error)
        return { success: false, error: 'Error al eliminar la transacción' }
    }
}
