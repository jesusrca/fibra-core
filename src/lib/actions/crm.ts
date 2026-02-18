'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { LeadStatus } from '@prisma/client'

export async function getLeads() {
    try {
        const leads = await prisma.lead.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                client: true,
                contact: true,
            },
        })
        return leads
    } catch (error) {
        console.error('Error fetching leads:', error)
        return []
    }
}

export async function createLead(formData: FormData) {
    const companyName = formData.get('companyName') as string
    const serviceRequested = formData.get('serviceRequested') as string
    const requirementDetail = formData.get('requirementDetail') as string
    const estimatedValue = parseFloat(formData.get('estimatedValue') as string || '0')
    const status = (formData.get('status') as LeadStatus) || LeadStatus.NEW

    if (!companyName) {
        throw new Error('El nombre de la empresa es obligatorio')
    }

    try {
        await prisma.lead.create({
            data: {
                companyName,
                serviceRequested,
                requirementDetail,
                estimatedValue,
                status,
            },
        })

        revalidatePath('/comercial')
        return { success: true }
    } catch (error) {
        console.error('Error creating lead:', error)
        throw new Error('Error al crear el lead')
    }
}

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
    try {
        await prisma.lead.update({
            where: { id: leadId },
            data: { status },
        })

        revalidatePath('/comercial')
        return { success: true }
    } catch (error) {
        console.error('Error updating lead status:', error)
        throw new Error('Error al actualizar el estado')
    }
}
