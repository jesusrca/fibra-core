'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { Role } from '@prisma/client'

export async function getUsers() {
    try {
        return await prisma.user.findMany({
            orderBy: { name: 'asc' }
        })
    } catch (error) {
        console.error('Error fetching users:', error)
        return []
    }
}

export async function createUser(data: {
    name: string
    email: string
    role: Role
    specialty?: string
}) {
    try {
        const user = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                role: data.role,
                specialty: data.specialty,
            }
        })
        revalidatePath('/equipo')
        return { success: true, user }
    } catch (error) {
        console.error('Error creating user:', error)
        return { success: false, error: 'Error al crear el usuario' }
    }
}

export async function updateUser(id: string, data: {
    name: string
    email: string
    role: Role
    specialty?: string
}) {
    try {
        const user = await prisma.user.update({
            where: { id },
            data: {
                name: data.name,
                email: data.email,
                role: data.role,
                specialty: data.specialty,
            }
        })
        revalidatePath('/equipo')
        revalidatePath('/perfil')
        return { success: true, user }
    } catch (error) {
        console.error('Error updating user:', error)
        return { success: false, error: 'Error al actualizar el usuario' }
    }
}

export async function deleteUser(id: string) {
    try {
        await prisma.user.delete({
            where: { id }
        })
        revalidatePath('/equipo')
        return { success: true }
    } catch (error) {
        console.error('Error deleting user:', error)
        return { success: false, error: 'Error al eliminar el usuario' }
    }
}
