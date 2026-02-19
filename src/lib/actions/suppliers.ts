'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getSuppliers() {
    try {
        return await prisma.supplier.findMany({
            orderBy: { name: 'asc' }
        })
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
        const supplier = await prisma.supplier.create({
            data: {
                name: data.name,
                category: data.category,
                city: data.city,
                rating: data.rating,
                contactName: data.contactName,
            }
        })
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
        const supplier = await prisma.supplier.update({
            where: { id },
            data: {
                name: data.name,
                category: data.category,
                city: data.city,
                rating: data.rating,
                contactName: data.contactName,
            }
        })
        revalidatePath('/proveedores')
        return { success: true, supplier }
    } catch (error) {
        console.error('Error updating supplier:', error)
        return { success: false, error: 'Error al actualizar el proveedor' }
    }
}

export async function deleteSupplier(id: string) {
    try {
        await prisma.supplier.delete({
            where: { id }
        })
        revalidatePath('/proveedores')
        return { success: true }
    } catch (error) {
        console.error('Error deleting supplier:', error)
        return { success: false, error: 'Error al eliminar el proveedor' }
    }
}
