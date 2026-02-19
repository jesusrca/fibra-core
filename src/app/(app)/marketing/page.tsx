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
    EMAIL: 'Email',
    REFERIDO: 'Referidos',
}

const getMarketingData = unstable_cache(
    async () =>
        withPrismaRetry(() =>
            Promise.all([
                prisma.lead.findMany({
                    select: {
                        id: true,
                        source: true,
                        status: true
                    },
                    take: 500
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
                    take: 500
                })
            ])
        ),
    ['marketing-data-v1'],
    { revalidate: 20 }
)

export default async function MarketingPage() {
    await requireModuleAccess('marketing')

    const [leads, transactions] = await getMarketingData()

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

    return (
        <MarketingClient
            channelData={channelData.length ? channelData : [{ channel: 'Sin datos', leads: 0 }]}
            totalReach={totalReach}
            totalClicks={totalClicks}
            totalConversions={totalConversions}
            totalSpent={totalSpent}
        />
    )
}
