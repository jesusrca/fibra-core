'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'

function monthBounds(referenceDate: Date) {
    const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
    const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1)
    return { start, end }
}

export async function ensureMonthlyPayroll(referenceDate = new Date()) {
    try {
        await requireModuleAccess('finanzas')
        const { start, end } = monthBounds(referenceDate)

        const users = await withPrismaRetry(() =>
            prisma.user.findMany({
                select: { id: true },
                orderBy: { createdAt: 'asc' },
                take: 200
            })
        )

        let created = 0
        for (const user of users) {
            const existsThisMonth = await withPrismaRetry(() =>
                prisma.payroll.findFirst({
                    where: {
                        userId: user.id,
                        paymentDate: {
                            gte: start,
                            lt: end
                        }
                    },
                    select: { id: true }
                })
            )
            if (existsThisMonth) continue

            const latest = await withPrismaRetry(() =>
                prisma.payroll.findFirst({
                    where: { userId: user.id },
                    orderBy: { paymentDate: 'desc' },
                    select: { salary: true }
                })
            )

            if (!latest || latest.salary <= 0) continue

            await withPrismaRetry(() =>
                prisma.payroll.create({
                    data: {
                        userId: user.id,
                        salary: latest.salary,
                        bonus: 0,
                        status: 'PENDING',
                        paymentDate: start
                    }
                })
            )
            created += 1
        }

        if (created > 0) {
            revalidatePath('/finanzas')
            revalidatePath('/dashboard')
        }

        return { success: true as const, created }
    } catch (error) {
        console.error('Error ensuring monthly payroll:', error)
        return { success: false as const, created: 0 }
    }
}

// Fixed Costs Actions
export async function getFixedCosts() {
    try {
        await requireModuleAccess('finanzas')
        return await withPrismaRetry(() => prisma.fixedCost.findMany({
            orderBy: { dueDate: 'asc' }
        }))
    } catch (error) {
        console.error('Error fetching fixed costs:', error)
        return []
    }
}

export async function createFixedCost(data: {
    name: string
    category: string
    amount: number
    dueDate: Date
}) {
    try {
        await requireModuleAccess('finanzas')
        const fixedCost = await withPrismaRetry(() => prisma.fixedCost.create({
            data
        }))
        revalidatePath('/finanzas')
        return { success: true, fixedCost }
    } catch (error) {
        console.error('Error creating fixed cost:', error)
        return { success: false, error: 'Error al crear el costo fijo' }
    }
}

export async function deleteFixedCost(id: string) {
    try {
        await requireModuleAccess('finanzas')
        await withPrismaRetry(() => prisma.fixedCost.delete({
            where: { id }
        }))
        revalidatePath('/finanzas')
        return { success: true }
    } catch (error) {
        console.error('Error deleting fixed cost:', error)
        return { success: false, error: 'Error al eliminar el costo fijo' }
    }
}

// Payroll Actions
export async function getPayroll() {
    try {
        await requireModuleAccess('finanzas')
        return await withPrismaRetry(() => prisma.payroll.findMany({
            include: {
                user: true
            },
            orderBy: { paymentDate: 'desc' }
        }))
    } catch (error) {
        console.error('Error fetching payroll:', error)
        return []
    }
}

export async function createPayroll(data: {
    userId: string
    salary: number
    bonus: number
    paymentDate: Date
    status?: string
}) {
    try {
        await requireModuleAccess('finanzas')
        const payroll = await withPrismaRetry(() => prisma.payroll.create({
            data: {
                ...data,
                status: data.status || 'PENDING'
            }
        }))
        revalidatePath('/finanzas')
        return { success: true, payroll }
    } catch (error) {
        console.error('Error creating payroll:', error)
        return { success: false, error: 'Error al crear la nómina' }
    }
}

export async function updatePayrollStatus(id: string, status: string) {
    try {
        await requireModuleAccess('finanzas')
        await withPrismaRetry(() => prisma.payroll.update({
            where: { id },
            data: { status }
        }))
        revalidatePath('/finanzas')
        return { success: true }
    } catch (error) {
        console.error('Error updating payroll:', error)
        return { success: false, error: 'Error al actualizar la nómina' }
    }
}
