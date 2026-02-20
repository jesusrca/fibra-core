import crypto from 'crypto'

type LinkPayload = {
    userId: string
    exp: number
}

function getSecret() {
    const secret = process.env.TELEGRAM_LINK_SECRET || process.env.NEXTAUTH_SECRET
    if (!secret) {
        throw new Error('Falta TELEGRAM_LINK_SECRET o NEXTAUTH_SECRET para vinculación de Telegram')
    }
    return secret
}

function base64UrlEncode(input: string) {
    return Buffer.from(input, 'utf8').toString('base64url')
}

function base64UrlDecode(input: string) {
    return Buffer.from(input, 'base64url').toString('utf8')
}

function sign(input: string) {
    return crypto.createHmac('sha256', getSecret()).update(input).digest('base64url')
}

export function createTelegramLinkToken(userId: string, expiresInMinutes = 15) {
    const payload: LinkPayload = {
        userId,
        exp: Date.now() + expiresInMinutes * 60 * 1000
    }
    const payloadEncoded = base64UrlEncode(JSON.stringify(payload))
    const signature = sign(payloadEncoded)
    return `${payloadEncoded}.${signature}`
}

export function verifyTelegramLinkToken(token: string): LinkPayload | null {
    const [payloadEncoded, signature] = (token || '').trim().split('.')
    if (!payloadEncoded || !signature) return null
    const expected = sign(payloadEncoded)
    if (expected !== signature) return null

    try {
        const parsed = JSON.parse(base64UrlDecode(payloadEncoded)) as LinkPayload
        if (!parsed?.userId || typeof parsed.exp !== 'number') return null
        if (Date.now() > parsed.exp) return null
        return parsed
    } catch {
        return null
    }
}

