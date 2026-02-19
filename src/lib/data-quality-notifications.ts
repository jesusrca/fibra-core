import prisma from '@/lib/prisma'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { createNotificationForUserOnce } from '@/lib/notifications'

function shortName(firstName: string, lastName: string) {
    return `${firstName || ''} ${lastName || ''}`.trim() || 'Sin nombre'
}

function joinExamples(values: string[], max = 3) {
    const unique = Array.from(new Set(values.filter(Boolean)))
    return unique.slice(0, max).join(', ')
}

export async function ensureComercialDataQualityNotifications(userId: string) {
    const incompleteContacts = await withPrismaRetry(() =>
        prisma.contact.findMany({
            where: {
                OR: [
                    { phone: null },
                    { phone: '' },
                    { contactMethod: null },
                    { contactMethod: '' },
                    { country: null },
                    { country: '' }
                ]
            },
            select: {
                firstName: true,
                lastName: true
            },
            take: 25
        })
    )

    if (incompleteContacts.length > 0) {
        const names = incompleteContacts.map((c) => shortName(c.firstName, c.lastName))
        const examples = joinExamples(names)
        await createNotificationForUserOnce({
            userId,
            type: 'contact_data_missing',
            message: `CRM: ${incompleteContacts.length} contacto(s) con datos faltantes${examples ? ` (ej.: ${examples})` : ''}.`,
            dedupeHours: 8
        })
    }
}

export async function ensureProjectDataQualityNotifications(userId: string) {
    const incompleteProjects = await withPrismaRetry(() =>
        prisma.project.findMany({
            where: {
                OR: [
                    { endDate: null },
                    { serviceType: null },
                    { serviceType: '' },
                    { budget: { lte: 0 } }
                ]
            },
            select: {
                name: true
            },
            take: 25
        })
    )

    if (incompleteProjects.length > 0) {
        const examples = joinExamples(incompleteProjects.map((p) => p.name))
        await createNotificationForUserOnce({
            userId,
            type: 'project_data_missing',
            message: `Proyectos: ${incompleteProjects.length} proyecto(s) con datos faltantes${examples ? ` (ej.: ${examples})` : ''}.`,
            dedupeHours: 8
        })
    }
}
