import { getLeads } from '@/lib/actions/crm'
import { ComercialClient } from '@/components/crm/comercial-client'

export const dynamic = 'force-dynamic'

export default async function ComercialPage() {
    const leads = await getLeads()

    return <ComercialClient initialLeads={leads as any} />
}
