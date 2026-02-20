import OpenAI from 'openai'
import prisma from '@/lib/prisma'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { verifyTelegramLinkToken } from '@/lib/telegram-link'
import { canAccess } from '@/lib/rbac'
import { generateFibraAssistantReply } from '@/lib/ai/assistant'

export const runtime = 'nodejs'
export const maxDuration = 30

type TelegramUpdate = {
    message?: {
        chat?: { id?: number }
        from?: {
            id?: number
            username?: string
            first_name?: string
            last_name?: string
        }
        text?: string
        voice?: { file_id?: string }
        audio?: { file_id?: string }
    }
}

function getTelegramToken() {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) throw new Error('Falta TELEGRAM_BOT_TOKEN')
    return token
}

async function telegramApi(method: string, payload: Record<string, unknown>) {
    const token = getTelegramToken()
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.ok) {
        throw new Error(data?.description || `Telegram API error (${method})`)
    }
    return data.result
}

async function sendTelegramMessage(chatId: number, text: string) {
    const chunks = text.length > 3900 ? [text.slice(0, 3900), text.slice(3900)] : [text]
    for (const chunk of chunks) {
        await telegramApi('sendMessage', { chat_id: chatId, text: chunk })
    }
}

function getAppBaseUrl() {
    return (
        process.env.APP_BASE_URL ||
        process.env.NEXTAUTH_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    ).replace(/\/$/, '')
}

async function fetchTelegramFileBuffer(fileId: string) {
    const token = getTelegramToken()
    const fileData = await telegramApi('getFile', { file_id: fileId })
    const filePath = String(fileData?.file_path || '').trim()
    if (!filePath) throw new Error('No se pudo resolver archivo de Telegram')
    const response = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`)
    if (!response.ok) throw new Error('No se pudo descargar audio desde Telegram')
    const arrayBuffer = await response.arrayBuffer()
    return {
        bytes: new Uint8Array(arrayBuffer),
        filename: filePath.split('/').pop() || `telegram-audio-${Date.now()}.ogg`
    }
}

async function transcribeAudio(bytes: Uint8Array, filename: string) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY no está configurada')
    const client = new OpenAI({ apiKey })
    const file = await OpenAI.toFile(bytes, filename, { type: 'audio/ogg' })
    const transcript = await client.audio.transcriptions.create({
        model: 'whisper-1',
        file
    })
    const text = (transcript.text || '').trim()
    if (!text) throw new Error('No se pudo transcribir el audio')
    return text
}

async function linkTelegramUser(telegramId: string, token: string) {
    const payload = verifyTelegramLinkToken(token)
    if (!payload) return { success: false as const, error: 'Token inválido o expirado.' }

    const targetUser = await withPrismaRetry(() =>
        prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true, telegramId: true } })
    )
    if (!targetUser) return { success: false as const, error: 'Usuario de plataforma no encontrado.' }

    const existingTelegram = await withPrismaRetry(() =>
        prisma.user.findFirst({ where: { telegramId }, select: { id: true } })
    )
    if (existingTelegram && existingTelegram.id !== targetUser.id) {
        return { success: false as const, error: 'Este Telegram ya está vinculado a otro usuario.' }
    }

    await withPrismaRetry(() =>
        prisma.user.update({
            where: { id: targetUser.id },
            data: { telegramId }
        })
    )
    return { success: true as const }
}

export async function POST(req: Request) {
    try {
        const secret = process.env.TELEGRAM_WEBHOOK_SECRET
        if (secret) {
            const header = req.headers.get('x-telegram-bot-api-secret-token')
            if (header !== secret) {
                return Response.json({ error: 'Unauthorized webhook' }, { status: 401 })
            }
        }

        const update = (await req.json()) as TelegramUpdate
        const message = update.message
        const chatId = message?.chat?.id
        const from = message?.from
        if (!chatId || !from?.id) return Response.json({ ok: true })

        const telegramId = String(from.id)
        const rawText = (message?.text || '').trim()

        if (rawText.startsWith('/start')) {
            const maybeToken = rawText.match(/^\/start\s+link_(.+)$/)?.[1]
            if (maybeToken) {
                const linked = await linkTelegramUser(telegramId, maybeToken)
                if (linked.success) {
                    await sendTelegramMessage(chatId, 'Cuenta vinculada correctamente. Ya puedes chatear conmigo con datos reales de Fibra Core.')
                } else {
                    await sendTelegramMessage(chatId, `No se pudo vincular: ${linked.error}`)
                }
            } else {
                await sendTelegramMessage(
                    chatId,
                    'Hola, soy Fibra Bot. Para vincular tu cuenta, entra a la plataforma y genera tu código de Telegram. Luego envíame: /link TU_CODIGO'
                )
            }
            return Response.json({ ok: true })
        }

        if (rawText.startsWith('/link ')) {
            const token = rawText.replace('/link', '').trim()
            const linked = await linkTelegramUser(telegramId, token)
            if (linked.success) {
                await sendTelegramMessage(chatId, 'Cuenta vinculada correctamente. Ya puedes consultarme igual que en la plataforma.')
            } else {
                await sendTelegramMessage(chatId, `No se pudo vincular: ${linked.error}`)
            }
            return Response.json({ ok: true })
        }

        const user = await withPrismaRetry(() =>
            prisma.user.findFirst({
                where: { telegramId },
                select: { id: true, role: true, name: true }
            })
        )

        if (!user) {
            const baseUrl = getAppBaseUrl()
            await sendTelegramMessage(
                chatId,
                `Tu Telegram aún no está vinculado. Entra a ${baseUrl}/perfil o ${baseUrl}/configuracion y genera un código de vinculación.`
            )
            return Response.json({ ok: true })
        }

        if (!canAccess(user.role, 'chatbot')) {
            await sendTelegramMessage(chatId, 'Tu rol no tiene acceso al chatbot.')
            return Response.json({ ok: true })
        }

        let prompt = rawText
        const audioFileId = message?.voice?.file_id || message?.audio?.file_id
        if (!prompt && audioFileId) {
            try {
                const audio = await fetchTelegramFileBuffer(audioFileId)
                prompt = await transcribeAudio(audio.bytes, audio.filename)
            } catch (error) {
                await sendTelegramMessage(
                    chatId,
                    `No pude transcribir el audio: ${error instanceof Error ? error.message : 'error desconocido'}`
                )
                return Response.json({ ok: true })
            }
        }

        if (!prompt) {
            await sendTelegramMessage(chatId, 'Envíame un mensaje de texto o audio para ayudarte.')
            return Response.json({ ok: true })
        }

        const reply = await generateFibraAssistantReply(
            { id: user.id, role: user.role },
            prompt
        )

        await sendTelegramMessage(chatId, reply || 'No pude generar respuesta en este momento.')
        return Response.json({ ok: true })
    } catch (error) {
        console.error('Telegram webhook error:', error)
        return Response.json({ ok: true })
    }
}

