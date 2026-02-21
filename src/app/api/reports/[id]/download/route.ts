import prisma from '@/lib/prisma'
import { requireAuthUser, requireModuleAccess } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

interface Ctx {
    params: Promise<{ id: string }>
}

export async function GET(_: Request, { params }: Ctx) {
    await requireModuleAccess('reportes')
    const user = await requireAuthUser()
    const { id } = await params

    const report = await prisma.report.findFirst({
        where: {
            id,
            generatedById: user.id
        },
        select: {
            id: true,
            name: true,
            format: true,
            content: true
        }
    })

    if (!report) {
        return Response.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    const ext = report.format === 'CSV' ? 'csv' : 'json'
    const contentType = report.format === 'CSV' ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8'

    return new Response(report.content || '', {
        headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename=\"${report.id}.${ext}\"`
        }
    })
}
