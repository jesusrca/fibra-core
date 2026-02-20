'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { Role } from '@prisma/client'
import { requireAuthUser, requireModuleAccess } from '@/lib/server-auth'
import { hashPassword } from '@/lib/password'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { verifyPassword } from '@/lib/password'

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
    phone?: string
    country?: string
    birthday?: Date
    timezone?: string
    schedule?: string
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
                specialty: data.specialty || null,
                phone: data.phone || null,
                country: data.country || null,
                birthday: data.birthday || null,
                timezone: data.timezone || null,
                schedule: data.schedule || null,
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
    phone?: string
    country?: string
    birthday?: Date
    timezone?: string
    schedule?: string
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
                specialty: data.specialty || null,
                phone: data.phone || null,
                country: data.country || null,
                birthday: data.birthday || null,
                timezone: data.timezone || null,
                schedule: data.schedule || null,
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

export async function getMyProfile() {
    try {
        const user = await requireAuthUser()
        const profile = await withPrismaRetry(() =>
            prisma.user.findUnique({
                where: { id: user.id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    avatarUrl: true,
                    phone: true,
                    country: true,
                    timezone: true,
                    specialty: true,
                    birthday: true,
                    createdAt: true
                }
            })
        )
        return profile
    } catch (error) {
        const message = error instanceof Error ? error.message : ''
        if (message.includes('avatarUrl')) {
            try {
                const user = await requireAuthUser()
                const profile = await withPrismaRetry(() =>
                    prisma.user.findUnique({
                        where: { id: user.id },
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                            phone: true,
                            country: true,
                            timezone: true,
                            specialty: true,
                            birthday: true,
                            createdAt: true
                        }
                    })
                )
                if (!profile) return null
                return {
                    ...profile,
                    avatarUrl: null
                }
            } catch (fallbackError) {
                console.error('Error fetching my profile (fallback):', fallbackError)
                return null
            }
        }
        console.error('Error fetching my profile:', error)
        return null
    }
}

export async function updateMyProfile(data: {
    name: string
    phone?: string
    country?: string
    timezone?: string
    specialty?: string
    birthday?: Date
    avatarUrl?: string
}) {
    try {
        const user = await requireAuthUser()
        const name = (data.name || '').trim()
        if (!name) return { success: false, error: 'El nombre es obligatorio' }

        await withPrismaRetry(() => prisma.user.update({
            where: { id: user.id },
            data: {
                name,
                phone: (data.phone || '').trim() || null,
                country: (data.country || '').trim() || null,
                timezone: (data.timezone || '').trim() || null,
                specialty: (data.specialty || '').trim() || null,
                birthday: data.birthday || null,
                avatarUrl: (data.avatarUrl || '').trim() || null
            }
        }))

        revalidatePath('/perfil')
        return { success: true }
    } catch (error) {
        console.error('Error updating my profile:', error)
        return { success: false, error: 'No se pudo actualizar el perfil' }
    }
}

export async function updateMyPassword(data: {
    currentPassword: string
    newPassword: string
}) {
    try {
        const user = await requireAuthUser()
        const currentPassword = (data.currentPassword || '').trim()
        const newPassword = (data.newPassword || '').trim()

        if (!currentPassword || !newPassword) {
            return { success: false, error: 'Completa la contraseña actual y la nueva' }
        }
        if (newPassword.length < 8) {
            return { success: false, error: 'La nueva contraseña debe tener al menos 8 caracteres' }
        }

        const dbUser = await withPrismaRetry(() =>
            prisma.user.findUnique({
                where: { id: user.id },
                select: { id: true, passwordHash: true }
            })
        )
        if (!dbUser?.passwordHash) {
            return { success: false, error: 'No se pudo validar la contraseña actual' }
        }

        const valid = verifyPassword(currentPassword, dbUser.passwordHash)
        if (!valid) return { success: false, error: 'La contraseña actual no es correcta' }

        if (verifyPassword(newPassword, dbUser.passwordHash)) {
            return { success: false, error: 'La nueva contraseña debe ser diferente a la actual' }
        }

        await withPrismaRetry(() =>
            prisma.user.update({
                where: { id: user.id },
                data: { passwordHash: hashPassword(newPassword) }
            })
        )

        revalidatePath('/perfil')
        return { success: true }
    } catch (error) {
        console.error('Error updating my password:', error)
        return { success: false, error: 'No se pudo actualizar la contraseña' }
    }
}
