'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'

export async function getSuppliers() {
    try {
        await requireModuleAccess('proveedores')
        return await withPrismaRetry(() => prisma.supplier.findMany({
            orderBy: { name: 'asc' }
        }))
    } catch (error) {
        console.error('Error fetching suppliers:', error)
        return []
    }
}

export async function createSupplier(data: {
    name: string
    category: string
    city: string
    rating: number
    contactName: string
}) {
    try {
        await requireModuleAccess('proveedores')
        const supplier = await withPrismaRetry(() => prisma.supplier.create({
            data: {
                name: data.name,
                category: data.category,
                city: data.city,
                rating: data.rating,
                contactName: data.contactName,
            }
        }))
        revalidatePath('/proveedores')
        return { success: true, supplier }
    } catch (error) {
        console.error('Error creating supplier:', error)
        return { success: false, error: 'Error al crear el proveedor' }
    }
}

export async function updateSupplier(id: string, data: {
    name: string
    category: string
    city: string
    rating: number
    contactName: string
}) {
    try {
        await requireModuleAccess('proveedores')
        const supplier = await withPrismaRetry(() => prisma.supplier.update({
            where: { id },
            data: {
                name: data.name,
                category: data.category,
                city: data.city,
                rating: data.rating,
                contactName: data.contactName,
            }
        }))
        revalidatePath('/proveedores')
        return { success: true, supplier }
    } catch (error) {
        console.error('Error updating supplier:', error)
        return { success: false, error: 'Error al actualizar el proveedor' }
    }
}

export async function deleteSupplier(id: string) {
    try {
        await requireModuleAccess('proveedores')
        await withPrismaRetry(() => prisma.supplier.delete({
            where: { id }
        }))
        revalidatePath('/proveedores')
        return { success: true }
    } catch (error) {
        console.error('Error deleting supplier:', error)
        return { success: false, error: 'Error al eliminar el proveedor' }
    }
}

export async function createSupplierWork(data: {
    projectId: string
    supplierId?: string
    supplierName?: string
    serviceProvided: string
    totalBudget: number
    installmentsCount?: number
}) {
    try {
        await requireModuleAccess('proyectos')

        let supplierName = (data.supplierName || '').trim()
        const supplierId = data.supplierId?.trim() || undefined

        if (supplierId) {
            const supplier = await withPrismaRetry(() => prisma.supplier.findUnique({
                where: { id: supplierId },
                select: { id: true, name: true }
            }))
            if (!supplier) return { success: false, error: 'Proveedor no encontrado' }
            supplierName = supplier.name
        }

        if (!supplierName) {
            return { success: false, error: 'Debes seleccionar o ingresar un proveedor' }
        }

        const work = await withPrismaRetry(() => prisma.supplierWork.create({
            data: {
                projectId: data.projectId,
                supplierId: supplierId || null,
                supplierName,
                serviceProvided: data.serviceProvided,
                totalBudget: data.totalBudget,
                installmentsCount: Math.max(1, data.installmentsCount || 1)
            }
        }))

        revalidatePath('/proyectos')
        revalidatePath(`/proyectos/${data.projectId}`)
        revalidatePath('/proveedores')
        return { success: true, work }
    } catch (error) {
        console.error('Error creating supplier work:', error)
        return { success: false, error: 'Error al registrar el presupuesto del proveedor' }
    }
}

export async function createSupplierPayment(data: {
    supplierWorkId: string
    amount: number
    status?: string
    issueDate?: Date
    paymentDate?: Date
    receiptUrl?: string
    description?: string
}) {
    try {
        await requireModuleAccess('proyectos')

        const work = await withPrismaRetry(() => prisma.supplierWork.findUnique({
            where: { id: data.supplierWorkId },
            select: { id: true, projectId: true }
        }))
        if (!work) return { success: false, error: 'Trabajo de proveedor no encontrado' }

        const payment = await withPrismaRetry(() => prisma.supplierPayment.create({
            data: {
                supplierWorkId: data.supplierWorkId,
                amount: data.amount,
                status: data.status || 'PENDING',
                issueDate: data.issueDate || new Date(),
                paymentDate: data.paymentDate || null,
                receiptUrl: data.receiptUrl || null,
                description: data.description || null
            }
        }))

        revalidatePath('/proyectos')
        revalidatePath(`/proyectos/${work.projectId}`)
        revalidatePath('/proveedores')
        return { success: true, payment }
    } catch (error) {
        console.error('Error creating supplier payment:', error)
        return { success: false, error: 'Error al registrar el pago al proveedor' }
    }
}
