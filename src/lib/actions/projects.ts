'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { createNotificationForRoles, createNotificationForUser } from '@/lib/notifications'
import { InvoiceStatus, ProjectStatus, Role } from '@prisma/client'
import { projectCreateSchema } from '@/lib/validation/schemas'
import { z } from 'zod'

function normalizeServiceName(name: string) {
    return name.trim().replace(/\s+/g, ' ')
}

function toInboxSlug(value: string) {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24) || 'proyecto'
}

async function generateProjectInboxEmail(projectName: string) {
    const domain = (process.env.PROJECT_INBOX_DOMAIN || 'projects.fibra.local').trim().toLowerCase()
    const base = toInboxSlug(projectName)
    for (let i = 0; i < 6; i += 1) {
        const suffix = Math.random().toString(36).slice(2, 6)
        const local = `${base}-${suffix}`
        const email = `${local}@${domain}`
        const exists = await withPrismaRetry(() =>
            prisma.project.findFirst({
                where: { inboxEmail: { equals: email, mode: 'insensitive' } },
                select: { id: true }
            })
        )
        if (!exists) return email
    }
    return `${base}-${Date.now()}@${domain}`
}

async function generateInvoiceNumber() {
    const year = new Date().getFullYear()
    for (let i = 0; i < 5; i += 1) {
        const random = Math.floor(10000 + Math.random() * 90000)
        const number = `INV-${year}-${random}`
        const exists = await withPrismaRetry(() => prisma.invoice.findUnique({
            where: { invoiceNumber: number },
            select: { id: true }
        }))
        if (!exists) return number
    }
    return `INV-${year}-${Date.now()}`
}

async function createMissingInvoicesForCompletedMilestones(projectId: string) {
    const project = await withPrismaRetry(() => prisma.project.findUnique({
        where: { id: projectId },
        select: {
            id: true,
            name: true,
            clientId: true,
            budget: true,
            startDate: true,
            status: true,
            quote: {
                select: {
                    installmentsCount: true
                }
            },
            milestones: { select: { id: true, status: true, billable: true } },
            invoices: { select: { id: true, status: true } }
        }
    }))

    if (!project) return { created: 0, amountPerInvoice: 0 }

    const billableMilestones = project.milestones.filter((m) => m.billable !== false)
    const totalMilestones = Math.max(billableMilestones.length, 1)
    const completedMilestones = billableMilestones.filter((m) => m.status === 'COMPLETED').length
    const issuedInvoices = project.invoices.filter((invoice) => invoice.status !== InvoiceStatus.CANCELLED).length
    const quoteInstallments = Math.max(project.quote?.installmentsCount || 0, 0)
    const statusAllowsInstallments = project.status === 'ACTIVE' || project.status === 'REVIEW' || project.status === 'COMPLETED'
    const startDate = project.startDate || new Date()
    const monthsElapsed = Math.max(
        0,
        (new Date().getFullYear() - startDate.getFullYear()) * 12 + (new Date().getMonth() - startDate.getMonth())
    )
    const accruedInstallments = statusAllowsInstallments ? Math.min(quoteInstallments, monthsElapsed + 1) : 0
    const targetInvoices = Math.max(completedMilestones, accruedInstallments)
    const missing = Math.max(targetInvoices - issuedInvoices, 0)

    if (missing === 0) return { created: 0, amountPerInvoice: 0 }

    const divisor = Math.max(totalMilestones, quoteInstallments, 1)
    const installmentAmount = Math.round((project.budget / divisor) * 100) / 100
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 7)

    for (let i = 0; i < missing; i += 1) {
        const invoiceNumber = await generateInvoiceNumber()
        await withPrismaRetry(() => prisma.invoice.create({
            data: {
                invoiceNumber,
                clientId: project.clientId,
                projectId: project.id,
                amount: installmentAmount,
                issueDate: new Date(),
                dueDate,
                status: InvoiceStatus.SENT,
                paymentMethod: 'Transferencia'
            }
        }))
    }

    return { created: missing, amountPerInvoice: installmentAmount }
}

