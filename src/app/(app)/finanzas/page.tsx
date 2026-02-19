import { FinanzasClient } from '@/components/finanzas/finanzas-client'
import prisma from '@/lib/prisma'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { unstable_cache } from 'next/cache'

export const dynamic = 'force-dynamic'

const getFinanzasData = unstable_cache(
    async () =>
        withPrismaRetry(() =>
            Promise.all([
                prisma.fixedCost.findMany({
                    orderBy: { dueDate: 'asc' }
                }),
                prisma.payroll.findMany({
                    include: { user: true },
                    orderBy: { paymentDate: 'desc' }
                }),
                prisma.user.findMany({
                    select: { id: true, name: true, email: true, role: true },
                    orderBy: { name: 'asc' }
                }),
                prisma.accountingBank.findMany({
                    where: { isActive: true },
                    select: { id: true, name: true },
                    orderBy: { name: 'asc' }
                }),
                prisma.transaction.findMany({
                    where: { date: { lte: new Date() } },
                    select: {
                        bank: true,
                        amount: true,
                        category: true,
                        subcategory: true,
                        date: true
                    },
                    orderBy: { date: 'asc' }
                })
            ])
        ),
    ['finanzas-data-v2'],
    { revalidate: 15 }
)

export default async function FinanzasPage() {
    await requireModuleAccess('finanzas')

    const [fixedCosts, payroll, users, banks, transactions] = await getFinanzasData()
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const monthTransactions = transactions.filter((tx) => tx.date >= monthStart && tx.date < nextMonthStart)
    const totalRevenue = monthTransactions
        .filter((tx) => tx.category === 'INCOME')
        .reduce((sum, tx) => sum + tx.amount, 0)
    const totalExpenses = monthTransactions
        .filter((tx) => tx.category === 'EXPENSE')
        .reduce((sum, tx) => sum + tx.amount, 0)
    const netProfit = totalRevenue - totalExpenses
    const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    const expenseCategoryMap = new Map<string, number>()
    for (const tx of monthTransactions) {
        if (tx.category !== 'EXPENSE') continue
        const category = (tx.subcategory || 'Otros').trim() || 'Otros'
        expenseCategoryMap.set(category, (expenseCategoryMap.get(category) || 0) + tx.amount)
    }
    const budgetData = Array.from(expenseCategoryMap.entries())
        .map(([area, real]) => ({
            area,
            real: Math.round(real * 100) / 100,
            presupuesto: Math.round(real * 1.1 * 100) / 100
        }))
        .sort((a, b) => b.real - a.real)
        .slice(0, 6)

    const monthLabels: { key: string; mes: string }[] = []
    for (let i = 5; i >= 0; i -= 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const mes = d.toLocaleDateString('es-PE', { month: 'short' })
            .replace('.', '')
            .replace(/^\w/, (c) => c.toUpperCase())
        monthLabels.push({ key, mes })
    }
    const monthlyFlowMap = new Map<string, { income: number; expense: number }>()
    for (const item of monthLabels) monthlyFlowMap.set(item.key, { income: 0, expense: 0 })
    for (const tx of transactions) {
        const key = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`
        const bucket = monthlyFlowMap.get(key)
        if (!bucket) continue
        if (tx.category === 'INCOME') bucket.income += tx.amount
        if (tx.category === 'EXPENSE') bucket.expense += tx.amount
    }
    const cashFlowData = monthLabels.map(({ key, mes }) => {
        const bucket = monthlyFlowMap.get(key) || { income: 0, expense: 0 }
        return {
            mes,
            flujo: Math.round((bucket.income - bucket.expense) * 100) / 100
        }
    })

    const balanceMap = new Map<string, number>()
    for (const bank of banks) balanceMap.set(bank.name, 0)

    for (const tx of transactions) {
        const bankName = (tx.bank || '').trim()
        if (!bankName) continue
        const previous = balanceMap.get(bankName) || 0
        const signedAmount =
            tx.category === 'INCOME'
                ? tx.amount
                : tx.category === 'EXPENSE'
                    ? -tx.amount
                    : 0
        balanceMap.set(bankName, previous + signedAmount)
    }

    const bankBalances = Array.from(balanceMap.entries())
        .map(([bank, balance]) => ({
            bank,
            balance: Math.round(balance * 100) / 100
        }))
        .sort((a, b) => b.balance - a.balance)

    return (
        <FinanzasClient
            fixedCosts={fixedCosts}
            payroll={payroll}
            users={users}
            bankBalances={bankBalances}
            totalRevenue={totalRevenue}
            totalExpenses={totalExpenses}
            netProfit={netProfit}
            margin={margin}
            budgetData={budgetData}
            cashFlowData={cashFlowData}
        />
    )
}
