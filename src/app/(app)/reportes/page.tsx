import { ReportesClient } from '@/components/reportes/reportes-client'
import { listReports } from '@/lib/actions/reports'

export const dynamic = 'force-dynamic'

export default async function ReportesPage() {
    const reports = await listReports()
    return <ReportesClient initialReports={reports} />
}
