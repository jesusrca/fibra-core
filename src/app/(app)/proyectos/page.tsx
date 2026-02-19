import { getProjects, getClients, getUsers } from '@/lib/actions/projects'
import { ProjectClient } from '@/components/projects/project-client'

export const dynamic = 'force-dynamic'

export default async function ProyectosPage() {
    const projects = await getProjects()
    const clients = await getClients()
    const users = await getUsers()

    return (
        <ProjectClient
            initialProjects={projects as any[]}
            clients={clients}
            users={users}
        />
    )
}
