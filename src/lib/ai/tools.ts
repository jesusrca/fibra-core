import prisma from '@/lib/prisma'
import { LeadStatus, Prisma, ProjectStatus, Role } from '@prisma/client'

type ProjectFilters = {
    status?: ProjectStatus
    query?: string
}

type LeadFilters = {
    status?: LeadStatus
    query?: string
}

type UserFilters = {
    role?: Role
}

export async function getProjects({ status, query }: ProjectFilters) {
    try {
        const where: Prisma.ProjectWhereInput = {
            ...(status ? { status } : {}),
            ...(query ? {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { client: { name: { contains: query, mode: 'insensitive' } } }
                ]
            } : {})
        }

        const projects = await prisma.project.findMany({
            where,
            select: {
                id: true,
                name: true,
                status: true,
                startDate: true,
                endDate: true,
                budget: true,
                client: { select: { name: true } },
                director: { select: { name: true } }
            },
            take: 10
        })

        return projects
    } catch (error) {
        console.error('Error fetching projects:', error)
        return []
    }
}

export async function getLeads({ status, query }: LeadFilters) {
    try {
        const where: Prisma.LeadWhereInput = {
            ...(status ? { status } : {}),
            ...(query ? {
                OR: [
                    { companyName: { contains: query, mode: 'insensitive' } },
                    { contact: { firstName: { contains: query, mode: 'insensitive' } } }
                ]
            } : {})
        }

        const leads = await prisma.lead.findMany({
            where,
            select: {
                id: true,
                companyName: true,
                status: true,
                estimatedValue: true,
                serviceRequested: true,
                createdAt: true
            },
            take: 10,
            orderBy: { createdAt: 'desc' }
        })

        return leads
    } catch (error) {
        console.error('Error fetching leads:', error)
        return []
    }
}

export async function getFinancialSummary() {
    const now = new Date()
    const month = now.toLocaleString('es-PE', { month: 'long' })

    try {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        // Simple summary: Income vs Expenses for current month
        const transactions = await prisma.transaction.groupBy({
            by: ['category'],
            where: {
                date: { gte: startOfMonth }
            },
            _sum: {
                amount: true
            }
        })

        const income = transactions.find((t) => t.category === 'INCOME')?._sum.amount || 0
        const expenses = transactions.find((t) => t.category === 'EXPENSE')?._sum.amount || 0

        return {
            month,
            income,
            expenses,
            profit: income - expenses
        }
    } catch (error) {
        console.error('Error fetching financial summary:', error)
        return {
            month,
            income: 0,
            expenses: 0,
            profit: 0,
            note: 'No se pudo obtener la data financiera en este momento'
        }
    }
}

export async function getUsers({ role }: UserFilters) {
    try {
        const users = await prisma.user.findMany({
            where: role ? { role } : {},
            select: {
                id: true,
                name: true,
                role: true,
                email: true,
                specialty: true
            }
        })
        return users
    } catch (error) {
        console.error('Error fetching users:', error)
        return []
    }
}
