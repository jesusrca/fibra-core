import { PerfilClient } from '@/components/perfil/perfil-client'
import { getMyProfile } from '@/lib/actions/users'

export const dynamic = 'force-dynamic'

export default async function PerfilPage() {
    const profile = await getMyProfile()
    if (!profile) {
        return <div className="text-sm text-muted-foreground">No se pudo cargar el perfil.</div>
    }

    return (
        <PerfilClient
            profile={{
                id: profile.id,
                name: profile.name,
                email: profile.email,
                role: profile.role,
                phone: profile.phone,
                country: profile.country,
                timezone: profile.timezone,
                specialty: profile.specialty,
                birthday: profile.birthday ? profile.birthday.toISOString() : null,
                createdAt: profile.createdAt.toISOString()
            }}
        />
    )
}
