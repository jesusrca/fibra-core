import { getFixedCosts, getPayroll } from '@/lib/actions/finance'
import { getUsers } from '@/lib/actions/users'
import { FinanzasClient } from '@/components/finanzas/finanzas-client'

export const dynamic = 'force-dynamic'

export default async function FinanzasPage() {
    const [fixedCosts, payroll, users] = await Promise.all([
        getFixedCosts(),
        getPayroll(),
        getUsers(),
    ])

    return (
        <FinanzasClient
            fixedCosts={fixedCosts}
            payroll={payroll}
            users={users}
        />
    )
}