export async function upsertServiceCatalogFromName(rawName: string) {
    const name = normalizeServiceName(rawName || '')
    if (!name) return null

    const existing = await withPrismaRetry(() =>
        prisma.serviceCatalog.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } },
            select: { id: true, isActive: true }
        })
    )

    if (existing) {
        if (!existing.isActive) {
            await withPrismaRetry(() =>
                prisma.serviceCatalog.update({
                    where: { id: existing.id },
                    data: { isActive: true }
                })
            )
        }
        return existing.id
    }

    const created = await withPrismaRetry(() =>
        prisma.serviceCatalog.create({
            data: { name },
            select: { id: true }
        })
    )
    return created.id
}

export async function getProjects() {
    try {
        await requireModuleAccess('proyectos')
        const projects = await withPrismaRetry(() => prisma.project.findMany({
            include: {
                client: true,
                director: true,
                milestones: true,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        }))
        return projects
    } catch (error) {
        console.error('Error fetching projects:', error)
        return []
    }
}

export async function createProject(data: {
    name: string
    clientId: string
    directorId: string
    status: ProjectStatus
    budget: number
    serviceType: string
    endDate?: Date
    startDate?: Date
}) {
    try {
        await requireModuleAccess('proyectos')
        const parsed = projectCreateSchema.safeParse(data)
        if (!parsed.success) {
            const message = parsed.error.issues[0]?.message || 'Datos inválidos para crear proyecto'
            return { success: false, error: message }
        }
        const payload = parsed.data
        const serviceType = normalizeServiceName(payload.serviceType || '')
        if (!serviceType) return { success: false, error: 'El tipo de servicio es obligatorio' }

        const duplicate = await withPrismaRetry(() =>
            prisma.project.findFirst({
                where: {
                    clientId: payload.clientId,
                    name: { equals: payload.name, mode: 'insensitive' }
                },
                select: { id: true }
            })
        )
        if (duplicate) {
            return { success: false, error: 'Ya existe un proyecto con ese nombre para este cliente' }
        }

        await upsertServiceCatalogFromName(serviceType)
        const inboxEmail = await generateProjectInboxEmail(payload.name)

        const project = await withPrismaRetry(() => prisma.project.create({
            data: {
                name: payload.name,
                inboxEmail,
                clientId: payload.clientId,
                directorId: payload.directorId,
                status: payload.status,
                budget: payload.budget,
                serviceType,
                startDate: payload.startDate || new Date(),
                endDate: payload.endDate || null,
                // milestonesCount: 0 
            },
        }))
        await createNotificationForRoles({
            roles: [Role.ADMIN, Role.GERENCIA, Role.PROYECTOS],
            type: 'project_update',
            message: `Nuevo proyecto creado: ${project.name}`
        })
        revalidatePath('/proyectos')
        revalidatePath('/marketing')
        return { success: true, project }
    } catch (error) {
        console.error('Error creating project:', error)
        return { success: false, error: 'Error al crear el proyecto' }
    }
}

export async function createProjectClient(data: {
    name: string
    country?: string
    industry?: string
    mainEmail?: string
}) {
    try {
        await requireModuleAccess('proyectos')
        const name = (data.name || '').trim()
        if (!name) return { success: false, error: 'El nombre del cliente es obligatorio' }

        const existing = await withPrismaRetry(() => prisma.client.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } },
            select: { id: true, name: true }
        }))
        if (existing) return { success: true, client: existing, created: false as const }

        const client = await withPrismaRetry(() => prisma.client.create({
            data: {
                name,
                country: (data.country || '').trim() || null,
                industry: (data.industry || '').trim() || null,
                mainEmail: (data.mainEmail || '').trim() || null
            },
            select: { id: true, name: true }
        }))

        revalidatePath('/proyectos')
        return { success: true, client, created: true as const }
    } catch (error) {
        console.error('Error creating project client:', error)
        return { success: false, error: 'Error al crear el cliente' }
    }
}

