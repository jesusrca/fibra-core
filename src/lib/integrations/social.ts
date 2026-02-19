import prisma from '@/lib/prisma'
import { withPrismaRetry } from '@/lib/prisma-retry'

export interface SocialMetricInput {
    platform: string
    followers?: number
    impressions?: number
    interactions?: number
    clicks?: number
    leads?: number
    recordedAt?: string | Date
    notes?: string
}

function normalizePlatform(value: string) {
    return value.trim().toUpperCase().replace(/\s+/g, '_')
}

function safeInt(value: number | undefined) {
    const n = Number(value || 0)
    if (!Number.isFinite(n)) return 0
    return Math.max(Math.round(n), 0)
}

export async function ingestSocialMetrics(metrics: SocialMetricInput[]) {
    let created = 0
    for (const item of metrics) {
        const platform = normalizePlatform(item.platform || '')
        if (!platform) continue

        const recordedAt = item.recordedAt ? new Date(item.recordedAt) : new Date()
        if (Number.isNaN(recordedAt.getTime())) continue

        await withPrismaRetry(() =>
            prisma.socialMetric.create({
                data: {
                    platform,
                    followers: safeInt(item.followers),
                    impressions: safeInt(item.impressions),
                    interactions: safeInt(item.interactions),
                    clicks: safeInt(item.clicks),
                    leads: safeInt(item.leads),
                    recordedAt,
                    notes: (item.notes || '').trim() || null
                }
            })
        )
        created += 1
    }
    return { created }
}

export async function fetchMetaMetrics(params: {
    accessToken: string
    instagramBusinessId?: string
    facebookPageId?: string
}) {
    const output: SocialMetricInput[] = []
    const headers = { Authorization: `Bearer ${params.accessToken}` }

    if (params.instagramBusinessId) {
        const igResp = await fetch(
            `https://graph.facebook.com/v20.0/${params.instagramBusinessId}?fields=followers_count,username,media_count&access_token=${encodeURIComponent(params.accessToken)}`
        )
        if (igResp.ok) {
            const ig = await igResp.json() as { followers_count?: number; username?: string }
            output.push({
                platform: 'INSTAGRAM',
                followers: ig.followers_count || 0,
                notes: ig.username ? `Usuario: ${ig.username}` : 'Meta API'
            })
        }

        const insightsResp = await fetch(
            `https://graph.facebook.com/v20.0/${params.instagramBusinessId}/insights?metric=impressions,reach,profile_views&period=day`,
            { headers }
        )
        if (insightsResp.ok) {
            const insights = await insightsResp.json() as { data?: Array<{ name: string; values?: Array<{ value?: number }> }> }
            const lookup = new Map((insights.data || []).map((m) => [m.name, m.values?.[0]?.value || 0]))
            output.push({
                platform: 'INSTAGRAM',
                impressions: Number(lookup.get('impressions') || 0),
                interactions: Number(lookup.get('profile_views') || 0),
                notes: 'Insights diario'
            })
        }
    }

    if (params.facebookPageId) {
        const fbResp = await fetch(
            `https://graph.facebook.com/v20.0/${params.facebookPageId}?fields=fan_count,name&access_token=${encodeURIComponent(params.accessToken)}`
        )
        if (fbResp.ok) {
            const fb = await fbResp.json() as { fan_count?: number; name?: string }
            output.push({
                platform: 'FACEBOOK',
                followers: fb.fan_count || 0,
                notes: fb.name ? `Página: ${fb.name}` : 'Meta API'
            })
        }
    }

    return output
}
