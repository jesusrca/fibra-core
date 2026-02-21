import { Role } from '@prisma/client'
import { canAccess } from '@/lib/rbac'
import { ensureComercialDataQualityNotifications, ensureProjectDataQualityNotifications } from '@/lib/data-quality-notifications'
import { ensureDefaultServices } from '@/lib/actions/services'
import { ensureDefaultAccountingBanks } from '@/lib/actions/accounting-settings'
import { syncInvoicesFromMilestones } from '@/lib/actions/crm'

type MaintenanceTaskResult = {
    name: string
    executed: boolean
    error?: string
}

type GuardEntry = {
    running: boolean
    lastRunAt: number
}

const maintenanceGuards = new Map<string, GuardEntry>()

async function runThrottledTask(
    key: string,
    minIntervalMs: number,
    taskName: string,
    task: () => Promise<unknown>
): Promise<MaintenanceTaskResult> {
    const now = Date.now()
    const guard = maintenanceGuards.get(key)
    if (guard?.running) {
        return { name: taskName, executed: false }
    }
    if (guard && now - guard.lastRunAt < minIntervalMs) {
        return { name: taskName, executed: false }
    }

    maintenanceGuards.set(key, { running: true, lastRunAt: guard?.lastRunAt || 0 })
    try {
        await task()
        maintenanceGuards.set(key, { running: false, lastRunAt: Date.now() })
        return { name: taskName, executed: true }
    } catch (error) {
        maintenanceGuards.set(key, { running: false, lastRunAt: Date.now() })
        return {
            name: taskName,
            executed: true,
            error: error instanceof Error ? error.message : 'unknown_error'
        }
    }
}

export async function runBackgroundMaintenance(input: { userId: string; role: Role }) {
    const tasks: Array<Promise<MaintenanceTaskResult>> = []

    if (canAccess(input.role, 'marketing') || canAccess(input.role, 'proyectos')) {
        tasks.push(
            runThrottledTask(
                'maintenance:default-services',
                1000 * 60 * 30,
                'ensureDefaultServices',
                () => ensureDefaultServices()
            )
        )
    }

    if (canAccess(input.role, 'contabilidad') || canAccess(input.role, 'configuracion')) {
        tasks.push(
            runThrottledTask(
                'maintenance:default-banks',
                1000 * 60 * 30,
                'ensureDefaultAccountingBanks',
                () => ensureDefaultAccountingBanks()
            )
        )
    }

    if (canAccess(input.role, 'comercial')) {
        tasks.push(
            runThrottledTask(
                `maintenance:quality:comercial:${input.userId}`,
                1000 * 60 * 20,
                'ensureComercialDataQualityNotifications',
                () => ensureComercialDataQualityNotifications(input.userId)
            )
        )
        tasks.push(
            runThrottledTask(
                'maintenance:sync-invoices-milestones',
                1000 * 60 * 15,
                'syncInvoicesFromMilestones',
                () => syncInvoicesFromMilestones()
            )
        )
    }

    if (canAccess(input.role, 'proyectos')) {
        tasks.push(
            runThrottledTask(
                `maintenance:quality:proyectos:${input.userId}`,
                1000 * 60 * 20,
                'ensureProjectDataQualityNotifications',
                () => ensureProjectDataQualityNotifications(input.userId)
            )
        )
    }

    const results = await Promise.all(tasks)
    return {
        success: true,
        results
    }
}

