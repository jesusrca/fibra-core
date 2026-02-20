import { requireAuthUser } from '@/lib/server-auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type NotificationModule =
    | 'dashboard'
    | 'comercial'
    | 'proyectos'
    | 'tareas'
    | 'equipo'
    | 'proveedores'
    | 'contabilidad'
    | 'facturas'
    | 'finanzas'
    | 'marketing'
    | 'reportes'
    | 'chatbot'
    | 'configuracion'

function mapTypeToModules(type: string): NotificationModule[] {
    switch (type) {
        case 'new_lead':
        case 'quote_update':
        case 'contact_data_missing':
            return ['comercial', 'dashboard']
        case 'project_update':
        case 'project_data_missing':
            return ['proyectos', 'dashboard']
        case 'task_due':
            return ['tareas', 'proyectos', 'equipo', 'dashboard']
        case 'invoice_update':
        case 'invoice_overdue':
            return ['contabilidad', 'facturas', 'finanzas', 'dashboard']
        case 'finance_update':
            return ['finanzas', 'contabilidad', 'dashboard']
        case 'milestone_billing_due':
            return ['proyectos', 'contabilidad', 'finanzas', 'dashboard']
        case 'report_ready':
            return ['reportes', 'dashboard']
        default:
            return ['dashboard']
    }
}

export async function GET() {
    try {
        const user = await requireAuthUser()
        const unreadNotifications = await prisma.notification.findMany({
            where: {
                userId: user.id,
                read: false
            },
            select: { type: true }
        })

        const byModule: Record<NotificationModule, number> = {
            dashboard: 0,
            comercial: 0,
            proyectos: 0,
            tareas: 0,
            equipo: 0,
            proveedores: 0,
            contabilidad: 0,
            facturas: 0,
            finanzas: 0,
            marketing: 0,
            reportes: 0,
            chatbot: 0,
            configuracion: 0,
        }

        unreadNotifications.forEach((n) => {
            mapTypeToModules(n.type).forEach((moduleKey) => {
                byModule[moduleKey] += 1
            })
        })

        return Response.json({
            totalUnread: unreadNotifications.length,
            byModule
        })
    } catch (error) {
        console.error('Notifications summary API error:', error)
        return Response.json({
            totalUnread: 0,
            byModule: {
                dashboard: 0,
                comercial: 0,
                proyectos: 0,
                tareas: 0,
                equipo: 0,
                proveedores: 0,
                contabilidad: 0,
                facturas: 0,
                finanzas: 0,
                marketing: 0,
                reportes: 0,
                chatbot: 0,
                configuracion: 0,
            }
        })
    }
}
