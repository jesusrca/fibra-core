import { requireAuthUser } from '@/lib/server-auth'
import { createTelegramLinkToken } from '@/lib/telegram-link'

export const runtime = 'nodejs'

export async function GET() {
    try {
        const user = await requireAuthUser()
        const token = createTelegramLinkToken(user.id, 20)
        const botUsername = (process.env.TELEGRAM_BOT_USERNAME || '').replace('@', '').trim()
        const deepLink = botUsername ? `https://t.me/${botUsername}?start=link_${token}` : null
        return Response.json({
            success: true,
            token,
            command: `/link ${token}`,
            deepLink
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo generar token de vinculación'
        return Response.json({ error: message }, { status: 401 })
    }
}

