import { registerIncomingProjectEmail } from '@/lib/actions/email'

function isAuthorized(request: Request) {
    const expected = process.env.PROJECT_MAIL_INBOUND_TOKEN
    if (!expected) return false
    const auth = request.headers.get('authorization') || ''
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    const headerToken = request.headers.get('x-inbound-token') || ''
    const url = new URL(request.url)
    const queryToken = url.searchParams.get('token') || ''
    return bearer === expected || headerToken === expected || queryToken === expected
}

export async function POST(request: Request) {
    try {
        if (!isAuthorized(request)) {
            return Response.json({ success: false, error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json().catch(() => ({} as any))
        const toValue = Array.isArray(body.to)
            ? body.to.join(', ')
            : (body.to || body.recipient || '')

        const result = await registerIncomingProjectEmail({
            to: toValue,
            from: body.from || '',
            subject: body.subject || '',
            text: body.text || body.body || '',
            snippet: body.snippet || '',
            receivedAt: body.receivedAt || body.date || undefined,
            externalId: body.externalId || body.messageId || undefined,
            threadId: body.threadId || undefined
        })

        if (!result.success) {
            return Response.json({ success: false, error: result.error }, { status: 400 })
        }

        return Response.json({ success: true, projectId: result.projectId })
    } catch (error) {
        console.error('Inbound email API error:', error)
        return Response.json({ success: false, error: 'Error procesando correo entrante' }, { status: 500 })
    }
}
