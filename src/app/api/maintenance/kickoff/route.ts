import { requireAuthUser } from '@/lib/server-auth'
import { runBackgroundMaintenance } from '@/lib/maintenance'

export const runtime = 'nodejs'
export const maxDuration = 25

export async function POST() {
    try {
        const user = await requireAuthUser()
        const result = await runBackgroundMaintenance({ userId: user.id, role: user.role })
        return Response.json(result)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error ejecutando mantenimiento'
        return Response.json({ success: false, error: message }, { status: 401 })
    }
}

