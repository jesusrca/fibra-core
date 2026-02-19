import { getLeads } from '@/lib/actions/crm'
import { getProjects } from '@/lib/actions/projects'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
import { mockNotifications, mockTransactions } from '@/lib/mock-data'
// import { LeadStatus } from '@prisma/client'
const LeadStatus = {
    WON: 'WON',
    LOST: 'LOST'
} as any

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    const [leads, projects] = await Promise.all([
        getLeads(),
        getProjects(),
    ])

    // Calculate real stats from Commercial (Leads)
    const pipelineValue = (leads as any[])
        .filter((l: any) => l.status !== LeadStatus.WON && l.status !== LeadStatus.LOST)
        .reduce((sum: number, l: any) => sum + (l.estimatedValue || 0), 0)

    const opportunitiesCount = (leads as any[])
        .filter((l: any) => l.status !== LeadStatus.WON && l.status !== LeadStatus.LOST)
        .length

    // Calculate real stats from Projects
    const activeProjects = (projects as any[]).filter((p: any) => p.status === 'ACTIVE' || p.status === 'REVIEW')
    const activeProjectsCount = activeProjects.length

    const projectsByStatus = [
        { name: 'Activos', value: (projects as any[]).filter((p: any) => p.status === 'ACTIVE').length },
        { name: 'Revisión', value: (projects as any[]).filter((p: any) => p.status === 'REVIEW').length },
        { name: 'Planeación', value: (projects as any[]).filter((p: any) => p.status === 'PLANNING').length },
        { name: 'Completados', value: (projects as any[]).filter((p: any) => p.status === 'COMPLETED').length },
    ]

    // Real-ish revenue (WON leads)
    const totalRevenue = (leads as any[])
        .filter((l: any) => l.status === LeadStatus.WON)
        .reduce((sum: number, l: any) => sum + (l.estimatedValue || 0), 0)

    const stats = {
        totalRevenue: totalRevenue || 22700, // Fallback to mock if 0
        activeProjectsCount,
        pipelineValue,
        opportunitiesCount,
        projectsByStatus,
        recentTransactions: mockTransactions.slice(0, 5), // Keep mock for now until Transactions are fully in DB
        activeProjects: projects.slice(0, 5),
        recentNotifications: mockNotifications.filter(n => !n.read),
    }

    return <DashboardClient stats={stats as any} />
}
