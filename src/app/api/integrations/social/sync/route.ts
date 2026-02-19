import { revalidatePath } from 'next/cache'
import { requireAuthUser } from '@/lib/server-auth'
import { fetchMetaMetrics, ingestSocialMetrics, type SocialMetricInput } from '@/lib/integrations/social'

function isAuthorizedByToken(request: Request) {
    const expected = process.env.INTEGRATIONS_SYNC_TOKEN
    if (!expected) return false
    const bearer = request.headers.get('authorization') || ''
    const token = bearer.startsWith('Bearer ') ? bearer.slice(7) : request.headers.get('x-integration-token')
    return token === expected
}

export async function POST(request: Request) {
    try {
        let authorized = false
        try {
            await requireAuthUser()
            authorized = true
        } catch {
            authorized = isAuthorizedByToken(request)
        }

        if (!authorized) {
            return Response.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json().catch(() => ({} as any))
        const provider = (body?.provider || '').toString().toLowerCase()
        let metrics: SocialMetricInput[] = []

        if (provider === 'meta') {
            const accessToken = body?.accessToken || process.env.META_ACCESS_TOKEN || ''
            const instagramBusinessId = body?.instagramBusinessId || process.env.META_INSTAGRAM_BUSINESS_ID
            const facebookPageId = body?.facebookPageId || process.env.META_FACEBOOK_PAGE_ID
            if (!accessToken) {
                return Response.json({ error: 'Falta accessToken para Meta' }, { status: 400 })
            }
            metrics = await fetchMetaMetrics({
                accessToken,
                instagramBusinessId,
                facebookPageId
            })
        } else if (Array.isArray(body?.metrics)) {
            metrics = body.metrics
        } else {
            return Response.json({ error: 'Debes enviar provider=meta o metrics[]' }, { status: 400 })
        }

        if (!metrics.length) {
            return Response.json({ success: true, created: 0, message: 'Sin métricas para registrar' })
        }

        const result = await ingestSocialMetrics(metrics)
        revalidatePath('/marketing')
        return Response.json({ success: true, created: result.created })
    } catch (error) {
        console.error('Social sync API error:', error)
        return Response.json({ error: 'Error sincronizando métricas sociales' }, { status: 500 })
    }
}
