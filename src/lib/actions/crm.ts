'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { InvoiceStatus, LeadStatus, Role } from '@prisma/client'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { createNotificationForRoles } from '@/lib/notifications'
import { upsertServiceCatalogFromName } from '@/lib/actions/projects'
import { leadCreateSchema } from '@/lib/validation/schemas'

type QuoteStatus = 'PENDING' | 'SENT' | 'ACCEPTED' | 'REJECTED'

function normalizeText(input: string) {
    return input.trim().replace(/\s+/g, ' ')
}

function buildContactName(firstName: string, lastName: string) {
    return `${normalizeText(firstName)} ${normalizeText(lastName)}`.trim()
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
        const exists = await withPrismaRetry(() => prisma.project.findFirst({
            where: { inboxEmail: { equals: email, mode: 'insensitive' } },
            select: { id: true }
        }))
        if (!exists) return email
    }
    return `${base}-${Date.now()}@${domain}`
}

async function ensureClientByName(name: string) {
    const normalized = normalizeText(name)
    const existing = await withPrismaRetry(() => prisma.client.findFirst({
        where: { name: { equals: normalized, mode: 'insensitive' } },
        select: { id: true }
    }))
    if (existing) return existing.id

    const created = await withPrismaRetry(() => prisma.client.create({
        data: { name: normalized },
        select: { id: true }
    }))
    return created.id
}

function shouldMarkLeadAsWon(status: QuoteStatus) {
    return status === 'ACCEPTED'
}

function shouldMarkLeadAsLost(status: QuoteStatus) {
    return status === 'REJECTED'
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

export async function getLeads() {
    try {
        await requireModuleAccess('comercial')
        return await withPrismaRetry(() => prisma.lead.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                client: true,
                contact: true
            }
        }))
    } catch (error) {
        console.error('Error fetching leads:', error)
        return []
    }
}

export async function getContacts() {
    try {
        await requireModuleAccess('comercial')
        return await withPrismaRetry(() => prisma.contact.findMany({
            include: { client: true },
            orderBy: { firstName: 'asc' }
        }))
    } catch (error) {
        console.error('Error fetching contacts:', error)
        return []
    }
}

export async function getClients() {
    try {
        await requireModuleAccess('comercial')
        return await withPrismaRetry(() => prisma.client.findMany({
            orderBy: { name: 'asc' }
        }))
    } catch (error) {
        console.error('Error fetching clients:', error)
        return []
    }
}

export async function createClient(data: {
    name: string
    country?: string
    industry?: string
    taxId?: string
    address?: string
    referredBy?: string
    mainEmail?: string
}) {
    try {
        await requireModuleAccess('comercial')
        const name = normalizeText(data.name)
        if (!name) return { success: false, error: 'El nombre de la empresa es obligatorio' }

        const duplicate = await withPrismaRetry(() => prisma.client.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } },
            select: { id: true }
        }))
        if (duplicate) {
            return { success: false, error: 'Ya existe una empresa con ese nombre' }
        }

        const client = await withPrismaRetry(() => prisma.client.create({
            data: {
                name,
                country: data.country || null,
                industry: data.industry || null,
                taxId: data.taxId || null,
                address: data.address || null,
                referredBy: data.referredBy || null,
                mainEmail: data.mainEmail || null
            }
        }))

        revalidatePath('/comercial')
        return { success: true, client }
    } catch (error) {
        console.error('Error creating client:', error)
        return { success: false, error: 'Error al crear la empresa' }
    }
}

export async function updateClient(id: string, data: {
    name: string
    country?: string
    industry?: string
    taxId?: string
    address?: string
    referredBy?: string
    mainEmail?: string
}) {
    try {
        await requireModuleAccess('comercial')
        const name = normalizeText(data.name)
        if (!name) return { success: false, error: 'El nombre de la empresa es obligatorio' }

        const duplicate = await withPrismaRetry(() => prisma.client.findFirst({
            where: {
                id: { not: id },
                name: { equals: name, mode: 'insensitive' }
            },
            select: { id: true }
        }))
        if (duplicate) {
            return { success: false, error: 'Ya existe otra empresa con ese nombre' }
        }

        const client = await withPrismaRetry(() => prisma.client.update({
            where: { id },
            data: {
                name,
                country: data.country || null,
                industry: data.industry || null,
                taxId: data.taxId || null,
                address: data.address || null,
                referredBy: data.referredBy || null,
                mainEmail: data.mainEmail || null
            }
        }))

        revalidatePath('/comercial')
        return { success: true, client }
    } catch (error) {
        console.error('Error updating client:', error)
        return { success: false, error: 'Error al actualizar la empresa' }
    }
}

