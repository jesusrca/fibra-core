'use server'

import prisma from '@/lib/prisma'
import { requireAuthUser, requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { revalidatePath } from 'next/cache'

function normalizeEmail(value: string) {
    return value.trim().toLowerCase()
}

function parseRecipientEmails(value: string) {
    return value
        .split(',')
        .map((part) => extractEmailFromHeader(part))
        .filter(Boolean)
}

function extractEmailFromHeader(value: string) {
    const trimmed = value.trim()
    const match = trimmed.match(/<([^>]+)>/)
    return normalizeEmail((match?.[1] || trimmed).replace(/"/g, ''))
}

function parseHeaderDate(value?: string | null) {
    if (!value) return new Date()
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return new Date()
    return d
}

function encodeBase64Url(input: string) {
    return Buffer.from(input, 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '')
}

async function refreshGmailAccessToken(args: {
    refreshToken: string
    clientId: string
    clientSecret: string
}) {
    const body = new URLSearchParams({
        client_id: args.clientId,
        client_secret: args.clientSecret,
        refresh_token: args.refreshToken,
        grant_type: 'refresh_token'
    })

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    })

    if (!response.ok) {
        const text = await response.text()
        throw new Error(`No se pudo refrescar token Gmail: ${response.status} ${text}`)
    }

    return response.json() as Promise<{
        access_token: string
        expires_in: number
        scope?: string
        token_type?: string
    }>
}

export async function upsertGmailIntegration(data: {
    accountEmail: string
    refreshToken: string
    clientId?: string
    clientSecret?: string
}) {
    try {
        await requireModuleAccess('configuracion')
        const user = await requireAuthUser()
        const accountEmail = normalizeEmail(data.accountEmail || '')
        if (!accountEmail) return { success: false, error: 'El correo de la cuenta es obligatorio' }
        if (!data.refreshToken?.trim()) return { success: false, error: 'El refresh token es obligatorio' }
        const clientId = (data.clientId || process.env.GOOGLE_CLIENT_ID || '').trim()
        const clientSecret = (data.clientSecret || process.env.GOOGLE_CLIENT_SECRET || '').trim()
        if (!clientId || !clientSecret) return { success: false, error: 'Falta Google Client ID/Secret' }

        const token = await refreshGmailAccessToken({
            refreshToken: data.refreshToken.trim(),
            clientId,
            clientSecret
        })

        const expiresAt = new Date(Date.now() + (token.expires_in || 3600) * 1000)

        const integration = await withPrismaRetry(() =>
            prisma.emailIntegration.upsert({
                where: {
                    userId_provider_accountEmail: {
                        userId: user.id,
                        provider: 'gmail',
                        accountEmail
                    }
                },
                update: {
                    refreshToken: data.refreshToken.trim(),
                    accessToken: token.access_token,
                    tokenExpiresAt: expiresAt,
                    isActive: true
                },
                create: {
                    userId: user.id,
                    provider: 'gmail',
                    accountEmail,
                    refreshToken: data.refreshToken.trim(),
                    accessToken: token.access_token,
                    tokenExpiresAt: expiresAt,
                    isActive: true
                }
            })
        )

        revalidatePath('/configuracion')
        return { success: true, integrationId: integration.id }
    } catch (error) {
        console.error('Error upserting Gmail integration:', error)
        return { success: false, error: 'Error configurando integración Gmail' }
    }
}

export async function disconnectEmailIntegration(integrationId: string) {
    try {
        await requireModuleAccess('configuracion')
        const user = await requireAuthUser()

        await withPrismaRetry(() =>
            prisma.emailIntegration.updateMany({
                where: { id: integrationId, userId: user.id },
                data: { isActive: false }
            })
        )

        revalidatePath('/configuracion')
        return { success: true }
    } catch (error) {
        console.error('Error disconnecting email integration:', error)
        return { success: false, error: 'Error desconectando la integración' }
    }
}

export async function syncGmailEmails() {
    try {
        await requireModuleAccess('configuracion')
        const user = await requireAuthUser()
        const integration = await withPrismaRetry(() =>
            prisma.emailIntegration.findFirst({
                where: {
                    userId: user.id,
                    provider: 'gmail',
                    isActive: true
                },
                orderBy: { updatedAt: 'desc' }
            })
        )

        if (!integration) return { success: false, error: 'No hay integración Gmail activa' }
        if (!integration.refreshToken) return { success: false, error: 'La integración no tiene refresh token' }

        const clientId = process.env.GOOGLE_CLIENT_ID
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET
        if (!clientId || !clientSecret) {
            return { success: false, error: 'Faltan GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET en entorno' }
        }

        const refreshed = await refreshGmailAccessToken({
            refreshToken: integration.refreshToken,
            clientId,
            clientSecret
        })
        const accessToken = refreshed.access_token
        const tokenExpiresAt = new Date(Date.now() + (refreshed.expires_in || 3600) * 1000)

        await withPrismaRetry(() =>
            prisma.emailIntegration.update({
                where: { id: integration.id },
                data: {
                    accessToken,
                    tokenExpiresAt
                }
            })
        )

        const listResp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=25&q=newer_than:30d', {
            headers: { Authorization: `Bearer ${accessToken}` }
        })

        if (!listResp.ok) {
            const text = await listResp.text()
            return { success: false, error: `Error listando emails en Gmail: ${listResp.status} ${text}` }
        }

        const listJson = await listResp.json() as {
            messages?: Array<{ id: string; threadId: string }>
        }
        const messages = listJson.messages || []
        if (messages.length === 0) {
            await withPrismaRetry(() =>
                prisma.emailIntegration.update({
                    where: { id: integration.id },
                    data: { lastSyncAt: new Date() }
                })
            )
            revalidatePath('/comercial')
            revalidatePath('/proyectos')
            return { success: true, synced: 0 }
        }

        let synced = 0

        for (const msg of messages) {
            const detailResp = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=Message-ID`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            )
            if (!detailResp.ok) continue
            const detail = await detailResp.json() as {
                id: string
                threadId?: string
                snippet?: string
                internalDate?: string
                payload?: { headers?: Array<{ name: string; value: string }> }
            }

            const headers = new Map<string, string>()
            ;(detail.payload?.headers || []).forEach((h) => headers.set(h.name.toLowerCase(), h.value))
            const fromEmail = extractEmailFromHeader(headers.get('from') || '')
            const toRaw = headers.get('to') || ''
            const toEmails = toRaw
                .split(',')
                .map((part) => extractEmailFromHeader(part))
                .filter(Boolean)
            const subject = headers.get('subject') || null
            const receivedAt = detail.internalDate
                ? new Date(Number(detail.internalDate))
                : parseHeaderDate(headers.get('date'))

            const participants = [fromEmail, ...toEmails].filter(Boolean)
            const contact = participants.length > 0
                ? await withPrismaRetry(() =>
                    prisma.contact.findFirst({
                        where: {
                            OR: participants.map((email) => ({
                                email: { equals: email, mode: 'insensitive' }
                            }))
                        },
                        select: { id: true }
                    })
                )
                : null

            const project = contact
                ? await withPrismaRetry(() =>
                    prisma.project.findFirst({
                        where: { contactId: contact.id },
                        orderBy: { updatedAt: 'desc' },
                        select: { id: true }
                    })
                )
                : null

            try {
                await withPrismaRetry(() =>
                    prisma.emailMessage.create({
                        data: {
                            integrationId: integration.id,
                            externalId: detail.id,
                            threadId: detail.threadId || null,
                            fromEmail: fromEmail || integration.accountEmail,
                            toEmails: toEmails.join(', ') || null,
                            subject,
                            snippet: detail.snippet || null,
                            receivedAt,
                            contactId: contact?.id || null,
                            projectId: project?.id || null,
                            metadata: {
                                source: 'gmail',
                                headerDate: headers.get('date') || null,
                                messageId: headers.get('message-id') || null
                            }
                        }
                    })
                )
                synced += 1
            } catch {
                // duplicate or invalid row; skip
            }
        }

        await withPrismaRetry(() =>
            prisma.emailIntegration.update({
                where: { id: integration.id },
                data: { lastSyncAt: new Date() }
            })
        )

        revalidatePath('/comercial')
        revalidatePath('/proyectos')
        revalidatePath('/configuracion')
        return { success: true, synced }
    } catch (error) {
        console.error('Error syncing Gmail emails:', error)
        return { success: false, error: 'Error sincronizando correos Gmail' }
    }
}

export async function registerIncomingProjectEmail(data: {
    to: string
    from: string
    subject?: string
    text?: string
    snippet?: string
    receivedAt?: string | Date
    externalId?: string
    threadId?: string
}) {
    try {
        const toCandidates = parseRecipientEmails(data.to || '')
        const fromEmail = extractEmailFromHeader(data.from || '')
        if (toCandidates.length === 0 || !fromEmail) return { success: false, error: 'to/from obligatorios' }

        const project = await withPrismaRetry(() =>
            prisma.project.findFirst({
                where: {
                    OR: toCandidates.map((email) => ({
                        inboxEmail: { equals: email, mode: 'insensitive' as const }
                    }))
                },
                select: { id: true, clientId: true, name: true }
            })
        )
        if (!project) return { success: false, error: 'No existe proyecto para este correo destino' }

        let contact = await withPrismaRetry(() =>
            prisma.contact.findFirst({
                where: {
                    clientId: project.clientId,
                    email: { equals: fromEmail, mode: 'insensitive' }
                },
                select: { id: true }
            })
        )

        if (!contact) {
            const local = fromEmail.split('@')[0] || 'contacto'
            const names = local.split(/[._-]+/).filter(Boolean)
            const firstName = names[0] ? names[0][0].toUpperCase() + names[0].slice(1) : 'Contacto'
            const lastName = names.slice(1).join(' ') || '-'
            contact = await withPrismaRetry(() =>
                prisma.contact.create({
                    data: {
                        firstName,
                        lastName,
                        email: fromEmail,
                        clientId: project.clientId
                    },
                    select: { id: true }
                })
            )
        }

        let integration = await withPrismaRetry(() =>
            prisma.emailIntegration.findFirst({
                where: { isActive: true, provider: 'gmail' },
                orderBy: { updatedAt: 'desc' },
                select: { id: true }
            })
        )
        if (!integration) {
            const fallbackUser = await withPrismaRetry(() =>
                prisma.user.findFirst({
                    orderBy: { createdAt: 'asc' },
                    select: { id: true }
                })
            )
            if (!fallbackUser) return { success: false, error: 'No hay usuario para registrar correos entrantes' }
            const domain = (process.env.PROJECT_INBOX_DOMAIN || 'projects.fibra.local').trim().toLowerCase()
            integration = await withPrismaRetry(() =>
                prisma.emailIntegration.upsert({
                    where: {
                        userId_provider_accountEmail: {
                            userId: fallbackUser.id,
                            provider: 'gmail',
                            accountEmail: `system-inbound@${domain}`
                        }
                    },
                    update: {},
                    create: {
                        userId: fallbackUser.id,
                        provider: 'gmail',
                        accountEmail: `system-inbound@${domain}`,
                        isActive: false
                    },
                    select: { id: true }
                })
            )
        }

        const externalId = data.externalId || `inbound-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const receivedAt = data.receivedAt ? new Date(data.receivedAt) : new Date()
        const toEmails = toCandidates.join(', ')

        await withPrismaRetry(() =>
            prisma.emailMessage.create({
                data: {
                    integrationId: integration.id,
                    externalId,
                    threadId: data.threadId || null,
                    fromEmail,
                    toEmails,
                    subject: data.subject || null,
                    snippet: data.snippet || data.text || null,
                    bodyText: data.text || null,
                    receivedAt: Number.isNaN(receivedAt.getTime()) ? new Date() : receivedAt,
                    contactId: contact.id,
                    projectId: project.id,
                    metadata: { source: 'project-inbound' }
                }
            })
        )

        revalidatePath('/comercial')
        revalidatePath(`/proyectos/${project.id}`)
        return { success: true, projectId: project.id }
    } catch (error) {
        console.error('Error registering inbound project email:', error)
        return { success: false, error: 'No se pudo registrar el correo entrante' }
    }
}

