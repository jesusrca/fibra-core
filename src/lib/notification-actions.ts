export type NotificationAction = {
    label: string
    href: string
    description?: string
}

function sanitizePath(path: string) {
    if (!path.startsWith('/')) return null
    if (path.startsWith('//')) return null
    return path
}

function extractPathsFromMessage(message: string) {
    const matches = message.match(/\/[a-zA-Z0-9/_-]+/g) || []
    const unique = Array.from(new Set(matches))
    return unique
        .map((rawPath) => sanitizePath(rawPath))
        .filter((path): path is string => Boolean(path))
}

export function getNotificationActions(type: string, message: string): NotificationAction[] {
    const fromMessage = extractPathsFromMessage(message).map((href) => ({
        label: 'Abrir recurso relacionado',
        href,
        description: 'Enlace detectado dentro de la notificación'
    }))

    const byType: Record<string, NotificationAction[]> = {
        new_lead: [
            { label: 'Ver pipeline comercial', href: '/comercial?tab=pipeline' },
            { label: 'Ver contactos', href: '/comercial?tab=contacts' }
        ],
        quote_update: [
            { label: 'Ver cotizaciones', href: '/comercial?tab=quotes' }
        ],
        contact_data_missing: [
            { label: 'Completar contactos', href: '/comercial?tab=contacts' }
        ],
        project_update: [
            { label: 'Ver proyectos', href: '/proyectos' }
        ],
        project_data_missing: [
            { label: 'Completar proyectos', href: '/proyectos' }
        ],
        task_due: [
            { label: 'Ver tareas', href: '/tareas' },
            { label: 'Ver proyectos', href: '/proyectos' }
        ],
        invoice_update: [
            { label: 'Ver facturas', href: '/facturas' },
            { label: 'Ver contabilidad', href: '/contabilidad' }
        ],
        invoice_overdue: [
            { label: 'Ver facturas vencidas', href: '/facturas' },
            { label: 'Ver finanzas', href: '/finanzas' }
        ],
        milestone_billing_due: [
            { label: 'Ver facturas por emitir', href: '/facturas' },
            { label: 'Ver proyectos', href: '/proyectos' }
        ],
        report_ready: [
            { label: 'Ver reportes', href: '/reportes' }
        ]
    }

    const defaults: NotificationAction[] = [
        { label: 'Ir al dashboard', href: '/dashboard' }
    ]

    const merged = [...fromMessage, ...(byType[type] || []), ...defaults]
    const dedupedMap = new Map<string, NotificationAction>()

    merged.forEach((action) => {
        if (!dedupedMap.has(action.href)) {
            dedupedMap.set(action.href, action)
        }
    })

    return Array.from(dedupedMap.values())
}

