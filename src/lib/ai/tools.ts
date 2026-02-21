import prisma from '@/lib/prisma'
import { LeadStatus, Prisma, ProjectStatus, Role } from '@prisma/client'
import { canAccess } from '@/lib/rbac'
import { createNotificationForUser } from '@/lib/notifications'
import { revalidatePath } from 'next/cache'

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

type ClientFilters = {
    query?: string
    hasActiveProjects?: boolean
    limit?: number
}

type ContactFilters = {
    query?: string
    clientName?: string
    limit?: number
}

type SupplierFilters = {
    query?: string
    category?: string
    city?: string
}

export type AIToolContext = {
    userId: string
    role: Role
}

type WriteToolName = 'createLead' | 'createClient' | 'createContact' | 'createProject' | 'createTask' | 'updateLeadStatus'

const WRITE_TOOL_ROLES: Record<WriteToolName, Role[]> = {
    createLead: [Role.ADMIN, Role.GERENCIA, Role.COMERCIAL],
    createClient: [Role.ADMIN, Role.GERENCIA, Role.COMERCIAL],
    createContact: [Role.ADMIN, Role.GERENCIA, Role.COMERCIAL],
    createProject: [Role.ADMIN, Role.GERENCIA, Role.PROYECTOS],
    createTask: [Role.ADMIN, Role.GERENCIA, Role.PROYECTOS, Role.MARKETING, Role.COMERCIAL],
    updateLeadStatus: [Role.ADMIN, Role.GERENCIA, Role.COMERCIAL]
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

function parseSpanishDateInput(value?: string): Date | null {
    const raw = (value || '').trim()
    if (!raw) return null

    const normalized = raw
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (normalized === 'hoy' || normalized === 'today') {
        return startOfToday
    }
    if (normalized === 'manana' || normalized === 'tomorrow') {
        const tomorrow = new Date(startOfToday)
        tomorrow.setDate(tomorrow.getDate() + 1)
        return tomorrow
    }
    if (normalized === 'pasado manana' || normalized === 'day after tomorrow') {
        const dayAfterTomorrow = new Date(startOfToday)
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
        return dayAfterTomorrow
    }

    const dmyMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
    if (dmyMatch) {
        const day = Number.parseInt(dmyMatch[1], 10)
        const month = Number.parseInt(dmyMatch[2], 10) - 1
        const year = Number.parseInt(dmyMatch[3], 10)
        const parsed = new Date(year, month, day)
        if (
            parsed.getFullYear() === year &&
            parsed.getMonth() === month &&
            parsed.getDate() === day
        ) {
            return parsed
        }
    }

    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (isoMatch) {
        const year = Number.parseInt(isoMatch[1], 10)
        const month = Number.parseInt(isoMatch[2], 10) - 1
        const day = Number.parseInt(isoMatch[3], 10)
        const parsed = new Date(year, month, day)
        if (
            parsed.getFullYear() === year &&
            parsed.getMonth() === month &&
            parsed.getDate() === day
        ) {
            return parsed
        }
    }

    const parsed = new Date(raw)
    if (!Number.isNaN(parsed.getTime())) return parsed
    return null
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
                currency: true,
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

export async function getClients(ctx: AIToolContext, { query, hasActiveProjects, limit }: ClientFilters) {
    if (!canAccess(ctx.role, 'comercial')) {
        return {
            success: false as const,
            error: `Rol ${ctx.role} sin permisos para ver empresas`
        }
    }

    try {
        const take = Math.min(Math.max(limit || 10, 1), 30)
        const clients = await prisma.client.findMany({
            where: query
                ? {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { mainEmail: { contains: query, mode: 'insensitive' } },
                        { country: { contains: query, mode: 'insensitive' } },
                        { industry: { contains: query, mode: 'insensitive' } }
                    ]
                }
                : undefined,
            select: {
                id: true,
                name: true,
                country: true,
                industry: true,
                mainEmail: true,
                contacts: {
                    select: { id: true }
                },
                projects: {
                    select: {
                        id: true,
                        name: true,
                        status: true
                    },
                    orderBy: { updatedAt: 'desc' },
                    take: 20
                }
            },
            orderBy: { name: 'asc' },
            take
        })

        const rows = clients
            .map((client) => {
                const activeProjects = client.projects.filter((p) => p.status === ProjectStatus.ACTIVE)
                return {
                    id: client.id,
                    name: client.name,
                    country: client.country,
                    industry: client.industry,
                    mainEmail: client.mainEmail,
                    contactsCount: client.contacts.length,
                    projectsCount: client.projects.length,
                    activeProjectsCount: activeProjects.length,
                    projects: client.projects
                }
            })
            .filter((client) => {
                if (hasActiveProjects === undefined) return true
                return hasActiveProjects ? client.activeProjectsCount > 0 : true
            })

        return {
            success: true as const,
            clients: rows
        }
    } catch (error) {
        console.error('Error fetching clients for AI:', error)
        return {
            success: false as const,
            error: 'No se pudo obtener la lista de empresas'
        }
    }
}

export async function getContacts(ctx: AIToolContext, { query, clientName, limit }: ContactFilters) {
    if (!canAccess(ctx.role, 'comercial')) {
        return {
            success: false as const,
            error: `Rol ${ctx.role} sin permisos para ver contactos`
        }
    }

    try {
        const take = Math.min(Math.max(limit || 10, 1), 30)
        const contacts = await prisma.contact.findMany({
            where: {
                ...(query
                    ? {
                        OR: [
                            { firstName: { contains: query, mode: 'insensitive' } },
                            { lastName: { contains: query, mode: 'insensitive' } },
                            { email: { contains: query, mode: 'insensitive' } },
                            { client: { name: { contains: query, mode: 'insensitive' } } }
                        ]
                    }
                    : {}),
                ...(clientName
                    ? { client: { name: { contains: clientName, mode: 'insensitive' } } }
                    : {})
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                specialty: true,
                country: true,
                client: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
            take
        })

        return {
            success: true as const,
            contacts
        }
    } catch (error) {
        console.error('Error fetching contacts for AI:', error)
        return {
            success: false as const,
            error: 'No se pudo obtener la lista de contactos'
        }
    }
}

export async function getSuppliers(ctx: AIToolContext, { query, category, city }: SupplierFilters) {
    if (!canAccess(ctx.role, 'proveedores')) {
        return {
            success: false as const,
            error: `Rol ${ctx.role} sin permisos para ver proveedores`
        }
    }

    try {
        const where: Prisma.SupplierWhereInput = {
            ...(category ? { category: { contains: category, mode: 'insensitive' } } : {}),
            ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
            ...(query
                ? {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { category: { contains: query, mode: 'insensitive' } },
                        { city: { contains: query, mode: 'insensitive' } },
                        { contactName: { contains: query, mode: 'insensitive' } }
                    ]
                }
                : {})
        }

        const suppliers = await prisma.supplier.findMany({
            where,
            select: {
                id: true,
                name: true,
                category: true,
                city: true,
                rating: true,
                contactName: true
            },
            orderBy: [{ rating: 'desc' }, { name: 'asc' }],
            take: 20
        })

        return {
            success: true as const,
            suppliers
        }
    } catch (error) {
        console.error('Error fetching suppliers for AI:', error)
        return {
            success: false as const,
            error: 'No se pudo obtener la lista de proveedores'
        }
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
        firstName?: string
        lastName?: string
        fullName?: string
        email?: string
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
        const fullName = (input.fullName || '').trim()
        let normalizedFirstName = (input.firstName || '').trim()
        let normalizedLastName = (input.lastName || '').trim()
        if ((!normalizedFirstName || !normalizedLastName) && fullName) {
            const parts = fullName.split(/\s+/).filter(Boolean)
            if (!normalizedFirstName) normalizedFirstName = parts[0] || ''
            if (!normalizedLastName) normalizedLastName = parts.slice(1).join(' ') || '-'
        }
        if (!normalizedFirstName) {
            const error = 'Debes indicar al menos el nombre del contacto'
            await auditWriteTool({ ctx, toolName: 'createContact', input, success: false, error })
            return { success: false as const, error }
        }
        if (!normalizedLastName) normalizedLastName = '-'

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
            const defaultClientName = 'Sin empresa asignada'
            const fallbackClient = await prisma.client.findFirst({
                where: { name: { equals: defaultClientName, mode: 'insensitive' } },
                select: { id: true }
            })
            if (fallbackClient) {
                clientId = fallbackClient.id
            } else {
                const createdClient = await prisma.client.create({
                    data: { name: defaultClientName },
                    select: { id: true }
                })
                clientId = createdClient.id
            }
        }

        const normalizedEmail = (input.email || '').trim().toLowerCase()
        const email =
            normalizedEmail ||
            `pendiente+${Date.now()}${Math.floor(Math.random() * 1000)}@pending.local`

        const contact = await prisma.contact.create({
            data: {
                firstName: normalizedFirstName,
                lastName: normalizedLastName,
                email,
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
        currency?: 'USD' | 'PEN'
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
                currency: input.currency || 'USD',
                source: input.source,
                status: input.status || LeadStatus.NEW
            },
            select: {
                id: true,
                companyName: true,
                status: true,
                estimatedValue: true,
                currency: true,
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

export async function updateLeadStatusByAI(
    ctx: AIToolContext,
    input: {
        leadId: string
        status: LeadStatus
    }
) {
    if (!canRunWriteTool(ctx.role, 'updateLeadStatus')) {
        const error = `Rol ${ctx.role} sin permisos para actualizar estado de leads`
        await auditWriteTool({ ctx, toolName: 'updateLeadStatus', input, success: false, error })
        return { success: false as const, error }
    }

    try {
        const existing = await prisma.lead.findUnique({
            where: { id: input.leadId },
            select: { id: true, companyName: true, status: true }
        })
        if (!existing) {
            const error = 'Lead no encontrado'
            await auditWriteTool({ ctx, toolName: 'updateLeadStatus', input, success: false, error })
            return { success: false as const, error }
        }

        const lead = await prisma.lead.update({
            where: { id: input.leadId },
            data: { status: input.status },
            select: {
                id: true,
                companyName: true,
                status: true
            }
        })

        revalidatePath('/comercial')
        await auditWriteTool({ ctx, toolName: 'updateLeadStatus', input, success: true })
        return { success: true as const, lead }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error actualizando estado del lead'
        await auditWriteTool({ ctx, toolName: 'updateLeadStatus', input, success: false, error: message })
        return { success: false as const, error: message }
    }
}

export async function createProjectByAI(
    ctx: AIToolContext,
    input: {
        name: string
        clientId?: string
        clientName?: string
        directorId?: string
        directorEmail?: string
        directorName?: string
        budget?: number
        serviceType?: string
        status?: ProjectStatus
        startDate?: string
        endDate?: string
    }
) {
    if (!canRunWriteTool(ctx.role, 'createProject')) {
        const error = `Rol ${ctx.role} sin permisos para crear proyectos`
        await auditWriteTool({ ctx, toolName: 'createProject', input, success: false, error })
        return { success: false as const, error }
    }

    try {
        let clientId = input.clientId
        if (!clientId && input.clientName) {
            const existingClient = await prisma.client.findFirst({
                where: { name: { equals: input.clientName, mode: 'insensitive' } },
                select: { id: true }
            })

            if (existingClient) {
                clientId = existingClient.id
            } else {
                const newClient = await prisma.client.create({
                    data: { name: input.clientName },
                    select: { id: true }
                })
                clientId = newClient.id
            }
        }

        if (!clientId) {
            const defaultClientName = 'Sin cliente asignado'
            const fallbackClient = await prisma.client.findFirst({
                where: { name: { equals: defaultClientName, mode: 'insensitive' } },
                select: { id: true }
            })
            if (fallbackClient) {
                clientId = fallbackClient.id
            } else {
                const createdClient = await prisma.client.create({
                    data: { name: defaultClientName },
                    select: { id: true }
                })
                clientId = createdClient.id
            }
        }

        let directorId = input.directorId
        if (!directorId && input.directorEmail) {
            const byEmail = await prisma.user.findFirst({
                where: { email: { equals: input.directorEmail, mode: 'insensitive' } },
                select: { id: true }
            })
            if (byEmail) directorId = byEmail.id
        }
        if (!directorId && input.directorName) {
            const byName = await prisma.user.findFirst({
                where: { name: { contains: input.directorName, mode: 'insensitive' } },
                select: { id: true }
            })
            if (byName) directorId = byName.id
        }
        if (!directorId) {
            const currentUser = await prisma.user.findUnique({
                where: { id: ctx.userId },
                select: { id: true }
            })
            if (currentUser) directorId = currentUser.id
        }
        if (!directorId) {
            const error = 'No se encontró directorId válido para el proyecto'
            await auditWriteTool({ ctx, toolName: 'createProject', input, success: false, error })
            return { success: false as const, error }
        }

        const existingProject = await prisma.project.findFirst({
            where: {
                name: { equals: input.name, mode: 'insensitive' },
                clientId,
                status: { in: [ProjectStatus.PLANNING, ProjectStatus.ACTIVE, ProjectStatus.REVIEW] }
            },
            select: {
                id: true,
                name: true,
                status: true,
                clientId: true
            }
        })

        if (existingProject) {
            await auditWriteTool({ ctx, toolName: 'createProject', input, success: true })
            return { success: true as const, created: false as const, project: existingProject }
        }

        const startDate = input.startDate ? new Date(input.startDate) : new Date()
        const endDate = input.endDate ? new Date(input.endDate) : undefined
        const project = await prisma.project.create({
            data: {
                name: input.name,
                clientId,
                directorId,
                budget: input.budget ?? 0,
                serviceType: input.serviceType,
                status: input.status ?? ProjectStatus.PLANNING,
                startDate: Number.isNaN(startDate.getTime()) ? new Date() : startDate,
                endDate: endDate && !Number.isNaN(endDate.getTime()) ? endDate : null
            },
            select: {
                id: true,
                name: true,
                status: true,
                budget: true,
                clientId: true,
                directorId: true,
                startDate: true,
                endDate: true
            }
        })

        await auditWriteTool({ ctx, toolName: 'createProject', input, success: true })
        return { success: true as const, created: true as const, project }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error creando proyecto'
        await auditWriteTool({ ctx, toolName: 'createProject', input, success: false, error: message })
        return { success: false as const, error: message }
    }
}

export async function createTaskByAI(
    ctx: AIToolContext,
    input: {
        title: string
        description?: string
        projectId?: string
        projectName?: string
        assigneeId?: string
        assigneeEmail?: string
        assigneeName?: string
        priority?: 'HIGH' | 'MEDIUM' | 'LOW'
        dueDate?: string
        startDate?: string
    }
) {
    if (!canRunWriteTool(ctx.role, 'createTask')) {
        const error = `Rol ${ctx.role} sin permisos para crear tareas`
        await auditWriteTool({ ctx, toolName: 'createTask', input, success: false, error })
        return { success: false as const, error }
    }

    try {
        let projectId = (input.projectId || '').trim()
        if (!projectId && input.projectName) {
            const project = await prisma.project.findFirst({
                where: {
                    OR: [
                        { name: { equals: input.projectName, mode: 'insensitive' } },
                        { name: { contains: input.projectName, mode: 'insensitive' } }
                    ]
                },
                select: { id: true, name: true },
                orderBy: { updatedAt: 'desc' }
            })
            if (project) projectId = project.id
        }

        if (!projectId) {
            const error = 'No se pudo determinar el proyecto (projectId o projectName son requeridos)'
            await auditWriteTool({ ctx, toolName: 'createTask', input, success: false, error })
            return { success: false as const, error }
        }

        let assigneeId = (input.assigneeId || '').trim() || undefined
        if (!assigneeId && input.assigneeEmail) {
            const byEmail = await prisma.user.findFirst({
                where: { email: { equals: input.assigneeEmail, mode: 'insensitive' } },
                select: { id: true }
            })
            if (byEmail) assigneeId = byEmail.id
        }
        if (!assigneeId && input.assigneeName) {
            const byName = await prisma.user.findFirst({
                where: { name: { contains: input.assigneeName, mode: 'insensitive' } },
                select: { id: true }
            })
            if (byName) assigneeId = byName.id
        }

        const parsedDueDate = parseSpanishDateInput(input.dueDate)
        const parsedStartDate = parseSpanishDateInput(input.startDate)

        const task = await prisma.task.create({
            data: {
                title: input.title.trim(),
                description: (input.description || '').trim() || null,
                status: 'TODO',
                priority: input.priority || 'MEDIUM',
                projectId,
                assigneeId: assigneeId || null,
                dueDate: parsedDueDate,
                startDate: parsedStartDate
            },
            select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                dueDate: true,
                project: { select: { id: true, name: true } },
                assignee: { select: { id: true, name: true, email: true } }
            }
        })

        if (task.assignee?.id) {
            await createNotificationForUser({
                userId: task.assignee.id,
                type: 'task_due',
                message: `Nueva tarea asignada: ${task.title}`
            })
        }

        revalidatePath('/tareas')
        revalidatePath(`/proyectos/${projectId}`)
        revalidatePath('/dashboard')

        await auditWriteTool({ ctx, toolName: 'createTask', input, success: true })
        return { success: true as const, task }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error creando tarea'
        await auditWriteTool({ ctx, toolName: 'createTask', input, success: false, error: message })
        return { success: false as const, error: message }
    }
}