export async function createContact(data: {
    firstName: string
    lastName: string
    email: string
    phone?: string
    contactMethod?: string
    country?: string
    specialty?: string
    clientId: string
}) {
    try {
        await requireModuleAccess('comercial')
        const email = data.email.trim().toLowerCase()
        if (!email) return { success: false, error: 'El correo es obligatorio' }
        if (!data.clientId) return { success: false, error: 'Debes seleccionar una empresa' }

        const duplicate = await withPrismaRetry(() => prisma.contact.findFirst({
            where: {
                clientId: data.clientId,
                email: { equals: email, mode: 'insensitive' }
            },
            select: { id: true }
        }))
        if (duplicate) {
            return { success: false, error: 'Ya existe un contacto con ese correo en esta empresa' }
        }

        const contact = await withPrismaRetry(() => prisma.contact.create({
            data: {
                firstName: normalizeText(data.firstName),
                lastName: normalizeText(data.lastName),
                email,
                phone: data.phone || null,
                contactMethod: data.contactMethod || null,
                country: data.country || null,
                specialty: data.specialty || null,
                clientId: data.clientId
            }
        }))

        revalidatePath('/comercial')
        return { success: true, contact }
    } catch (error) {
        console.error('Error creating contact:', error)
        return { success: false, error: 'Error al crear el contacto' }
    }
}

export async function updateContact(id: string, data: {
    firstName: string
    lastName: string
    email: string
    phone?: string
    contactMethod?: string
    country?: string
    specialty?: string
    clientId: string
}) {
    try {
        await requireModuleAccess('comercial')
        const email = data.email.trim().toLowerCase()
        if (!email) return { success: false, error: 'El correo es obligatorio' }
        if (!data.clientId) return { success: false, error: 'Debes seleccionar una empresa' }

        const duplicate = await withPrismaRetry(() => prisma.contact.findFirst({
            where: {
                id: { not: id },
                clientId: data.clientId,
                email: { equals: email, mode: 'insensitive' }
            },
            select: { id: true }
        }))
        if (duplicate) {
            return { success: false, error: 'Ya existe otro contacto con ese correo en esta empresa' }
        }

        const contact = await withPrismaRetry(() => prisma.contact.update({
            where: { id },
            data: {
                firstName: normalizeText(data.firstName),
                lastName: normalizeText(data.lastName),
                email,
                phone: data.phone || null,
                contactMethod: data.contactMethod || null,
                country: data.country || null,
                specialty: data.specialty || null,
                clientId: data.clientId
            }
        }))

        revalidatePath('/comercial')
        return { success: true, contact }
    } catch (error) {
        console.error('Error updating contact:', error)
        return { success: false, error: 'Error al actualizar el contacto' }
    }
}

export async function deleteContact(id: string) {
    try {
        await requireModuleAccess('comercial')
        const related = await withPrismaRetry(() => prisma.contact.findUnique({
            where: { id },
            select: {
                id: true,
                leads: { select: { id: true }, take: 1 },
                projects: { select: { id: true }, take: 1 },
                activities: { select: { id: true }, take: 1 }
            }
        }))

        if (!related) return { success: false, error: 'Contacto no encontrado' }
        if (related.leads.length > 0 || related.projects.length > 0 || related.activities.length > 0) {
            return { success: false, error: 'No se puede eliminar: el contacto tiene relaciones activas (lead/proyecto/actividad)' }
        }

        await withPrismaRetry(() => prisma.contact.delete({
            where: { id }
        }))
        revalidatePath('/comercial')
        return { success: true }
    } catch (error) {
        console.error('Error deleting contact:', error)
        return { success: false, error: 'Error al eliminar el contacto' }
    }
}

