import prisma from '@/lib/prisma'
import { requireModuleAccess } from '@/lib/server-auth'
import { MarketingClient } from '@/components/marketing/marketing-client'
import { unstable_cache } from 'next/cache'
import { withPrismaRetry } from '@/lib/prisma-retry'

export const dynamic = 'force-dynamic'

const SOURCE_LABELS: Record<string, string> = {
    WEB: 'Web',
    LINKEDIN: 'LinkedIn',
    INSTAGRAM: 'Instagram',
    FACEBOOK: 'Facebook',
    TIKTOK: 'TikTok',
    YOUTUBE: 'YouTube',
    X: 'X / Twitter',
    EMAIL: 'Email',
    REFERIDO: 'Referidos',
}

const getMarketingData = unstable_cache(
    async () =>
        withPrismaRetry(() =>
            prisma.$transaction([
                prisma.lead.findMany({
                    select: {
                        id: true,
                        source: true,
                        status: true
                    },
                    take: 300
                }),
                prisma.transaction.findMany({
                    where: {
                        category: 'EXPENSE',
                        OR: [
                            { subcategory: { contains: 'marketing', mode: 'insensitive' } },
                            { description: { contains: 'marketing', mode: 'insensitive' } }
                        ]
                    },
                    select: {
                        amount: true
                    },
                    take: 300
                }),
                prisma.serviceCatalog.findMany({
                    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
                    take: 180
                }),
                prisma.socialMetric.findMany({
                    orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }],
                    take: 300
                })
            ])
        ),
    ['marketing-data-v4'],
    { revalidate: 20 }
)

export default async function MarketingPage() {
    await requireModuleAccess('marketing')

    const [leads, transactions, services, socialMetrics] = await getMarketingData()

    const sourceMap = new Map<string, number>()
    for (const lead of leads) {
        const key = (lead.source || 'OTROS').toUpperCase()
        sourceMap.set(key, (sourceMap.get(key) || 0) + 1)
    }
    const channelData = Array.from(sourceMap.entries())
        .map(([key, count]) => ({
            channel: SOURCE_LABELS[key] || key,
            leads: count
        }))
        .sort((a, b) => b.leads - a.leads)
        .slice(0, 6)

    const totalConversions = leads.filter((l) => l.status === 'WON').length
    const totalClicks = leads.length * 6
    const totalReach = leads.length * 120
    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0)
    const latestByPlatform = new Map<string, {
        id: string
        platform: string
        followers: number
        impressions: number
        interactions: number
        clicks: number
        leads: number
        recordedAt: Date
        notes: string | null
    }>()

    for (const metric of socialMetrics) {
        const key = (metric.platform || 'OTROS').toUpperCase()
        if (!latestByPlatform.has(key)) {
            latestByPlatform.set(key, {
                id: metric.id,
                platform: key,
                followers: metric.followers || 0,
                impressions: metric.impressions || 0,
                interactions: metric.interactions || 0,
                clicks: metric.clicks || 0,
                leads: metric.leads || 0,
                recordedAt: metric.recordedAt,
                notes: metric.notes || null
            })
        }
    }

    const socialByPlatform = Array.from(latestByPlatform.values())
        .map((row) => ({
            ...row,
            platformLabel: SOURCE_LABELS[row.platform] || row.platform,
            engagementRate: row.impressions > 0
                ? Number(((row.interactions / row.impressions) * 100).toFixed(2))
                : 0
        }))
        .sort((a, b) => b.followers - a.followers)

    const socialTotals = socialByPlatform.reduce(
        (acc, row) => {
            acc.followers += row.followers
            acc.interactions += row.interactions
            acc.impressions += row.impressions
            return acc
        },
        { followers: 0, interactions: 0, impressions: 0 }
    )

    return (
        <MarketingClient
            channelData={channelData.length ? channelData : [{ channel: 'Sin datos', leads: 0 }]}
            totalReach={socialTotals.impressions || totalReach}
            totalClicks={socialByPlatform.reduce((sum, r) => sum + r.clicks, 0) || totalClicks}
            totalConversions={totalConversions}
            totalSpent={totalSpent}
            services={services}
            socialMetrics={socialMetrics.map((metric) => ({
                id: metric.id,
                platform: metric.platform,
                followers: metric.followers,
                impressions: metric.impressions,
                interactions: metric.interactions,
                clicks: metric.clicks,
                leads: metric.leads,
                recordedAt: metric.recordedAt.toISOString(),
                notes: metric.notes
            }))}
            socialByPlatform={socialByPlatform.map((row) => ({
                id: row.id,
                platform: row.platform,
                platformLabel: row.platformLabel,
                followers: row.followers,
                impressions: row.impressions,
                interactions: row.interactions,
                clicks: row.clicks,
                leads: row.leads,
                engagementRate: row.engagementRate,
                recordedAt: row.recordedAt.toISOString(),
                notes: row.notes
            }))}
            socialFollowersTotal={socialTotals.followers}
            socialEngagementRate={
                socialTotals.impressions > 0
                    ? Number(((socialTotals.interactions / socialTotals.impressions) * 100).toFixed(2))
                    : 0
            }
        />
    )
}
