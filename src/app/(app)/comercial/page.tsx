import { getLeads, getContacts } from '@/lib/actions/crm'
import { getUsers, getClients } from '@/lib/actions/projects'
import { ComercialClient } from '@/components/crm/comercial-client'

export const dynamic = 'force-dynamic'

export default async function ComercialPage() {
    const [leads, users, clients, contacts] = await Promise.all([
        getLeads(),
        getUsers(),
        getClients(),
        getContacts()
    ])

    return (
        <ComercialClient
            initialLeads={leads as any}
            users={users}
            clients={clients}
            contacts={contacts}
        />
    )
}
