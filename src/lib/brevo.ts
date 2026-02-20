const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

type BrevoEmailInput = {
    to: string | string[]
    subject: string
    text?: string
    html?: string
    replyTo?: string
}

function normalizeRecipients(to: string | string[]) {
    const list = Array.isArray(to) ? to : [to]
    return list
        .map((email) => (email || '').trim().toLowerCase())
        .filter(Boolean)
        .map((email) => ({ email }))
}

export async function sendSystemEmailByBrevo(input: BrevoEmailInput) {
    const apiKey = (process.env.BREVO_API_KEY || '').trim()
    const senderEmail = (process.env.BREVO_SENDER_EMAIL || '').trim()
    const senderName = (process.env.BREVO_SENDER_NAME || 'Fibra Core').trim()

    if (!apiKey) return { success: false, error: 'Falta BREVO_API_KEY' }
    if (!senderEmail) return { success: false, error: 'Falta BREVO_SENDER_EMAIL' }

    const recipients = normalizeRecipients(input.to)
    if (recipients.length === 0) return { success: false, error: 'No hay destinatarios válidos' }
    if (!input.subject?.trim()) return { success: false, error: 'Asunto obligatorio' }
    if (!input.text && !input.html) return { success: false, error: 'Contenido obligatorio' }

    const payload: Record<string, unknown> = {
        sender: { name: senderName, email: senderEmail },
        to: recipients,
        subject: input.subject.trim(),
    }
    if (input.text) payload.textContent = input.text
    if (input.html) payload.htmlContent = input.html
    if (input.replyTo) payload.replyTo = { email: input.replyTo.trim().toLowerCase() }

    const response = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
            'api-key': apiKey,
            'content-type': 'application/json',
            accept: 'application/json',
        },
        body: JSON.stringify(payload),
    })

    if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        return { success: false, error: `Brevo error ${response.status}: ${errorText || 'sin detalle'}` }
    }

    return { success: true }
}