const projectStatusSchema = z.nativeEnum(ProjectStatus)

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
    try {
        await requireModuleAccess('proyectos')
        const parsedStatus = projectStatusSchema.safeParse(status)
        if (!parsedStatus.success) return { success: false, error: 'Estado de proyecto inválido' }
        await withPrismaRetry(() => prisma.project.update({
            where: { id: projectId },
            data: { status: parsedStatus.data },
        }))
        revalidatePath('/proyectos')
        return { success: true }
    } catch (error) {
        console.error('Error updating project status:', error)
        return { success: false }
    }
}

export async function updateProjectAssignments(data: {
    projectId: string
    directorId: string
    teamIds: string[]
}) {
    try {
        await requireModuleAccess('proyectos')
        const uniqueTeam = Array.from(new Set((data.teamIds || []).filter(Boolean)))

        const updated = await withPrismaRetry(() => prisma.project.update({
            where: { id: data.projectId },
            data: {
                directorId: data.directorId,
                team: {
                    set: uniqueTeam.map((id) => ({ id }))
                }
            },
            select: {
                id: true,
                name: true,
                director: { select: { id: true, name: true } },
                team: { select: { id: true, name: true } }
            }
        }))

        await createNotificationForRoles({
            roles: [Role.ADMIN, Role.GERENCIA, Role.PROYECTOS],
            type: 'project_update',
            message: `Asignaciones actualizadas en ${updated.name}`
        })

        revalidatePath('/proyectos')
        revalidatePath(`/proyectos/${data.projectId}`)
        revalidatePath('/dashboard')
        return { success: true, project: updated }
    } catch (error) {
        console.error('Error updating project assignments:', error)
        return { success: false, error: 'No se pudo actualizar director/equipo' }
    }
}

export async function getClients() {
    try {
        await requireModuleAccess('proyectos')
        return await withPrismaRetry(() => prisma.client.findMany({
            orderBy: { name: 'asc' },
        }))
    } catch (error) {
        return []
    }
}

export async function getUsers() {
    try {
        await requireModuleAccess('proyectos')
        return await withPrismaRetry(() => prisma.user.findMany({
            orderBy: { name: 'asc' },
        }))
    } catch (error) {
        return []
    }
}

export async function getSuppliersCatalog() {
    try {
        await requireModuleAccess('proyectos')
        return await withPrismaRetry(() => prisma.supplier.findMany({
            select: {
                id: true,
                name: true,
                category: true,
                city: true
            },
            orderBy: { name: 'asc' },
            take: 200
        }))
    } catch (error) {
        console.error('Error fetching suppliers catalog:', error)
        return []
    }
}

