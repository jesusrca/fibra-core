import { getTransactions } from '@/lib/actions/accounting'
import { ContabilidadClient } from '@/components/contabilidad/contabilidad-client'

export const dynamic = 'force-dynamic'

export default async function ContabilidadPage() {
    const transactions = await getTransactions()

    return <ContabilidadClient initialTransactions={transactions} />
}
