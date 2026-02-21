import { FinanzasClient } from '@/components/finanzas/finanzas-client'
import prisma from '@/lib/prisma'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { unstable_cache } from 'next/cache'
import { ensureMonthlyPayroll } from '@/lib/actions/finance'

export const dynamic = 'force-dynamic'

function asDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null
    const parsed = value instanceof Date ? value : new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

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
                        date: true,
                        projectId: true,
                        project: {
                            select: {
                                id: true,
                                name: true,
                                serviceType: true,
                                client: { select: { id: true, name: true } }
                            }
                        }
                    },
                    orderBy: { date: 'asc' }
                }),
                prisma.invoice.findMany({
                    select: {
                        id: true,
                        amount: true,
                        taxRate: true,
                        taxAmount: true,
                        dueDate: true,
                        status: true,
                        project: {
                            select: {
                                id: true,
                                name: true,
                                serviceType: true,
                                client: { select: { id: true, name: true } }
                            }
                        },
                        client: { select: { id: true, name: true } }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 600
                }),
                prisma.supplierPayment.findMany({
                    where: { status: 'PENDING' },
                    select: {
                        amount: true,
                        paymentDate: true,
                        issueDate: true
                    },
                    orderBy: { paymentDate: 'asc' },
                    take: 400
                })
            ])
        ),
    ['finanzas-data-v4'],
    { revalidate: 15 }
)

