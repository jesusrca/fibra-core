import { Role } from './mock-data'

export interface Permission {
    canView: boolean
    canCreate: boolean
    canEdit: boolean
    canDelete: boolean
}

export type Module = 'dashboard' | 'contabilidad' | 'finanzas' | 'proyectos' | 'marketing' | 'comercial' | 'reportes' | 'chatbot' | 'configuracion'

const permissions: Record<Role, Record<Module, Permission>> = {
    GERENCIA: {
        dashboard: { canView: true, canCreate: true, canEdit: true, canDelete: true },
        contabilidad: { canView: true, canCreate: true, canEdit: true, canDelete: true },
        finanzas: { canView: true, canCreate: true, canEdit: true, canDelete: true },
        proyectos: { canView: true, canCreate: true, canEdit: true, canDelete: true },
        marketing: { canView: true, canCreate: true, canEdit: true, canDelete: true },
        comercial: { canView: true, canCreate: true, canEdit: true, canDelete: true },
        reportes: { canView: true, canCreate: true, canEdit: true, canDelete: true },
        chatbot: { canView: true, canCreate: true, canEdit: true, canDelete: true },
        configuracion: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    },
    CONTABILIDAD: {
        dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false },
        contabilidad: { canView: true, canCreate: true, canEdit: true, canDelete: false },
        finanzas: { canView: true, canCreate: false, canEdit: false, canDelete: false },
        proyectos: { canView: false, canCreate: false, canEdit: false, canDelete: false },
        marketing: { canView: false, canCreate: false, canEdit: false, canDelete: false },
        comercial: { canView: false, canCreate: false, canEdit: false, canDelete: false },
        reportes: { canView: true, canCreate: true, canEdit: false, canDelete: false },
        chatbot: { canView: true, canCreate: true, canEdit: false, canDelete: false },
        configuracion: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    },
    FINANZAS: {
        dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false },
        contabilidad: { canView: true, canCreate: false, canEdit: false, canDelete: false },
        finanzas: { canView: true, canCreate: true, canEdit: true, canDelete: false },
        proyectos: { canView: true, canCreate: false, canEdit: false, canDelete: false },
        marketing: { canView: false, canCreate: false, canEdit: false, canDelete: false },
        comercial: { canView: false, canCreate: false, canEdit: false, canDelete: false },
        reportes: { canView: true, canCreate: true, canEdit: false, canDelete: false },
        chatbot: { canView: true, canCreate: true, canEdit: false, canDelete: false },
        configuracion: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    },
    PROYECTOS: {
        dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false },
        contabilidad: { canView: false, canCreate: false, canEdit: false, canDelete: false },
        finanzas: { canView: false, canCreate: false, canEdit: false, canDelete: false },
        proyectos: { canView: true, canCreate: true, canEdit: true, canDelete: false },
        marketing: { canView: false, canCreate: false, canEdit: false, canDelete: false },
        comercial: { canView: true, canCreate: false, canEdit: false, canDelete: false },
        reportes: { canView: true, canCreate: false, canEdit: false, canDelete: false },
        chatbot: { canView: true, canCreate: true, canEdit: false, canDelete: false },
        configuracion: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    },
    MARKETING: {
        dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false },
        contabilidad: { canView: false, canCreate: false, canEdit: false, canDelete: false },
        finanzas: { canView: false, canCreate: false, canEdit: false, canDelete: false },
        proyectos: { canView: true, canCreate: false, canEdit: false, canDelete: false },
        marketing: { canView: true, canCreate: true, canEdit: true, canDelete: false },
        comercial: { canView: true, canCreate: false, canEdit: false, canDelete: false },
        reportes: { canView: true, canCreate: false, canEdit: false, canDelete: false },
        chatbot: { canView: true, canCreate: true, canEdit: false, canDelete: false },
        configuracion: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    },
    COMERCIAL: {
        dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false },
        contabilidad: { canView: false, canCreate: false, canEdit: false, canDelete: false },
        finanzas: { canView: false, canCreate: false, canEdit: false, canDelete: false },
        proyectos: { canView: true, canCreate: false, canEdit: false, canDelete: false },
        marketing: { canView: true, canCreate: false, canEdit: false, canDelete: false },
        comercial: { canView: true, canCreate: true, canEdit: true, canDelete: false },
        reportes: { canView: true, canCreate: false, canEdit: false, canDelete: false },
        chatbot: { canView: true, canCreate: true, canEdit: false, canDelete: false },
        configuracion: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    },
}

export function getPermission(role: Role, module: Module): Permission {
    return permissions[role]?.[module] ?? { canView: false, canCreate: false, canEdit: false, canDelete: false }
}

export function canAccess(role: Role, module: Module): boolean {
    return permissions[role]?.[module]?.canView ?? false
}

export function getAccessibleModules(role: Role): Module[] {
    return (Object.keys(permissions[role]) as Module[]).filter((m) => permissions[role][m].canView)
}

export const roleLabels: Record<Role, string> = {
    GERENCIA: 'Gerencia',
    CONTABILIDAD: 'Contabilidad',
    FINANZAS: 'Finanzas',
    PROYECTOS: 'Proyectos',
    MARKETING: 'Marketing',
    COMERCIAL: 'Comercial',
}

export const roleColors: Record<Role, string> = {
    GERENCIA: 'badge-info',
    CONTABILIDAD: 'badge-success',
    FINANZAS: 'badge-warning',
    PROYECTOS: 'badge-neutral',
    MARKETING: 'badge-danger',
    COMERCIAL: 'badge-neutral',
}
