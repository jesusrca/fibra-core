'use client'

import type { Session } from 'next-auth'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/components/theme-provider'
import { AppProvider, type AppUser } from '@/lib/app-context'

export function Providers({
    children,
    session,
    initialUser
}: {
    children: React.ReactNode
    session?: Session | null
    initialUser?: AppUser | null
}) {
    return (
        <SessionProvider session={session}>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <AppProvider initialUser={initialUser}>{children}</AppProvider>
            </ThemeProvider>
        </SessionProvider>
    )
}
