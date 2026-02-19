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

export type AIToolContext = {
    userId: string
    role: Role
}

type WriteToolName = 'createLead' | 'createClient' | 'createContact'

const WRITE_TOOL_ROLES: Record<WriteToolName, Role[]> = {
    createLead: [Role.ADMIN, Role.GERENCIA, Role.COMERCIAL],
    createClient: [Role.ADMIN, Role.GERENCIA, Role.COMERCIAL],
    createContact: [Role.ADMIN, Role.GERENCIA, Role.COMERCIAL]
}

async function auditWriteTool(params: {
    ctx: AIToolContext
    toolName: WriteToolName
    input: unknown
    success: boolean
    error?: string
}) {
    const inputJson = JSON.parse(JSON.stringify(params.input ?? {})) as Prisma.InputJsonValue
    try {
        await prisma.toolAuditLog.create({
            data: {
                userId: params.ctx.userId,
                toolName: params.toolName,
                action: 'WRITE',
                inputJson,
                success: params.success,
                error: params.error || null
            }
        })
    } catch (error) {
        console.error('Error writing tool audit log:', error)
    }
}

function canRunWriteTool(role: Role, toolName: WriteToolName) {
    return WRITE_TOOL_ROLES[toolName].includes(role)
}

export async function getProjects({ status, query }: ProjectFilters) {
    try {
        const where: Prisma.ProjectWhereInput = {
            ...(status ? { status } : {}),
            ...(query
                ? {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { client: { name: { contains: query, mode: 'insensitive' } } }
                    ]
                }
                : {})
        }

        return await prisma.project.findMany({
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
    } catch (error) {
        console.error('Error fetching projects:', error)
        return []
    }
}

export async function getLeads({ status, query }: LeadFilters) {
    try {
        const where: Prisma.LeadWhereInput = {
            ...(status ? { status } : {}),
            ...(query
                ? {
                    OR: [
                        { companyName: { contains: query, mode: 'insensitive' } },
                        { contact: { firstName: { contains: query, mode: 'insensitive' } } }
                    ]
                }
                : {})
        }

        return await prisma.lead.findMany({
            where,
            select: {
                id: true,
                companyName: true,
                status: true,
                estimatedValue: true,
                serviceRequested: true,
                clientId: true,
                createdAt: true
            },
            take: 10,
            orderBy: { createdAt: 'desc' }
        })
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
        return await prisma.user.findMany({
            where: role ? { role } : {},
            select: {
                id: true,
                name: true,
                role: true,
                email: true,
                specialty: true
            }
        })
    } catch (error) {
        console.error('Error fetching users:', error)
        return []
    }
}

export async function createClientByAI(
    ctx: AIToolContext,
    input: {
        name: string
        country?: string
        industry?: string
        taxId?: string
        address?: string
        mainEmail?: string
    }
) {
    if (!canRunWriteTool(ctx.role, 'createClient')) {
        const error = `Rol ${ctx.role} sin permisos para crear empresas`
        await auditWriteTool({ ctx, toolName: 'createClient', input, success: false, error })
        return { success: false as const, error }
    }

    try {
        const existing = await prisma.client.findFirst({
            where: { name: { equals: input.name, mode: 'insensitive' } },
            select: { id: true, name: true }
        })

        if (existing) {
            await auditWriteTool({ ctx, toolName: 'createClient', input, success: true })
            return { success: true as const, created: false as const, client: existing }
        }

        const client = await prisma.client.create({
            data: {
                name: input.name,
                country: input.country,
                industry: input.industry,
                taxId: input.taxId,
                address: input.address,
                mainEmail: input.mainEmail
            },
            select: { id: true, name: true, country: true, industry: true, mainEmail: true }
        })

        await auditWriteTool({ ctx, toolName: 'createClient', input, success: true })
        return { success: true as const, created: true as const, client }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error creando empresa'
        await auditWriteTool({ ctx, toolName: 'createClient', input, success: false, error: message })
        return { success: false as const, error: message }
    }
}

export async function createContactByAI(
    ctx: AIToolContext,
    input: {
        firstName: string
        lastName: string
        email: string
        phone?: string
        contactMethod?: string
        country?: string
        specialty?: string
        clientId?: string
        clientName?: string
    }
) {
    if (!canRunWriteTool(ctx.role, 'createContact')) {
        const error = `Rol ${ctx.role} sin permisos para crear contactos`
        await auditWriteTool({ ctx, toolName: 'createContact', input, success: false, error })
        return { success: false as const, error }
    }

    try {
        let clientId = input.clientId
        if (!clientId && input.clientName) {
            const byName = await prisma.client.findFirst({
                where: { name: { equals: input.clientName, mode: 'insensitive' } },
                select: { id: true }
            })

            if (byName) {
                clientId = byName.id
            } else {
                const createdClient = await prisma.client.create({
                    data: { name: input.clientName },
                    select: { id: true }
                })
                clientId = createdClient.id
            }
        }

        if (!clientId) {
            const error = 'Debes indicar clientId o clientName para crear contacto'
            await auditWriteTool({ ctx, toolName: 'createContact', input, success: false, error })
            return { success: false as const, error }
        }

        const contact = await prisma.contact.create({
            data: {
                firstName: input.firstName,
                lastName: input.lastName,
                email: input.email,
                phone: input.phone,
                contactMethod: input.contactMethod,
                country: input.country,
                specialty: input.specialty,
                clientId
            },
            select: { id: true, firstName: true, lastName: true, email: true, clientId: true }
        })

        await auditWriteTool({ ctx, toolName: 'createContact', input, success: true })
        return { success: true as const, contact }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error creando contacto'
        await auditWriteTool({ ctx, toolName: 'createContact', input, success: false, error: message })
        return { success: false as const, error: message }
    }
}

export async function createLeadByAI(
    ctx: AIToolContext,
    input: {
        companyName?: string
        clientId?: string
        contactId?: string
        serviceRequested: string
        requirementDetail?: string
        estimatedValue?: number
        source?: string
        status?: LeadStatus
    }
) {
    if (!canRunWriteTool(ctx.role, 'createLead')) {
        const error = `Rol ${ctx.role} sin permisos para crear leads`
        await auditWriteTool({ ctx, toolName: 'createLead', input, success: false, error })
        return { success: false as const, error }
    }

    try {
        let clientId = input.clientId

        if (!clientId && input.companyName) {
            const existingClient = await prisma.client.findFirst({
                where: { name: { equals: input.companyName, mode: 'insensitive' } },
                select: { id: true }
            })

            if (existingClient) {
                clientId = existingClient.id
            } else {
                const newClient = await prisma.client.create({
                    data: { name: input.companyName },
                    select: { id: true }
                })
                clientId = newClient.id
            }
        }

        if (!clientId && !input.companyName) {
            const error = 'Debes indicar companyName o clientId para crear lead'
            await auditWriteTool({ ctx, toolName: 'createLead', input, success: false, error })
            return { success: false as const, error }
        }

        const lead = await prisma.lead.create({
            data: {
                companyName: input.companyName,
                clientId,
                contactId: input.contactId,
                serviceRequested: input.serviceRequested,
                requirementDetail: input.requirementDetail,
                estimatedValue: input.estimatedValue || 0,
                source: input.source,
                status: input.status || LeadStatus.NEW
            },
            select: {
                id: true,
                companyName: true,
                status: true,
                estimatedValue: true,
                clientId: true,
                serviceRequested: true
            }
        })

        await auditWriteTool({ ctx, toolName: 'createLead', input, success: true })
        return { success: true as const, lead }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error creando lead'
        await auditWriteTool({ ctx, toolName: 'createLead', input, success: false, error: message })
        return { success: false as const, error: message }
    }
}
