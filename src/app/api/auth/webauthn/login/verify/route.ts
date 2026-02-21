import { NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { env } from '@/env.mjs'
import prisma from '@/lib/prisma'

const rpID = process.env.NODE_ENV === 'production'
    ? new URL(env.NEXTAUTH_URL || 'https://fibra.studio').hostname
    : 'localhost'

const origin = process.env.NODE_ENV === 'production'
    ? (env.NEXTAUTH_URL || 'https://fibra.studio')
    : 'http://localhost:3000'

export async function POST(req: Request) {
    try {
        const { email, response } = await req.json()

        if (!email || !response) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
        }

        const user: any = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: { authenticators: true } as any
        })

        if (!user) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
        }

        // Retrieve challenge
        const challengeRecord = await prisma.webAuthnChallenge.findFirst({
            where: {
                userId: user.id,
                expiresAt: { gt: new Date() }
            },
            orderBy: { createdAt: 'desc' }
        })

        if (!challengeRecord) {
            return NextResponse.json({ error: 'Challenge expirado o no encontrado' }, { status: 400 })
        }

        const authenticator = user.authenticators.find(
            (auth: any) => auth.credentialID === response.id
        )

        if (!authenticator) {
            return NextResponse.json({ error: 'Passkey no reconocido' }, { status: 400 })
        }

        let verification;
        try {
            verification = await verifyAuthenticationResponse({
                response,
                expectedChallenge: challengeRecord.challenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
                credential: {
                    id: authenticator.credentialID,
                    publicKey: Buffer.from(authenticator.credentialPublicKey, 'base64url'),
                    counter: authenticator.counter,
                    transports: authenticator.transports ? JSON.parse(authenticator.transports) : undefined,
                },
            } as any);
        } catch (error) {
            console.error(error);
            return NextResponse.json({ error: 'Fallo al verificar credencial de inicio de sesión' }, { status: 400 });
        }

        const { verified, authenticationInfo } = verification;

        if (verified && authenticationInfo) {
            // Update global counter for replay attack protection
            await prisma.authenticator.update({
                where: { credentialID: authenticator.credentialID },
                data: { counter: authenticationInfo.newCounter }
            })

            // Validated, delete the challenge
            await prisma.webAuthnChallenge.delete({
                where: { id: challengeRecord.id }
            })

            // TODO: We need a mechanism to tell NextAuth to authorize this user
            // For now, we return success. A Credentials "Passkey" provider in NextAuth will check this logic natively
            // So this endpoint might be redundant if we do it all via a standard NextAuth 'CredentialsProvider' specialized in Passkeys.
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'No se pudo verificar la credencial' }, { status: 400 })
    } catch (error) {
        console.error('Error verifying passkey authentication:', error)
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
    }
}
