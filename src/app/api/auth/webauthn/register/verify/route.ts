import { NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { env } from '@/env.mjs'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'

const rpID = process.env.NODE_ENV === 'production'
    ? new URL(env.NEXTAUTH_URL || 'https://fibra.studio').hostname
    : 'localhost'

const origin = process.env.NODE_ENV === 'production'
    ? (env.NEXTAUTH_URL || 'https://fibra.studio')
    : 'http://localhost:3000'

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const userId = session.user.id
        const body = await req.json()

        // Retrieve challenge
        const challengeRecord = await prisma.webAuthnChallenge.findFirst({
            where: {
                userId,
                expiresAt: { gt: new Date() }
            },
            orderBy: { createdAt: 'desc' }
        })

        if (!challengeRecord) {
            return NextResponse.json({ error: 'Challenge expirado o no encontrado' }, { status: 400 })
        }

        let verification;
        try {
            verification = await verifyRegistrationResponse({
                response: body,
                expectedChallenge: challengeRecord.challenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
            });
        } catch (error) {
            console.error(error);
            return NextResponse.json({ error: 'Fallo al verificar credencial' }, { status: 400 });
        }

        const { verified, registrationInfo } = verification;

        if (verified && registrationInfo) {
            const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo;
            const credentialID = credential.id;
            const credentialPublicKey = Buffer.from(credential.publicKey).toString('base64url');

            const newAuthenticator = await prisma.authenticator.create({
                data: {
                    userId,
                    credentialID,
                    credentialPublicKey,
                    counter: 0, // default counter usually starts at 0 or from credential but TS gives no counter
                    credentialDeviceType,
                    credentialBackedUp,
                    providerAccountId: credentialID,
                    transports: JSON.stringify(body.response.transports || []),
                }
            });

            // Validated, delete the challenge
            await prisma.webAuthnChallenge.delete({
                where: { id: challengeRecord.id }
            })

            return NextResponse.json({ success: true, authenticator: newAuthenticator });
        }

        return NextResponse.json({ error: 'No se pudo verificar la credencial' }, { status: 400 })
    } catch (error) {
        console.error('Error verifying passkey registration:', error)
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
    }
}
