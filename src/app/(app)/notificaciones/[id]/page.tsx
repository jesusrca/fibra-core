import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import prisma from '@/lib/prisma'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { getNotificationActions } from '@/lib/notification-actions'
import { requireAuthUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

const typeLabels: Record<string, string> = {
    task_due: 'Tarea',
    new_lead: 'Comercial',
    report_ready: 'Reporte',
    project_update: 'Proyecto',
    project_data_missing: 'Proyecto',
    quote_update: 'Cotización',
    invoice_update: 'Factura',
    invoice_overdue: 'Factura vencida',
    milestone_billing_due: 'Facturación por hito',
    contact_data_missing: 'CRM'
}

function formatNotificationDate(value: Date) {
    const date = new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(value)
    const time = new Intl.DateTimeFormat('es-PE', {
        hour: '2-digit',
        minute: '2-digit'
    }).format(value)
    return `${date} ${time}`
}

export default async function NotificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const user = await requireAuthUser()
    const { id } = await params

    const notification = await withPrismaRetry(() =>
        prisma.notification.findFirst({
            where: { id, userId: user.id },
            select: {
                id: true,
                type: true,
                message: true,
                read: true,
                createdAt: true
            }
        })
    )

    if (!notification) notFound()

    if (!notification.read) {
        await withPrismaRetry(() =>
            prisma.notification.updateMany({
                where: { id: notification.id, userId: user.id, read: false },
                data: { read: true }
            })
        )
    }

    const actions = getNotificationActions(notification.type, notification.message)
    const label = typeLabels[notification.type] || 'General'

    return (
        <div className="max-w-3xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Detalle de notificación</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Revisa el contexto y ejecuta acciones relacionadas.
                    </p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/dashboard">Volver</Link>
                </Button>
            </div>

            <Card>
                <CardHeader className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">{label}</Badge>
                        <Badge variant="outline">{notification.read ? 'Leída' : 'No leída'}</Badge>
                    </div>
                    <CardTitle className="text-lg">Notificación #{notification.id.slice(0, 8)}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                        {formatNotificationDate(notification.createdAt)}
                    </p>
                </CardHeader>
                <CardContent>
                    <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground">
                        {notification.message}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Acciones sugeridas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {actions.map((action) => (
                        <div key={action.href} className="rounded-lg border border-border p-3">
                            <Link href={action.href} className="text-sm font-medium text-primary hover:underline">
                                {action.label}
                            </Link>
                            {action.description ? (
                                <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                            ) : null}
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}
