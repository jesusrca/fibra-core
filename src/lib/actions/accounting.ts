'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { Role, TransactionCategory } from '@prisma/client'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { createNotificationForRoles } from '@/lib/notifications'
import { transactionCreateSchema, csvTransactionRowSchema } from '@/lib/validation/schemas'
import { parseCsvText } from '@/lib/csv'

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
        const parsed = transactionCreateSchema.safeParse({
            ...data,
            currency: data.currency || 'PEN',
        })
        if (!parsed.success) {
            const message = parsed.error.issues[0]?.message || 'Datos inválidos para registrar transacción'
            return { success: false, error: message }
        }
        const payload = parsed.data
        const currency = payload.currency
        const normalizedBank = (payload.bank || '').trim()

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

        const dayStart = new Date(payload.date)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(payload.date)
        dayEnd.setHours(23, 59, 59, 999)
        const duplicate = await withPrismaRetry(() =>
            prisma.transaction.findFirst({
                where: {
                    category: payload.category,
                    amount: payload.amount,
                    currency,
                    date: { gte: dayStart, lte: dayEnd },
                    bank: normalizedBank || null,
                    description: payload.description || null
                },
                select: { id: true }
            })
        )
        if (duplicate) {
            return { success: false, error: 'Transacción duplicada detectada (misma fecha/categoría/monto).' }
        }

        const transaction = await withPrismaRetry(() => prisma.transaction.create({
            data: {
                category: payload.category,
                subcategory: payload.subcategory,
                currency,
                bank: normalizedBank || null,
                amount: payload.amount,
                description: payload.description,
                date: payload.date,
                projectId: payload.projectId || null,
                invoiceId: payload.invoiceId || null,
                receiptUrl: payload.receiptUrl || null,
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
        if (payload.projectId) {
            revalidatePath(`/proyectos/${payload.projectId}`)
        }
        return { success: true, transaction }
    } catch (error) {
        console.error('Error creating transaction:', error)
        return { success: false, error: 'Error al crear la transacción' }
    }
}

function normalizeCsvHeader(header: string) {
    return header
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '')
}

function parseCsvDate(raw: string) {
    const value = raw.trim()
    if (!value) return null
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00.000Z`)
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        const [dd, mm, yyyy] = value.split('/')
        return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`)
    }
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed
}

export async function importTransactionsCsv(csvText: string) {
    try {
        await requireModuleAccess('contabilidad')
        const rows = parseCsvText(csvText)
        if (rows.length < 2) return { success: false, error: 'CSV vacío o sin filas de datos' }

        const headers = rows[0].map(normalizeCsvHeader)
        const headerIndex = {
            date: headers.indexOf('fecha'),
            category: headers.indexOf('categoria'),
            subcategory: headers.indexOf('subcategoria'),
            currency: headers.indexOf('moneda'),
            bank: headers.indexOf('banco'),
            amount: headers.indexOf('monto'),
            description: headers.indexOf('descripcion'),
            invoiceNumber: headers.indexOf('factura'),
            projectName: headers.indexOf('proyecto'),
        }

        if (headerIndex.date < 0 || headerIndex.category < 0 || headerIndex.amount < 0) {
            return { success: false, error: 'Faltan columnas obligatorias: Fecha, Categoría y Monto' }
        }

        const errors: string[] = []
        let created = 0

        for (let i = 1; i < rows.length; i += 1) {
            const row = rows[i]
            const line = i + 1
            const parsedDate = parseCsvDate(row[headerIndex.date] || '')
            const parsedAmount = Number((row[headerIndex.amount] || '').replace(/[^\d.-]/g, ''))
            const rawCategory = (row[headerIndex.category] || '').trim().toUpperCase()
            const category =
                rawCategory === 'INGRESO' || rawCategory === 'INCOME'
                    ? TransactionCategory.INCOME
                    : rawCategory === 'GASTO' || rawCategory === 'EXPENSE'
                        ? TransactionCategory.EXPENSE
                        : rawCategory === 'TRANSFERENCIA' || rawCategory === 'TRANSFER'
                            ? TransactionCategory.TRANSFER
                            : null

            if (!parsedDate || Number.isNaN(parsedAmount) || !category) {
                errors.push(`Línea ${line}: fecha, categoría o monto inválido`)
                continue
            }

            let invoiceId: string | undefined
            const invoiceNumber = (row[headerIndex.invoiceNumber] || '').trim()
            if (invoiceNumber) {
                const invoice = await withPrismaRetry(() =>
                    prisma.invoice.findFirst({
                        where: { invoiceNumber: { equals: invoiceNumber, mode: 'insensitive' } },
                        select: { id: true }
                    })
                )
                if (invoice) invoiceId = invoice.id
            }

            let projectId: string | undefined
            const projectName = (row[headerIndex.projectName] || '').trim()
            if (projectName) {
                const project = await withPrismaRetry(() =>
                    prisma.project.findFirst({
                        where: { name: { equals: projectName, mode: 'insensitive' } },
                        select: { id: true }
                    })
                )
                if (project) projectId = project.id
            }

            const parsedRow = csvTransactionRowSchema.safeParse({
                date: parsedDate,
                category,
                subcategory: (row[headerIndex.subcategory] || '').trim() || undefined,
                currency: (row[headerIndex.currency] || 'PEN').trim() || 'PEN',
                bank: (row[headerIndex.bank] || '').trim() || undefined,
                amount: parsedAmount,
                description: (row[headerIndex.description] || '').trim() || undefined,
                invoiceNumber: invoiceNumber || undefined,
                projectName: projectName || undefined,
            })

            if (!parsedRow.success) {
                errors.push(`Línea ${line}: ${parsedRow.error.issues[0]?.message || 'datos inválidos'}`)
                continue
            }

            const createResult = await createTransaction({
                category: parsedRow.data.category,
                subcategory: parsedRow.data.subcategory,
                amount: parsedRow.data.amount,
                description: parsedRow.data.description || '',
                date: parsedRow.data.date,
                projectId,
                currency: parsedRow.data.currency,
                bank: parsedRow.data.bank,
                invoiceId,
            })

            if (!createResult.success) {
                errors.push(`Línea ${line}: ${createResult.error || 'no se pudo guardar'}`)
                continue
            }
            created += 1
        }

        revalidatePath('/contabilidad')
        revalidatePath('/finanzas')
        revalidatePath('/dashboard')

        return {
            success: created > 0,
            created,
            errors,
            error: created === 0 ? (errors[0] || 'No se pudo importar ninguna fila') : undefined
        }
    } catch (error) {
        console.error('Error importing transactions CSV:', error)
        return { success: false, error: 'Error al importar CSV de transacciones' }
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
