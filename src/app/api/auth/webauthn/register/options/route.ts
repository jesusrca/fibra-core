import { NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { env } from '@/env.mjs'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const rpName = 'Fibra Core'
const rpID = process.env.NODE_ENV === 'production'
    ? new URL(env.NEXTAUTH_URL || 'https://fibra.studio').hostname
    : 'localhost'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id || !session?.user?.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { id: userId, email } = session.user

        // Fetch existing authenticators for the user
        const userAuthenticators = await prisma.authenticator.findMany({
            where: { userId }
        })

        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userID: new TextEncoder().encode(userId),
            userName: email,
            attestationType: 'none',
            excludeCredentials: userAuthenticators.map((auth: any) => ({
                id: auth.credentialID,
                type: 'public-key',
                transports: auth.transports ? JSON.parse(auth.transports) : undefined,
            })),
            authenticatorSelection: {
                residentKey: 'required',
                userVerification: 'preferred',
                authenticatorAttachment: 'platform',
            },
        })

        // Delete any old challenges and store the new one
        await prisma.webAuthnChallenge.deleteMany({
            where: { userId }
        })

        await prisma.webAuthnChallenge.create({
            data: {
                userId,
                challenge: options.challenge,
                expiresAt: new Date(Date.now() + 60000 * 5) // 5 min expiry
            }
        })

        return NextResponse.json(options)
    } catch (error) {
        console.error('Error in passkey registration options:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
