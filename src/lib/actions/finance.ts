'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// Fixed Costs Actions
export async function getFixedCosts() {
    try {
        return await prisma.fixedCost.findMany({
            orderBy: { dueDate: 'asc' }
        })
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
        const fixedCost = await prisma.fixedCost.create({
            data
        })
        revalidatePath('/finanzas')
        return { success: true, fixedCost }
    } catch (error) {
        console.error('Error creating fixed cost:', error)
        return { success: false, error: 'Error al crear el costo fijo' }
    }
}

export async function deleteFixedCost(id: string) {
    try {
        await prisma.fixedCost.delete({
            where: { id }
        })
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
        return await prisma.payroll.findMany({
            include: {
                user: true
            },
            orderBy: { paymentDate: 'desc' }
        })
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
        const payroll = await prisma.payroll.create({
            data: {
                ...data,
                status: data.status || 'PENDING'
            }
        })
        revalidatePath('/finanzas')
        return { success: true, payroll }
    } catch (error) {
        console.error('Error creating payroll:', error)
        return { success: false, error: 'Error al crear la nómina' }
    }
}

export async function updatePayrollStatus(id: string, status: string) {
    try {
        await prisma.payroll.update({
            where: { id },
            data: { status }
        })
        revalidatePath('/finanzas')
        return { success: true }
    } catch (error) {
        console.error('Error updating payroll:', error)
        return { success: false, error: 'Error al actualizar la nómina' }
    }
}