export async function sendProjectEmail(data: {
    projectId: string
    toEmail: string
    subject: string
    body: string
    contactId?: string
}) {
    try {
        await requireModuleAccess('proyectos')
        const user = await requireAuthUser()
        const toEmail = normalizeEmail(data.toEmail || '')
        const subject = (data.subject || '').trim()
        const body = (data.body || '').trim()
        if (!toEmail || !subject || !body) {
            return { success: false, error: 'Destino, asunto y cuerpo son obligatorios' }
        }

        const integration = await withPrismaRetry(() =>
            prisma.emailIntegration.findFirst({
                where: { userId: user.id, provider: 'gmail', isActive: true },
                orderBy: { updatedAt: 'desc' }
            })
        )
        if (!integration?.refreshToken) return { success: false, error: 'Configura Gmail en Integraciones para enviar correos' }

        const project = await withPrismaRetry(() =>
            prisma.project.findUnique({
                where: { id: data.projectId },
                select: { id: true, name: true, inboxEmail: true, clientId: true }
            })
        )
        if (!project) return { success: false, error: 'Proyecto no encontrado' }

        const clientId = process.env.GOOGLE_CLIENT_ID || ''
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
        if (!clientId || !clientSecret) return { success: false, error: 'Faltan variables GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET' }

        const refreshed = await refreshGmailAccessToken({
            refreshToken: integration.refreshToken,
            clientId,
            clientSecret
        })
        const accessToken = refreshed.access_token
        await withPrismaRetry(() =>
            prisma.emailIntegration.update({
                where: { id: integration.id },
                data: {
                    accessToken,
                    tokenExpiresAt: new Date(Date.now() + (refreshed.expires_in || 3600) * 1000)
                }
            })
        )

        const fromAddress = integration.accountEmail
        const replyTo = project.inboxEmail || fromAddress
        const mime = [
            `From: Fibra Core <${fromAddress}>`,
            `To: ${toEmail}`,
            `Reply-To: ${replyTo}`,
            `Subject: ${subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset="UTF-8"',
            '',
            body
        ].join('\r\n')

        const sendResp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ raw: encodeBase64Url(mime) })
        })
        if (!sendResp.ok) {
            const text = await sendResp.text()
            return { success: false, error: `No se pudo enviar correo: ${sendResp.status} ${text}` }
        }

        let contactId = data.contactId || null
        if (!contactId) {
            const existing = await withPrismaRetry(() =>
                prisma.contact.findFirst({
                    where: {
                        clientId: project.clientId,
                        email: { equals: toEmail, mode: 'insensitive' }
                    },
                    select: { id: true }
                })
            )
            contactId = existing?.id || null
        }

        await withPrismaRetry(() =>
            prisma.emailMessage.create({
                data: {
                    integrationId: integration.id,
                    externalId: `outbound-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    fromEmail: fromAddress,
                    toEmails: toEmail,
                    subject,
                    snippet: body.slice(0, 200),
                    bodyText: body,
                    receivedAt: new Date(),
                    contactId,
                    projectId: project.id,
                    metadata: { source: 'platform-outbound' }
                }
            })
        )

        revalidatePath(`/proyectos/${project.id}`)
        revalidatePath('/comercial')
        return { success: true }
    } catch (error) {
        console.error('Error sending project email:', error)
        return { success: false, error: 'No se pudo enviar el correo' }
    }
}