export async function deleteClient(id: string) {
    try {
        await requireModuleAccess('comercial')
        const related = await withPrismaRetry(() => prisma.client.findUnique({
            where: { id },
            select: {
                id: true,
                contacts: { select: { id: true }, take: 1 },
                projects: { select: { id: true }, take: 1 },
                leads: { select: { id: true }, take: 1 },
                invoices: { select: { id: true }, take: 1 }
            }
        }))

        if (!related) return { success: false, error: 'Empresa no encontrada' }
        if (related.contacts.length > 0 || related.projects.length > 0 || related.leads.length > 0 || related.invoices.length > 0) {
            return { success: false, error: 'No se puede eliminar: la empresa tiene relaciones activas (contactos/proyectos/leads/facturas)' }
        }

        await withPrismaRetry(() => prisma.client.delete({
            where: { id }
        }))
        revalidatePath('/comercial')
        return { success: true }
    } catch (error) {
        console.error('Error deleting client:', error)
        return { success: false, error: 'Error al eliminar la empresa' }
    }
}

export async function createLead(formData: FormData) {
    const parsed = leadCreateSchema.safeParse({
        companyName: (formData.get('companyName') as string || '').trim() || undefined,
        serviceRequested: (formData.get('serviceRequested') as string || '').trim() || undefined,
        requirementDetail: (formData.get('requirementDetail') as string || '').trim() || undefined,
        estimatedValue: parseFloat(formData.get('estimatedValue') as string || '0'),
        currency: (formData.get('currency') as string || 'USD').trim().toUpperCase(),
        status: (formData.get('status') as LeadStatus) || LeadStatus.NEW,
        clientId: (formData.get('clientId') as string || '').trim() || undefined,
        selectedContactId: (formData.get('contactId') as string || '').trim() || undefined,
        contactName: (formData.get('contactName') as string || '').trim() || undefined,
        contactEmail: (formData.get('contactEmail') as string || '').trim().toLowerCase() || '',
    })

    if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || 'Datos inválidos de lead')
    }

    const {
        companyName,
        serviceRequested,
        requirementDetail,
        estimatedValue,
        currency,
        status,
        clientId,
        selectedContactId,
        contactName,
        contactEmail,
    } = parsed.data

    if (!companyName && !clientId) {
        throw new Error('El nombre de la empresa o cliente es obligatorio')
    }

    try {
        await requireModuleAccess('comercial')
        let finalClientId = clientId

        if (!finalClientId && companyName) {
            finalClientId = await ensureClientByName(companyName)
        }

        let contactId: string | null = null

        if (selectedContactId) {
            const selectedContact = await withPrismaRetry(() => prisma.contact.findUnique({
                where: { id: selectedContactId },
                select: { id: true, clientId: true }
            }))

            if (!selectedContact) {
                throw new Error('El contacto seleccionado no existe')
            }

            if (!finalClientId) {
                finalClientId = selectedContact.clientId
            } else if (selectedContact.clientId !== finalClientId) {
                throw new Error('El contacto seleccionado no pertenece a la empresa elegida')
            }

            contactId = selectedContact.id
        }

        if (!contactId && contactName && finalClientId) {
            const names = contactName.split(' ').filter(Boolean)
            const firstName = names[0] || contactName
            const lastName = names.slice(1).join(' ') || '-'

            if (contactEmail) {
                const existingContact = await withPrismaRetry(() => prisma.contact.findFirst({
                    where: {
                        clientId: finalClientId,
                        email: { equals: contactEmail, mode: 'insensitive' }
                    },
                    select: { id: true }
                }))
                if (existingContact) {
                    contactId = existingContact.id
                }
            }

            if (!contactId) {
                const existingByName = await withPrismaRetry(() => prisma.contact.findFirst({
                    where: {
                        clientId: finalClientId,
                        firstName: { equals: normalizeText(firstName), mode: 'insensitive' },
                        lastName: { equals: normalizeText(lastName), mode: 'insensitive' }
                    },
                    select: { id: true }
                }))
                if (existingByName) {
                    contactId = existingByName.id
                }
            }

            if (!contactId) {
                const fallbackEmail = contactEmail || `${normalizeText(firstName).toLowerCase().replace(/\s+/g, '')}.${Date.now()}@example.com`
                const contact = await withPrismaRetry(() => prisma.contact.create({
                    data: {
                        firstName: normalizeText(firstName),
                        lastName: normalizeText(lastName),
                        email: fallbackEmail,
                        clientId: finalClientId
                    }
                }))
                contactId = contact.id
            }
        }

        const lead = await withPrismaRetry(() => prisma.lead.create({
            data: {
                companyName: companyName || null,
                serviceRequested,
                requirementDetail,
                estimatedValue,
                currency,
                status,
                clientId: finalClientId || null,
                contactId
            }
        }))

        await createNotificationForRoles({
            roles: [Role.ADMIN, Role.GERENCIA, Role.COMERCIAL],
            type: 'new_lead',
            message: `Nuevo lead registrado: ${lead.companyName || 'Sin empresa'}`
        })

        revalidatePath('/comercial')
        return { success: true }
    } catch (error) {
        console.error('Error creating lead:', error)
        throw new Error('Error al crear el lead')
    }
}

