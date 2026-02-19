import { Role } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canAccess, Module } from '@/lib/rbac'

export class AuthError extends Error {
    status: number

    constructor(message: string, status: number) {
        super(message)
        this.status = status
    }
}

export async function requireAuthUser() {
    const session = await auth()
    if (!session?.user?.id || !session.user.role) {
        throw new AuthError('No autenticado', 401)
    }

    return {
        id: session.user.id,
        role: session.user.role as Role,
        email: session.user.email || ''
    }
}

export async function requireModuleAccess(module: Module) {
    const user = await requireAuthUser()
    if (!canAccess(user.role, module)) {
        throw new AuthError('No autorizado', 403)
    }
    return user
}

export async function requireAnyRole(roles: Role[]) {
    const user = await requireAuthUser()
    if (!roles.includes(user.role)) {
        throw new AuthError('No autorizado', 403)
    }
    return user
}

