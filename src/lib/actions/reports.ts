'use server'

import prisma from '@/lib/prisma'
import { requireModuleAccess, requireAuthUser } from '@/lib/server-auth'
import { revalidatePath } from 'next/cache'
import { sendSystemEmailByBrevo } from '@/lib/brevo'

type ReportType = 'financial' | 'projects' | 'commercial' | 'marketing'
type ReportFormat = 'JSON' | 'CSV'
type ReportPeriod = 'this_month' | 'last_month' | 'last_quarter'

function getPeriodRange(period: ReportPeriod) {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    if (period === 'last_month') {
        const start = new Date(year, month - 1, 1)
        const end = new Date(year, month, 0, 23, 59, 59, 999)
        return { start, end, label: `${start.toLocaleString('es-PE', { month: 'long' })} ${start.getFullYear()}` }
    }

    if (period === 'last_quarter') {
        const quarter = Math.floor(month / 3)
        const startQuarterMonth = Math.max((quarter - 1) * 3, 0)
        const start = new Date(year, startQuarterMonth, 1)
        const end = new Date(year, startQuarterMonth + 3, 0, 23, 59, 59, 999)
        return { start, end, label: `Q${Math.floor(startQuarterMonth / 3) + 1} ${year}` }
    }

    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
    return { start, end, label: `${start.toLocaleString('es-PE', { month: 'long' })} ${start.getFullYear()}` }
}

function toCsv(rows: Array<Record<string, string | number | null>>) {
    if (!rows.length) return 'sin_datos\n'
    const headers = Object.keys(rows[0])
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const lines = [
        headers.join(','),
        ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))
    ]
    return lines.join('\n')
}

export async function listReports() {
    await requireModuleAccess('reportes')
    const user = await requireAuthUser()

    return prisma.report.findMany({
        where: { generatedById: user.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
            id: true,
            name: true,
            type: true,
            format: true,
            status: true,
            periodLabel: true,
            createdAt: true
        }
    })
}

export async function generateReport(input: {
    type: ReportType
    period: ReportPeriod
    format: ReportFormat
}) {
    await requireModuleAccess('reportes')
    const user = await requireAuthUser()
    const { start, end, label } = getPeriodRange(input.period)

    let summary: Record<string, unknown> = {}
    let rows: Array<Record<string, string | number | null>> = []

    if (input.type === 'financial') {
        const grouped = await prisma.transaction.groupBy({
            by: ['category'],
            where: { date: { gte: start, lte: end } },
            _sum: { amount: true }
        })

        const income = grouped.find((g) => g.category === 'INCOME')?._sum.amount || 0
        const expense = grouped.find((g) => g.category === 'EXPENSE')?._sum.amount || 0
        const transfer = grouped.find((g) => g.category === 'TRANSFER')?._sum.amount || 0
        summary = { income, expense, transfer, profit: income - expense }
        rows = grouped.map((g) => ({
            categoria: g.category,
            monto: g._sum.amount || 0,
            periodo: label
        }))
    } else if (input.type === 'projects') {
        const projects = await prisma.project.findMany({
            where: { createdAt: { lte: end } },
            select: {
                id: true,
                name: true,
                status: true,
                budget: true,
                client: { select: { name: true } },
                updatedAt: true
            },
            take: 200
        })
        summary = {
            total: projects.length,
            active: projects.filter((p) => p.status === 'ACTIVE' || p.status === 'REVIEW').length
        }
        rows = projects.map((p) => ({
            id: p.id,
            proyecto: p.name,
            cliente: p.client.name,
            estado: p.status,
            presupuesto: p.budget,
            actualizado: p.updatedAt.toISOString()
        }))
    } else if (input.type === 'commercial') {
        const leads = await prisma.lead.findMany({
            where: { createdAt: { gte: start, lte: end } },
            select: {
                id: true,
                companyName: true,
                status: true,
                estimatedValue: true,
                createdAt: true
            },
            take: 300
        })
        summary = {
            totalLeads: leads.length,
            won: leads.filter((l) => l.status === 'WON').length,
            pipelineValue: leads.filter((l) => l.status !== 'WON' && l.status !== 'LOST').reduce((s, l) => s + l.estimatedValue, 0)
        }
        rows = leads.map((l) => ({
            id: l.id,
            empresa: l.companyName || '-',
            estado: l.status,
            valor_estimado: l.estimatedValue,
            fecha: l.createdAt.toISOString()
        }))
    } else if (input.type === 'marketing') {
        const leads = await prisma.lead.findMany({
            where: { createdAt: { gte: start, lte: end } },
            select: { source: true, status: true, estimatedValue: true },
            take: 500
        })
        const bySource = new Map<string, number>()
        for (const lead of leads) {
            const key = (lead.source || 'OTROS').toUpperCase()
            bySource.set(key, (bySource.get(key) || 0) + 1)
        }
        summary = {
            totalLeads: leads.length,
            sources: Object.fromEntries(bySource),
            won: leads.filter((l) => l.status === 'WON').length
        }
        rows = Array.from(bySource.entries()).map(([source, count]) => ({
            fuente: source,
            leads: count,
            periodo: label
        }))
    }

    const content = input.format === 'CSV'
        ? toCsv(rows)
        : JSON.stringify({ type: input.type, period: label, summary, rows }, null, 2)

    const report = await prisma.report.create({
        data: {
            name: `Reporte ${input.type} - ${label}`,
            type: input.type,
            format: input.format,
            status: 'READY',
            periodStart: start,
            periodEnd: end,
            periodLabel: label,
            summary: summary as any,
            content,
            generatedById: user.id
        },
        select: {
            id: true,
            name: true,
            type: true,
            format: true,
            status: true,
            periodLabel: true,
            createdAt: true
        }
    })

    revalidatePath('/reportes')
    return { success: true, report }
}

export async function emailReportByBrevo(input: {
    reportId: string
    to?: string
}) {
    await requireModuleAccess('reportes')
    const user = await requireAuthUser()

    const report = await prisma.report.findFirst({
        where: {
            id: input.reportId,
            generatedById: user.id
        },
        select: {
            id: true,
            name: true,
            format: true,
            content: true,
            periodLabel: true
        }
    })
    if (!report) return { success: false, error: 'Reporte no encontrado' }

    const to = (input.to || user.email || '').trim().toLowerCase()
    if (!to) return { success: false, error: 'No hay correo destino para enviar el reporte' }

    const body = [
        `Reporte: ${report.name}`,
        report.periodLabel ? `Periodo: ${report.periodLabel}` : null,
        `Formato: ${report.format}`,
        '',
        'Resumen / contenido:',
        '',
        report.content || '(Sin contenido)'
    ]
        .filter(Boolean)
        .join('\n')

    const sendResult = await sendSystemEmailByBrevo({
        to,
        subject: `Reporte Fibra Core: ${report.name}`,
        text: body.slice(0, 180000)
    })
    if (!sendResult.success) {
        return { success: false, error: sendResult.error || 'No se pudo enviar el reporte por correo' }
    }
    return { success: true }
}