export async function convertLeadToProject(leadId: string, directorId: string) {
    try {
        await requireModuleAccess('comercial')
        const lead = await withPrismaRetry(() => prisma.lead.findUnique({
            where: { id: leadId },
            include: { client: true }
        }))

        if (!lead) throw new Error('Lead no encontrado')

        let clientId = lead.clientId
        if (!clientId && lead.companyName) {
            clientId = await ensureClientByName(lead.companyName)
        }
        if (!clientId) throw new Error('No se pudo determinar el cliente')
        const inboxEmail = await generateProjectInboxEmail(
            lead.serviceRequested || `Proyecto ${lead.companyName || 'cliente'}`
        )

        const project = await withPrismaRetry(() => prisma.project.create({
            data: {
                name: lead.serviceRequested || `Proyecto ${lead.companyName}`,
                inboxEmail,
                clientId,
                directorId,
                budget: lead.estimatedValue,
                serviceType: lead.serviceRequested || 'Servicio General',
                status: 'PLANNING'
            }
        }))

        const serviceType = lead.serviceRequested || 'Servicio General'
        await upsertServiceCatalogFromName(serviceType)

        await withPrismaRetry(() => prisma.lead.update({
            where: { id: leadId },
            data: {
                status: LeadStatus.WON,
                clientId
            }
        }))

        await createNotificationForRoles({
            roles: [Role.ADMIN, Role.GERENCIA, Role.PROYECTOS],
            type: 'project_update',
            message: `Lead convertido en proyecto: ${project.name}`
        })

        revalidatePath('/comercial')
        revalidatePath('/proyectos')
        return { success: true }
    } catch (error) {
        console.error('Error converting lead:', error)
        return { success: false, error: 'Error al convertir lead a proyecto' }
    }
}

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
    try {
        await requireModuleAccess('comercial')
        await withPrismaRetry(() => prisma.lead.update({
            where: { id: leadId },
            data: { status }
        }))
        revalidatePath('/comercial')
        return { success: true }
    } catch (error) {
        console.error('Error updating lead status:', error)
        return { success: false, error: 'Error al actualizar el estado' }
    }
}

