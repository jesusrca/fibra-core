import { getUsers } from '@/lib/actions/users'
import { EquipoClient } from '@/components/equipo/equipo-client'

export const dynamic = 'force-dynamic'

export default async function EquipoPage() {
    const users = await getUsers()

    return <EquipoClient initialUsers={users} />
}