export default async function FinanzasPage() {
    await requireModuleAccess('finanzas')
    await ensureMonthlyPayroll()

    const [fixedCosts, payroll, users, banks, transactions, invoices, pendingSupplierPayments] = await getFinanzasData()
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const monthTransactions = transactions.filter((tx) => {
        const txDate = asDate(tx.date)
        return !!txDate && txDate >= monthStart && txDate < nextMonthStart
    })
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
        const txDate = asDate(tx.date)
        if (!txDate) continue
        const key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`
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

    const projectProfitMap = new Map<string, {
        projectId: string
        projectName: string
        clientName: string
        serviceType: string
        revenue: number
        directCosts: number
    }>()

    invoices.forEach((invoice) => {
        if (!invoice.project?.id) return
        if (!['SENT', 'PAID', 'OVERDUE'].includes(invoice.status)) return
        const key = invoice.project.id
        const current = projectProfitMap.get(key) || {
            projectId: invoice.project.id,
            projectName: invoice.project.name,
            clientName: invoice.project.client?.name || invoice.client?.name || 'Sin cliente',
            serviceType: invoice.project.serviceType || 'Sin servicio',
            revenue: 0,
            directCosts: 0
        }
        current.revenue += invoice.amount || 0
        projectProfitMap.set(key, current)
    })
    transactions.forEach((tx) => {
        if (tx.category !== 'EXPENSE' || !tx.project?.id) return
        const key = tx.project.id
        const current = projectProfitMap.get(key) || {
            projectId: tx.project.id,
            projectName: tx.project.name,
            clientName: tx.project.client?.name || 'Sin cliente',
            serviceType: tx.project.serviceType || 'Sin servicio',
            revenue: 0,
            directCosts: 0
        }
        current.directCosts += tx.amount || 0
        projectProfitMap.set(key, current)
    })

    const projectProfitability = Array.from(projectProfitMap.values())
        .map((row) => {
            const grossMargin = row.revenue - row.directCosts
            const marginPct = row.revenue > 0 ? (grossMargin / row.revenue) * 100 : 0
            return {
                ...row,
                grossMargin: Math.round(grossMargin * 100) / 100,
                marginPct: Math.round(marginPct * 10) / 10
            }
        })
        .sort((a, b) => b.grossMargin - a.grossMargin)
        .slice(0, 20)

    const clientProfitMap = new Map<string, { clientName: string; revenue: number; costs: number }>()
    projectProfitability.forEach((row) => {
        const current = clientProfitMap.get(row.clientName) || { clientName: row.clientName, revenue: 0, costs: 0 }
        current.revenue += row.revenue
        current.costs += row.directCosts
        clientProfitMap.set(row.clientName, current)
    })
    const clientProfitability = Array.from(clientProfitMap.values())
        .map((row) => ({
            clientName: row.clientName,
            net: Math.round((row.revenue - row.costs) * 100) / 100
        }))
        .sort((a, b) => b.net - a.net)
        .slice(0, 10)

    const serviceProfitMap = new Map<string, { service: string; revenue: number; costs: number }>()
    projectProfitability.forEach((row) => {
        const current = serviceProfitMap.get(row.serviceType) || { service: row.serviceType, revenue: 0, costs: 0 }
        current.revenue += row.revenue
        current.costs += row.directCosts
        serviceProfitMap.set(row.serviceType, current)
    })
    const serviceProfitability = Array.from(serviceProfitMap.values())
        .map((row) => ({
            service: row.service,
            net: Math.round((row.revenue - row.costs) * 100) / 100
        }))
        .sort((a, b) => b.net - a.net)
        .slice(0, 10)

    const currentBalance = bankBalances.reduce((sum, row) => sum + row.balance, 0)
    const pendingReceivables = invoices
        .filter((invoice) => invoice.status === 'SENT' || invoice.status === 'OVERDUE')
        .map((invoice) => ({ amount: invoice.amount, dueDate: invoice.dueDate }))
    const pendingPayroll = payroll.filter((row) => row.status === 'PENDING')
    const pendingFixedCosts = fixedCosts
    const accruedTaxes = invoices
        .filter((invoice) => ['SENT', 'PAID', 'OVERDUE'].includes(invoice.status))
        .reduce((sum, invoice) => sum + (invoice.taxAmount || 0), 0)
    const paidTaxes = transactions
        .filter((tx) => tx.category === 'EXPENSE')
        .filter((tx) => {
            const sub = (tx.subcategory || '').trim().toUpperCase()
            return sub === 'TAX_PAYMENT' || sub === 'IMPUESTOS' || sub === 'TAX'
        })
        .reduce((sum, tx) => sum + tx.amount, 0)
    const pendingTaxes = Math.max(accruedTaxes - paidTaxes, 0)

    const projectedCashFlow = [30, 60, 90].map((days) => {
        const horizon = new Date()
        horizon.setDate(horizon.getDate() + days)
        const inflow = pendingReceivables
            .filter((row) => {
                const due = asDate(row.dueDate)
                return !due || due <= horizon
            })
            .reduce((sum, row) => sum + row.amount, 0)
        const fixedOutflow = pendingFixedCosts
            .filter((row) => {
                const due = asDate(row.dueDate)
                return !!due && due <= horizon
            })
            .reduce((sum, row) => sum + row.amount, 0)
        const payrollOutflow = pendingPayroll
            .filter((row) => {
                const payDate = asDate(row.paymentDate)
                return !!payDate && payDate <= horizon
            })
            .reduce((sum, row) => sum + row.salary + row.bonus, 0)
        const supplierOutflow = pendingSupplierPayments
            .filter((row) => {
                const d = asDate(row.paymentDate) || asDate(row.issueDate) || now
                return d <= horizon
            })
            .reduce((sum, row) => sum + row.amount, 0)
        const taxOutflow = pendingTaxes
        const net = currentBalance + inflow - fixedOutflow - payrollOutflow - supplierOutflow - taxOutflow
        return {
            horizonDays: days,
            inflow: Math.round(inflow * 100) / 100,
            outflow: Math.round((fixedOutflow + payrollOutflow + supplierOutflow + taxOutflow) * 100) / 100,
            net: Math.round(net * 100) / 100,
            alert: net < 0
        }
    })
    const cashflowRecommendation = projectedCashFlow.some((row) => row.alert)
        ? 'Riesgo de déficit: priorizar cobranza de facturas vencidas y reprogramar pagos no críticos.'
        : 'Flujo saludable: mantener seguimiento semanal de vencimientos de cobro/pago.'

    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    const receivablesToEndMonth = pendingReceivables
        .filter((row) => {
            const due = asDate(row.dueDate)
            return !due || due <= endOfMonth
        })
        .reduce((sum, row) => sum + row.amount, 0)
    const fixedToEndMonth = pendingFixedCosts
        .filter((row) => {
            const due = asDate(row.dueDate)
            return !!due && due <= endOfMonth
        })
        .reduce((sum, row) => sum + row.amount, 0)
    const payrollToEndMonth = pendingPayroll
        .filter((row) => {
            const payDate = asDate(row.paymentDate)
            return !!payDate && payDate <= endOfMonth
        })
        .reduce((sum, row) => sum + row.salary + row.bonus, 0)
    const supplierToEndMonth = pendingSupplierPayments
        .filter((row) => {
            const d = asDate(row.paymentDate) || asDate(row.issueDate) || now
            return d <= endOfMonth
        })
        .reduce((sum, row) => sum + row.amount, 0)

    const endMonthProjectedCash = Math.round(
        (currentBalance + receivablesToEndMonth - fixedToEndMonth - payrollToEndMonth - supplierToEndMonth - pendingTaxes) * 100
    ) / 100

    const weeklyProjection: Array<{
        label: string
        start: string
        end: string
        inflow: number
        outflow: number
        net: number
        projectedBalance: number
        alert: boolean
    }> = []
    let rollingBalance = currentBalance
    const weekStart = new Date(now)
    weekStart.setHours(0, 0, 0, 0)

    for (let i = 0; i < 8; i += 1) {
        const start = new Date(weekStart)
        start.setDate(start.getDate() + i * 7)
        const end = new Date(start)
        end.setDate(end.getDate() + 6)
        end.setHours(23, 59, 59, 999)

        const inflow = pendingReceivables
            .filter((row) => {
                const due = asDate(row.dueDate)
                return !!due && due >= start && due <= end
            })
            .reduce((sum, row) => sum + row.amount, 0)
        const fixedOut = pendingFixedCosts
            .filter((row) => {
                const due = asDate(row.dueDate)
                return !!due && due >= start && due <= end
            })
            .reduce((sum, row) => sum + row.amount, 0)
        const payrollOut = pendingPayroll
            .filter((row) => {
                const payDate = asDate(row.paymentDate)
                return !!payDate && payDate >= start && payDate <= end
            })
            .reduce((sum, row) => sum + row.salary + row.bonus, 0)
        const supplierOut = pendingSupplierPayments
            .filter((row) => {
                const d = asDate(row.paymentDate) || asDate(row.issueDate) || now
                return d >= start && d <= end
            })
            .reduce((sum, row) => sum + row.amount, 0)
        const taxOut = i === 0 ? pendingTaxes : 0
        const outflow = fixedOut + payrollOut + supplierOut + taxOut
        const net = inflow - outflow
        rollingBalance += net

        weeklyProjection.push({
            label: `Sem ${i + 1}`,
            start: start.toISOString(),
            end: end.toISOString(),
            inflow: Math.round(inflow * 100) / 100,
            outflow: Math.round(outflow * 100) / 100,
            net: Math.round(net * 100) / 100,
            projectedBalance: Math.round(rollingBalance * 100) / 100,
            alert: rollingBalance < 0
        })
    }

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
            projectProfitability={projectProfitability}
            clientProfitability={clientProfitability}
            serviceProfitability={serviceProfitability}
            projectedCashFlow={projectedCashFlow}
            cashflowRecommendation={cashflowRecommendation}
            endMonthProjectedCash={endMonthProjectedCash}
            weeklyProjection={weeklyProjection}
            taxSummary={{
                accrued: Math.round(accruedTaxes * 100) / 100,
                paid: Math.round(paidTaxes * 100) / 100,
                pending: Math.round(pendingTaxes * 100) / 100
            }}
        />
    )
}