export async function updateLead(leadId: string, formData: FormData) {
    const companyName = (formData.get('companyName') as string || '').trim()
    const serviceRequested = formData.get('serviceRequested') as string
    const requirementDetail = formData.get('requirementDetail') as string
    const estimatedValue = parseFloat(formData.get('estimatedValue') as string || '0')
    const currency = ((formData.get('currency') as string) || 'USD').trim().toUpperCase()
    const status = formData.get('status') as LeadStatus
    const clientId = (formData.get('clientId') as string || '').trim()
    const selectedContactId = (formData.get('contactId') as string || '').trim()

    try {
        await requireModuleAccess('comercial')
        let finalClientId = clientId
        let contactId: string | null = null

        if (!finalClientId && companyName) {
            finalClientId = await ensureClientByName(companyName)
        }

        if (selectedContactId) {
            const selectedContact = await withPrismaRetry(() => prisma.contact.findUnique({
                where: { id: selectedContactId },
                select: { id: true, clientId: true }
            }))

            if (!selectedContact) {
                throw new Error('El contacto seleccionado no existe')
            }

            if (!finalClientId) {
                finalClientId = selectedContact.clientId
            } else if (selectedContact.clientId !== finalClientId) {
                throw new Error('El contacto seleccionado no pertenece a la empresa elegida')
            }

            contactId = selectedContact.id
        }

        await withPrismaRetry(() => prisma.lead.update({
            where: { id: leadId },
            data: {
                companyName: companyName || null,
                serviceRequested,
                requirementDetail,
                estimatedValue,
                currency: currency === 'PEN' ? 'PEN' : 'USD',
                status,
                clientId: finalClientId || null,
                contactId
            }
        }))

        revalidatePath('/comercial')
        return { success: true }
    } catch (error) {
        console.error('Error updating lead:', error)
        throw new Error('Error al actualizar el lead')
    }
}

const ALLOWED_ACTIVITY_TYPES = new Set(['CALL', 'EMAIL', 'MEETING', 'CHAT', 'NOTE'])

function normalizeActivityType(type: string) {
    const normalized = type.trim().toUpperCase()
    return ALLOWED_ACTIVITY_TYPES.has(normalized) ? normalized : 'NOTE'
}

export async function createLeadActivity(data: {
    leadId: string
    type: string
    description: string
    contactId?: string
    date?: Date
}) {
    try {
        await requireModuleAccess('comercial')
        const description = normalizeText(data.description || '')
        if (!description) return { success: false, error: 'La descripción es obligatoria' }

        const lead = await withPrismaRetry(() => prisma.lead.findUnique({
            where: { id: data.leadId },
            select: { id: true, contactId: true, companyName: true }
        }))
        if (!lead) return { success: false, error: 'Lead no encontrado' }

        let contactId = data.contactId || lead.contactId || null
        if (contactId) {
            const contactIdValue = contactId
            const contact = await withPrismaRetry(() => prisma.contact.findUnique({
                where: { id: contactIdValue },
                select: { id: true }
            }))
            if (!contact) contactId = null
        }

        const activity = await withPrismaRetry(() => prisma.activity.create({
            data: {
                leadId: data.leadId,
                contactId,
                type: normalizeActivityType(data.type),
                description,
                date: data.date || new Date()
            },
            select: {
                id: true,
                type: true,
                description: true,
                date: true,
                contact: { select: { id: true, firstName: true, lastName: true } }
            }
        }))

        await createNotificationForRoles({
            roles: [Role.ADMIN, Role.GERENCIA, Role.COMERCIAL],
            type: 'lead_activity',
            message: `Nueva actividad en lead ${lead.companyName || data.leadId.slice(0, 8)}`
        })

        revalidatePath('/comercial')
        return { success: true, activity }
    } catch (error) {
        console.error('Error creating lead activity:', error)
        return { success: false, error: 'Error al registrar la actividad' }
    }
}

export async function createQuote(data: {
    leadId: string
    proposalDetail?: string
    servicesOffered?: string
    budget: number
    paymentMethod?: string
    paymentCountry?: string
    sentDate?: Date
    status?: QuoteStatus
    installmentsCount?: number
}) {
    try {
        await requireModuleAccess('comercial')
        const lead = await withPrismaRetry(() => prisma.lead.findUnique({
            where: { id: data.leadId },
            select: { id: true, companyName: true }
        }))
        if (!lead) return { success: false, error: 'Lead no encontrado' }

        const status = data.status || 'PENDING'
        const quote = await withPrismaRetry(() => prisma.quote.create({
            data: {
                leadId: data.leadId,
                proposalDetail: data.proposalDetail || null,
                servicesOffered: data.servicesOffered || null,
                budget: data.budget,
                paymentMethod: data.paymentMethod || null,
                paymentCountry: data.paymentCountry || null,
                sentDate: data.sentDate || (status === 'SENT' ? new Date() : null),
                acceptedDate: status === 'ACCEPTED' ? new Date() : null,
                rejectedDate: status === 'REJECTED' ? new Date() : null,
                status,
                installmentsCount: data.installmentsCount || 1
            }
        }))

        await withPrismaRetry(() => prisma.lead.update({
            where: { id: data.leadId },
            data: {
                status: shouldMarkLeadAsWon(status) ? LeadStatus.WON : shouldMarkLeadAsLost(status) ? LeadStatus.LOST : LeadStatus.PROPOSAL
            }
        }))

        await createNotificationForRoles({
            roles: [Role.ADMIN, Role.GERENCIA, Role.COMERCIAL],
            type: 'quote_update',
            message: `Nueva cotización creada para ${lead.companyName || 'lead sin empresa'}`
        })

        revalidatePath('/comercial')
        return { success: true, quote }
    } catch (error) {
        console.error('Error creating quote:', error)
        return { success: false, error: 'Error al crear la cotización' }
    }
}

