import { getProjects, getClients, getUsers } from '@/lib/actions/projects'
import { ProjectClient } from '@/components/projects/project-client'

export const dynamic = 'force-dynamic'

export default async function ProyectosPage() {
    const [projects, clients, users] = await Promise.all([
        getProjects(),
        getClients(),
        getUsers()
    ])

    return (
        <ProjectClient
            initialProjects={projects as any[]}
            clients={clients}
            users={users}
        />
    )
}
