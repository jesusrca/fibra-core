import type { Metadata } from 'next'
import './globals.css'
import { AppProvider } from '@/lib/app-context'
import { ThemeProvider } from '@/components/theme-provider'

export const metadata: Metadata = {
    title: 'Fibra Core — Gestión Empresarial',
    description: 'Plataforma de gestión empresarial para estudio de branding',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es" suppressHydrationWarning>
            <body>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                    <AppProvider>{children}</AppProvider>
                </ThemeProvider>
            </body>
        </html>
    )
}