export async function updateQuoteStatus(quoteId: string, status: QuoteStatus) {
    try {
        await requireModuleAccess('comercial')
        const quote = await withPrismaRetry(() => prisma.quote.update({
            where: { id: quoteId },
            data: {
                status,
                sentDate: status === 'SENT' ? new Date() : undefined,
                acceptedDate: status === 'ACCEPTED' ? new Date() : null,
                rejectedDate: status === 'REJECTED' ? new Date() : null
            },
            select: { leadId: true }
        }))

        await withPrismaRetry(() => prisma.lead.update({
            where: { id: quote.leadId },
            data: {
                status: shouldMarkLeadAsWon(status) ? LeadStatus.WON : shouldMarkLeadAsLost(status) ? LeadStatus.LOST : LeadStatus.PROPOSAL
            }
        }))

        revalidatePath('/comercial')
        return { success: true }
    } catch (error) {
        console.error('Error updating quote status:', error)
        return { success: false, error: 'Error al actualizar la cotización' }
    }
}

export async function updateQuote(quoteId: string, data: {
    proposalDetail?: string
    servicesOffered?: string
    budget: number
    paymentMethod?: string
    paymentCountry?: string
    sentDate?: Date
    status?: QuoteStatus
    installmentsCount?: number
}) {
    try {
        await requireModuleAccess('comercial')

        const existing = await withPrismaRetry(() => prisma.quote.findUnique({
            where: { id: quoteId },
            select: {
                id: true,
                leadId: true,
                status: true
            }
        }))
        if (!existing) return { success: false, error: 'Cotización no encontrada' }

        const status = data.status || existing.status as QuoteStatus
        const sentDate = status === 'SENT'
            ? (data.sentDate || new Date())
            : data.sentDate || null
        const acceptedDate = status === 'ACCEPTED' ? new Date() : null
        const rejectedDate = status === 'REJECTED' ? new Date() : null

        const quote = await withPrismaRetry(() => prisma.quote.update({
            where: { id: quoteId },
            data: {
                proposalDetail: data.proposalDetail || null,
                servicesOffered: data.servicesOffered || null,
                budget: data.budget,
                paymentMethod: data.paymentMethod || null,
                paymentCountry: data.paymentCountry || null,
                sentDate,
                acceptedDate,
                rejectedDate,
                status,
                installmentsCount: data.installmentsCount || 1
            }
        }))

        await withPrismaRetry(() => prisma.lead.update({
            where: { id: existing.leadId },
            data: {
                status: shouldMarkLeadAsWon(status) ? LeadStatus.WON : shouldMarkLeadAsLost(status) ? LeadStatus.LOST : LeadStatus.PROPOSAL
            }
        }))

        await createNotificationForRoles({
            roles: [Role.ADMIN, Role.GERENCIA, Role.COMERCIAL],
            type: 'quote_update',
            message: `Cotización actualizada (${quote.id.slice(0, 8)})`
        })

        revalidatePath('/comercial')
        return { success: true, quote }
    } catch (error) {
        console.error('Error updating quote:', error)
        return { success: false, error: 'Error al actualizar la cotización' }
    }
}

