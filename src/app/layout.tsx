import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'
import { auth } from '@/lib/auth'
import type { AppUser } from '@/lib/app-context'

export const metadata: Metadata = {
    title: 'Fibra Core — Gestión Empresarial',
    description: 'Plataforma de gestión empresarial para estudio de branding',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const session = await auth()
    let initialUser: AppUser | null = null

    if (session?.user?.id && session.user.email && session.user.role) {
        initialUser = {
            id: session.user.id,
            name: session.user.name || session.user.email,
            email: session.user.email,
            role: session.user.role
        }
    }

    return (
        <html lang="es" suppressHydrationWarning>
            <body>
                <Providers session={session} initialUser={initialUser}>{children}</Providers>
            </body>
        </html>
    )
}
