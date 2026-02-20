'use server'

import { createHash, randomBytes } from 'crypto'
import prisma from '@/lib/prisma'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { hashPassword } from '@/lib/password'
import { sendSystemEmailByBrevo } from '@/lib/brevo'

function hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex')
}

function getBaseUrl() {
    const appUrl = (process.env.APP_URL || process.env.NEXTAUTH_URL || '').trim()
    return appUrl || 'http://localhost:3000'
}

export async function requestPasswordReset(email: string) {
    const normalizedEmail = (email || '').trim().toLowerCase()
    if (!normalizedEmail) return { success: true }

    const user = await withPrismaRetry(() =>
        prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true, name: true, email: true }
        })
    )
    // Do not leak user existence.
    if (!user) return { success: true }

    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await withPrismaRetry(() =>
        prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt
            }
        })
    )

    const resetUrl = `${getBaseUrl().replace(/\/+$/, '')}/reset-password?token=${rawToken}`
    const sendResult = await sendSystemEmailByBrevo({
        to: user.email,
        subject: 'Restablece tu contraseña - Fibra Core',
        text: [
            `Hola ${user.name || 'usuario'},`,
            '',
            'Recibimos una solicitud para restablecer tu contraseña.',
            `Haz clic aquí para continuar: ${resetUrl}`,
            '',
            'Este enlace expira en 60 minutos.',
            'Si no solicitaste este cambio, ignora este correo.'
        ].join('\n')
    })

    if (!sendResult.success) {
        console.error('Brevo password reset send error:', sendResult.error)
    }

    return { success: true }
}

export async function resetPasswordWithToken(input: {
    token: string
    password: string
}) {
    const token = (input.token || '').trim()
    const password = (input.password || '').trim()
    if (!token) return { success: false, error: 'Token inválido' }
    if (password.length < 8) return { success: false, error: 'La contraseña debe tener al menos 8 caracteres' }

    const tokenHash = hashToken(token)
    const now = new Date()

    const dbToken = await withPrismaRetry(() =>
        prisma.passwordResetToken.findUnique({
            where: { tokenHash },
            select: { id: true, userId: true, expiresAt: true, usedAt: true }
        })
    )

    if (!dbToken || dbToken.usedAt || dbToken.expiresAt < now) {
        return { success: false, error: 'Token inválido o expirado' }
    }

    await withPrismaRetry(() =>
        prisma.$transaction([
            prisma.user.update({
                where: { id: dbToken.userId },
                data: { passwordHash: hashPassword(password) }
            }),
            prisma.passwordResetToken.update({
                where: { id: dbToken.id },
                data: { usedAt: new Date() }
            })
        ])
    )

    return { success: true }
}