export async function createInvoice(data: {
    invoiceNumber?: string
    fileUrl?: string
    quoteId?: string
    clientId?: string
    projectId?: string
    issueDate?: Date
    dueDate?: Date
    amount: number
    status?: InvoiceStatus
    paymentMethod?: string
    paymentBank?: string
    paymentCountry?: string
}) {
    try {
        await requireModuleAccess('comercial')
        if (!data.projectId) {
            return { success: false, error: 'Debes seleccionar un proyecto para registrar la factura' }
        }

        const project = await withPrismaRetry(() => prisma.project.findUnique({
            where: { id: data.projectId },
            select: {
                id: true,
                clientId: true,
                quoteId: true
            }
        }))
        if (!project) return { success: false, error: 'Proyecto no encontrado' }

        let clientId = project.clientId || data.clientId || null

        const quoteId = data.quoteId || project.quoteId || null
        if (!clientId && quoteId) {
            const quote = await withPrismaRetry(() => prisma.quote.findUnique({
                where: { id: quoteId },
                select: { lead: { select: { clientId: true } } }
            }))
            clientId = quote?.lead.clientId || null
        }
        if (!clientId) {
            return { success: false, error: 'No se pudo determinar el cliente desde el proyecto/cotización' }
        }

        const invoiceNumber = data.invoiceNumber?.trim() || await generateInvoiceNumber()
        const duplicate = await withPrismaRetry(() => prisma.invoice.findUnique({
            where: { invoiceNumber },
            select: { id: true }
        }))
        if (duplicate) return { success: false, error: 'El número de factura ya existe' }

        const invoice = await withPrismaRetry(() => prisma.invoice.create({
            data: {
                invoiceNumber,
                fileUrl: data.fileUrl || null,
                quoteId,
                clientId,
                projectId: project.id,
                issueDate: data.issueDate || new Date(),
                dueDate: data.dueDate || null,
                amount: data.amount,
                status: data.status || InvoiceStatus.DRAFT,
                paymentMethod: data.paymentMethod || null,
                paymentBank: data.paymentBank || null,
                paymentCountry: data.paymentCountry || null
            }
        }))

        await createNotificationForRoles({
            roles: [Role.ADMIN, Role.GERENCIA, Role.COMERCIAL, Role.CONTABILIDAD],
            type: 'invoice_update',
            message: `Factura creada: ${invoice.invoiceNumber}`
        })

        revalidatePath('/comercial')
        revalidatePath('/contabilidad')
        return { success: true, invoice }
    } catch (error) {
        console.error('Error creating invoice:', error)
        return { success: false, error: 'Error al crear la factura' }
    }
}

export async function syncInvoicesFromMilestones() {
    try {
        await requireModuleAccess('comercial')

        const projects = await withPrismaRetry(() => prisma.project.findMany({
            select: {
                id: true,
                name: true,
                clientId: true,
                budget: true,
                startDate: true,
                status: true,
                quote: {
                    select: {
                        installmentsCount: true,
                        status: true
                    }
                },
                milestones: { select: { id: true, status: true } },
                invoices: { select: { id: true, status: true } }
            },
            take: 300
        }))

        let createdCount = 0
        const details: Array<{ projectId: string; projectName: string; created: number; amountPerInvoice: number; targetInvoices: number }> = []

        for (const project of projects) {
            const totalMilestones = Math.max(project.milestones.length, 1)
            const completedMilestones = project.milestones.filter((m) => m.status === 'COMPLETED').length
            const issuedInvoices = project.invoices.filter((invoice) => invoice.status !== InvoiceStatus.CANCELLED).length
            const quoteInstallments = Math.max(project.quote?.installmentsCount || 0, 0)
            const statusAllowsInstallments = project.status === 'ACTIVE' || project.status === 'REVIEW' || project.status === 'COMPLETED'
            const startDate = project.startDate || new Date()
            const monthsElapsed = Math.max(
                0,
                (new Date().getFullYear() - startDate.getFullYear()) * 12 + (new Date().getMonth() - startDate.getMonth())
            )
            const accruedInstallments = statusAllowsInstallments
                ? Math.min(quoteInstallments, monthsElapsed + 1)
                : 0
            const targetInvoices = Math.max(completedMilestones, accruedInstallments)
            const missing = Math.max(targetInvoices - issuedInvoices, 0)
            if (missing === 0) continue

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

            createdCount += missing
            details.push({
                projectId: project.id,
                projectName: project.name,
                created: missing,
                amountPerInvoice: installmentAmount,
                targetInvoices
            })
        }

        if (createdCount > 0) {
            await createNotificationForRoles({
                roles: [Role.ADMIN, Role.GERENCIA, Role.CONTABILIDAD, Role.FINANZAS, Role.COMERCIAL],
                type: 'invoice_update',
                message: `Sincronización automática por hitos: ${createdCount} factura(s) emitida(s).`
            })
        }

        if (createdCount > 0) {
            revalidatePath('/comercial')
            revalidatePath('/contabilidad')
            revalidatePath('/dashboard')
            revalidatePath('/proyectos')
        }
        return { success: true, createdCount, details }
    } catch (error) {
        console.error('Error syncing milestone invoices:', error)
        return { success: false, error: 'Error al sincronizar facturas por hitos' }
    }
}

