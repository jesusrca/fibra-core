import { getProjectById, getUsers } from '@/lib/actions/projects'
import { ProjectDetailClient } from '@/components/projects/project-detail-client'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface PageProps {
    params: {
        id: string
    }
}

export default async function ProjectDetailPage({ params }: PageProps) {
    const [project, users] = await Promise.all([
        getProjectById(params.id),
        getUsers()
    ])

    if (!project) {
        notFound()
    }

    return <ProjectDetailClient project={project} users={users} />
}
