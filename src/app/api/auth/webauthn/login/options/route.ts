import { NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { env } from '@/env.mjs'
import prisma from '@/lib/prisma'

const rpID = process.env.NODE_ENV === 'production'
    ? new URL(env.NEXTAUTH_URL || 'https://fibra.studio').hostname
    : 'localhost'

export async function POST(req: Request) {
    try {
        const { email } = await req.json()
        if (!email) {
            return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: { authenticators: true } as any
        })

        if (!user || user.authenticators.length === 0) {
            return NextResponse.json({ error: 'No se encontraron passkeys para este usuario' }, { status: 404 })
        }

        const options = await generateAuthenticationOptions({
            rpID,
            allowCredentials: user.authenticators.map((auth: any) => ({
                id: auth.credentialID, // ID will be string, simplewebauthn expects Uint8Array or Base64URLString depending on version, string is fine if its base64url usually.
                type: 'public-key',
                transports: auth.transports ? JSON.parse(auth.transports) : undefined,
            })),
            userVerification: 'preferred',
        })

        // Delete any old challenges and store the new one
        await prisma.webAuthnChallenge.deleteMany({
            where: { userId: user.id }
        })

        await prisma.webAuthnChallenge.create({
            data: {
                userId: user.id,
                challenge: options.challenge,
                expiresAt: new Date(Date.now() + 60000 * 5) // 5 min expiry
            }
        })

        return NextResponse.json(options)
    } catch (error) {
        console.error('Error generating passkey authentication options:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
