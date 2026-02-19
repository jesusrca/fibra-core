'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { Role } from '@prisma/client'
import { requireModuleAccess } from '@/lib/server-auth'
import { hashPassword } from '@/lib/password'
import { withPrismaRetry } from '@/lib/prisma-retry'

export async function getUsers() {
    try {
        await requireModuleAccess('equipo')
        return await withPrismaRetry(() => prisma.user.findMany({
            orderBy: { name: 'asc' }
        }))
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
    password?: string
}) {
    try {
        await requireModuleAccess('equipo')
        const password = data.password || 'Admin1234!'
        const user = await withPrismaRetry(() => prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                role: data.role,
                specialty: data.specialty,
                passwordHash: hashPassword(password),
            }
        }))
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
    password?: string
}) {
    try {
        await requireModuleAccess('equipo')
        const user = await withPrismaRetry(() => prisma.user.update({
            where: { id },
            data: {
                name: data.name,
                email: data.email,
                role: data.role,
                specialty: data.specialty,
                ...(data.password ? { passwordHash: hashPassword(data.password) } : {})
            }
        }))
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
        await requireModuleAccess('equipo')
        await withPrismaRetry(() => prisma.user.delete({
            where: { id }
        }))
        revalidatePath('/equipo')
        return { success: true }
    } catch (error) {
        console.error('Error deleting user:', error)
        return { success: false, error: 'Error al eliminar el usuario' }
    }
}
