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
    currency?: string
    bank?: string
    invoiceId?: string
    receiptUrl?: string
}) {
    try {
        await requireModuleAccess('contabilidad')
        const currency = (data.currency || 'PEN').toUpperCase()
        const normalizedBank = (data.bank || '').trim()

        if (normalizedBank) {
            let bank: { id: string; name: string; supportedCurrencies: string[] } | null = null
            try {
                bank = await withPrismaRetry(() =>
                    prisma.accountingBank.findFirst({
                        where: {
                            name: { equals: normalizedBank, mode: 'insensitive' },
                            isActive: true
                        },
                        select: { id: true, name: true, supportedCurrencies: true }
                    })
                )
            } catch (error) {
                const message = error instanceof Error ? error.message : ''
                if (!message.includes('Unknown field `supportedCurrencies`')) throw error
                const legacyBank = await withPrismaRetry(() =>
                    prisma.accountingBank.findFirst({
                        where: {
                            name: { equals: normalizedBank, mode: 'insensitive' },
                            isActive: true
                        },
                        select: { id: true, name: true }
                    })
                )
                bank = legacyBank ? { ...legacyBank, supportedCurrencies: ['PEN', 'USD'] } : null
            }
            if (!bank) return { success: false, error: 'Banco inválido o inactivo. Configúralo en Configuración > Contabilidad.' }
            if (!bank.supportedCurrencies.includes(currency)) {
                return { success: false, error: `El banco ${bank.name} no tiene habilitada la moneda ${currency}.` }
            }
        }

        const transaction = await withPrismaRetry(() => prisma.transaction.create({
            data: {
                category: data.category,
                subcategory: data.subcategory,
                currency,
                bank: normalizedBank || null,
                amount: data.amount,
                description: data.description,
                date: data.date,
                projectId: data.projectId,
                invoiceId: data.invoiceId || null,
                receiptUrl: data.receiptUrl || null,
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
