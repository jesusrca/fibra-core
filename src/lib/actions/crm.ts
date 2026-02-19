'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { LeadStatus, Role } from '@prisma/client'
import { requireModuleAccess } from '@/lib/server-auth'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { createNotificationForRoles } from '@/lib/notifications'

export async function getLeads() {
    try {
        await requireModuleAccess('comercial')
        const leads = await withPrismaRetry(() => prisma.lead.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                client: true,
                contact: true,
            },
        }))
        return leads
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

export async function createLead(formData: FormData) {
    const companyName = formData.get('companyName') as string
    const serviceRequested = formData.get('serviceRequested') as string
    const requirementDetail = formData.get('requirementDetail') as string
    const estimatedValue = parseFloat(formData.get('estimatedValue') as string || '0')
    const status = (formData.get('status') as LeadStatus) || LeadStatus.NEW
    const clientId = formData.get('clientId') as string
    const contactName = formData.get('contactName') as string
    const contactEmail = formData.get('contactEmail') as string

    if (!companyName && !clientId) {
        throw new Error('El nombre de la empresa o cliente es obligatorio')
    }

    try {
        await requireModuleAccess('comercial')
        let finalClientId = clientId

        // 1. Handle Client logic
        if (!finalClientId) {
            // Find existing by name to avoid duplicates
            const existingClient = await withPrismaRetry(() => prisma.client.findFirst({
                where: { name: { equals: companyName, mode: 'insensitive' } }
            }))

            if (existingClient) {
                finalClientId = existingClient.id
            } else {
                // We create the client only if we want all leads to be linked to a Client record immediately
                // For now, let's keep it optional but linked if found.
                // The user wants "related to a list of companies", so let's create it.
                const newClient = await withPrismaRetry(() => prisma.client.create({
                    data: { name: companyName }
                }))
                finalClientId = newClient.id
            }
        }

        // 2. Handle Contact logic
        let contactId = null
        if (contactName && finalClientId) {
            const names = contactName.split(' ')
            const firstName = names[0]
            const lastName = names.slice(1).join(' ') || '-'

            const contact = await withPrismaRetry(() => prisma.contact.create({
                data: {
                    firstName,
                    lastName,
                    email: contactEmail || `${firstName.toLowerCase()}@${companyName.toLowerCase().replace(/\s/g, '')}.com`,
                    clientId: finalClientId
                }
            }))
            contactId = contact.id
        }

        // 3. Create Lead
        const lead = await withPrismaRetry(() => prisma.lead.create({
            data: {
                companyName: companyName,
                serviceRequested,
                requirementDetail,
                estimatedValue,
                status,
                clientId: finalClientId,
                contactId: contactId
            },
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

        // 1. Ensure Client exists
        let clientId = lead.clientId
        if (!clientId && lead.companyName) {
            const client = await withPrismaRetry(() => prisma.client.create({
                data: {
                    name: lead.companyName || 'Cliente sin nombre',
                }
            }))
            clientId = client.id
        }

        if (!clientId) throw new Error('No se pudo determinar el cliente')

        // 2. Create Project
        const project = await withPrismaRetry(() => prisma.project.create({
            data: {
                name: lead.serviceRequested || `Proyecto ${lead.companyName}`,
                clientId: clientId,
                directorId: directorId,
                budget: lead.estimatedValue,
                serviceType: lead.serviceRequested || 'Servicio General',
                status: 'PLANNING',
            }
        }))

        // 3. Mark Lead as WON
        await withPrismaRetry(() => prisma.lead.update({
            where: { id: leadId },
            data: {
                status: LeadStatus.WON,
                clientId: clientId
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
    const companyName = formData.get('companyName') as string
    const serviceRequested = formData.get('serviceRequested') as string
    const requirementDetail = formData.get('requirementDetail') as string
    const estimatedValue = parseFloat(formData.get('estimatedValue') as string || '0')
    const status = formData.get('status') as LeadStatus
    const clientId = formData.get('clientId') as string

    try {
        await requireModuleAccess('comercial')
        await withPrismaRetry(() => prisma.lead.update({
            where: { id: leadId },
            data: {
                companyName,
                serviceRequested,
                requirementDetail,
                estimatedValue,
                status,
                clientId: clientId || null,
            }
        }))

        revalidatePath('/comercial')
        return { success: true }
    } catch (error) {
        console.error('Error updating lead:', error)
        throw new Error('Error al actualizar el lead')
    }
}