export async function updateInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
    try {
        await requireModuleAccess('comercial')
        await withPrismaRetry(() => prisma.invoice.update({
            where: { id: invoiceId },
            data: { status }
        }))
        revalidatePath('/comercial')
        revalidatePath('/contabilidad')
        return { success: true }
    } catch (error) {
        console.error('Error updating invoice status:', error)
        return { success: false, error: 'Error al actualizar la factura' }
    }
}

export async function updateInvoice(invoiceId: string, data: {
    invoiceNumber?: string
    fileUrl?: string
    quoteId?: string
    clientId?: string
    projectId?: string
    issueDate?: Date
    dueDate?: Date
    amount: number
    status?: InvoiceStatus
    paymentMethod?: string
    paymentBank?: string
    paymentCountry?: string
}) {
    try {
        await requireModuleAccess('comercial')
        const existing = await withPrismaRetry(() => prisma.invoice.findUnique({
            where: { id: invoiceId },
            select: { id: true, invoiceNumber: true }
        }))
        if (!existing) return { success: false, error: 'Factura no encontrada' }

        if (!data.projectId) return { success: false, error: 'Debes seleccionar proyecto' }
        const project = await withPrismaRetry(() => prisma.project.findUnique({
            where: { id: data.projectId },
            select: { id: true, clientId: true, quoteId: true }
        }))
        if (!project) return { success: false, error: 'Proyecto no encontrado' }

        const quoteId = data.quoteId || project.quoteId || null
        let clientId = project.clientId || data.clientId || null
        if (!clientId && quoteId) {
            const quote = await withPrismaRetry(() => prisma.quote.findUnique({
                where: { id: quoteId },
                select: { lead: { select: { clientId: true } } }
            }))
            clientId = quote?.lead.clientId || null
        }
        if (!clientId) return { success: false, error: 'No se pudo determinar el cliente desde el proyecto/cotización' }

        const invoiceNumber = data.invoiceNumber?.trim() || existing.invoiceNumber
        const duplicate = await withPrismaRetry(() => prisma.invoice.findFirst({
            where: {
                id: { not: invoiceId },
                invoiceNumber
            },
            select: { id: true }
        }))
        if (duplicate) return { success: false, error: 'El número de factura ya existe' }

        const invoice = await withPrismaRetry(() => prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                invoiceNumber,
                fileUrl: data.fileUrl || null,
                quoteId,
                clientId,
                projectId: project.id,
                issueDate: data.issueDate || new Date(),
                dueDate: data.dueDate || null,
                amount: data.amount,
                status: data.status || InvoiceStatus.DRAFT,
                paymentMethod: data.paymentMethod || null,
                paymentBank: data.paymentBank || null,
                paymentCountry: data.paymentCountry || null
            }
        }))

        await createNotificationForRoles({
            roles: [Role.ADMIN, Role.GERENCIA, Role.COMERCIAL, Role.CONTABILIDAD],
            type: 'invoice_update',
            message: `Factura actualizada: ${invoice.invoiceNumber}`
        })

        revalidatePath('/comercial')
        revalidatePath('/contabilidad')
        return { success: true, invoice }
    } catch (error) {
        console.error('Error updating invoice:', error)
        return { success: false, error: 'Error al actualizar la factura' }
    }
}