export async function getProjectById(id: string) {
    try {
        await requireModuleAccess('proyectos')
        const project = await withPrismaRetry(() => prisma.project.findUnique({
            where: { id },
            include: {
                client: true,
                contact: true,
                director: true,
                team: true,
                milestones: {
                    orderBy: { dueDate: 'asc' }
                },
                tasks: {
                    include: { assignee: true },
                    orderBy: { createdAt: 'desc' }
                },
                transactions: true,
                invoices: {
                    select: {
                        id: true,
                        invoiceNumber: true,
                        amount: true,
                        status: true,
                        issueDate: true,
                        dueDate: true,
                        createdAt: true
                    },
                    orderBy: { createdAt: 'desc' }
                },
                suppliers: {
                    include: {
                        supplier: true,
                        payments: {
                            orderBy: [{ paymentDate: 'desc' }, { issueDate: 'desc' }]
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                emailMessages: {
                    orderBy: { receivedAt: 'desc' },
                    take: 25,
                    include: {
                        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
                        integration: { select: { accountEmail: true, provider: true } }
                    }
                }
            }
        }))
        return project
    } catch (error) {
        console.error('Error fetching project:', error)
        return null
    }
}

export async function createMilestone(data: {
    projectId: string
    name: string
    dueDate: Date
    status: string
    billable?: boolean
}) {
    try {
        await requireModuleAccess('proyectos')
        const milestone = await withPrismaRetry(() => prisma.milestone.create({
            data: {
                projectId: data.projectId,
                name: data.name,
                dueDate: data.dueDate,
                status: data.status,
                billable: data.billable ?? true
            }
        }))
        revalidatePath(`/proyectos/${data.projectId}`)
        return { success: true, milestone }
    } catch (error) {
        console.error('Error creating milestone:', error)
        return { success: false, error: 'Error al crear el hito' }
    }
}

export async function updateMilestoneStatus(id: string, status: string, projectId: string) {
    try {
        await requireModuleAccess('proyectos')
        const [previousMilestone, project] = await withPrismaRetry(() => Promise.all([
            prisma.milestone.findUnique({
                where: { id },
                select: { id: true, name: true, status: true, projectId: true, billable: true }
            }),
            prisma.project.findUnique({
                where: { id: projectId },
                select: {
                    id: true,
                    name: true,
                    budget: true,
                    milestones: { select: { id: true } }
                }
            })
        ]))

        const updatedMilestone = await withPrismaRetry(() => prisma.milestone.update({
            where: { id },
            data: { status }
        }))

        const shouldNotifyBilling =
            previousMilestone?.status !== 'COMPLETED' &&
            updatedMilestone.status === 'COMPLETED' &&
            previousMilestone?.billable !== false &&
            !!project

        if (shouldNotifyBilling) {
            const milestonesCount = Math.max(project.milestones.length, 1)
            const suggestedInstallment = Math.round((project.budget / milestonesCount) * 100) / 100
            const autoInvoices = await createMissingInvoicesForCompletedMilestones(project.id)
            await createNotificationForRoles({
                roles: [Role.ADMIN, Role.GERENCIA, Role.CONTABILIDAD, Role.FINANZAS],
                type: 'milestone_billing_due',
                message: `Hito completado en ${project.name}: "${updatedMilestone.name}". Cuota sugerida a cobrar: $${suggestedInstallment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Facturas autoemitidas: ${autoInvoices.created}.`
            })
        }

        revalidatePath('/proyectos')
        revalidatePath(`/proyectos/${projectId}`)
        revalidatePath('/dashboard')
        revalidatePath('/contabilidad')
        revalidatePath('/comercial')
        return { success: true }
    } catch (error) {
        console.error('Error updating milestone:', error)
        return { success: false, error: 'Error al actualizar el hito' }
    }
}

export async function createTask(data: {
    projectId: string
    title: string
    description?: string
    priority: string
    assigneeId?: string
    dueDate?: Date
}) {
    try {
        await requireModuleAccess('proyectos')
        const task = await withPrismaRetry(() => prisma.task.create({
            data: {
                projectId: data.projectId,
                title: data.title,
                description: data.description,
                priority: data.priority,
                assigneeId: data.assigneeId,
                dueDate: data.dueDate,
                status: 'TODO'
            }
        }))
        if (data.assigneeId) {
            await createNotificationForUser({
                userId: data.assigneeId,
                type: 'task_due',
                message: `Nueva tarea asignada: ${task.title}`
            })
        }
        revalidatePath(`/proyectos/${data.projectId}`)
        revalidatePath('/tareas')
        revalidatePath('/dashboard')
        return { success: true, task }
    } catch (error) {
        console.error('Error creating task:', error)
        return { success: false, error: 'Error al crear la tarea' }
    }
}

export async function updateTaskStatus(id: string, status: string, projectId: string) {
    try {
        await requireModuleAccess('proyectos')
        await withPrismaRetry(() => prisma.task.update({
            where: { id },
            data: { status }
        }))
        revalidatePath(`/proyectos/${projectId}`)
        revalidatePath('/tareas')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error updating task:', error)
        return { success: false, error: 'Error al actualizar la tarea' }
    }
}
