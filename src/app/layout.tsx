import type { Metadata } from 'next'
import './globals.css'
import { AppProvider } from '@/lib/app-context'

export const metadata: Metadata = {
    title: 'Fibra Core — Gestión Empresarial',
    description: 'Plataforma de gestión empresarial para estudio de branding',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es" className="dark">
            <body>
                <AppProvider>{children}</AppProvider>
            </body>
        </html>
    )
}
