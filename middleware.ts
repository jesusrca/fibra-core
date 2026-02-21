import { withAuth } from 'next-auth/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { authRateLimit } from '@/lib/rate-limit'

const nextAuthMiddleware = withAuth({
    pages: {
        signIn: '/login'
    }
})

export default async function middleware(req: NextRequest) {
    // 1. Rate Limiting for Login
    if (req.nextUrl.pathname === '/api/auth/callback/credentials' && req.method === 'POST') {
        if (authRateLimit) {
            const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
            const { success } = await authRateLimit.limit(ip)
            if (!success) {
                return new NextResponse('Too Many Requests', { status: 429 })
            }
        }
    }

    // 2. Delegate to NextAuth for protected routes
    return nextAuthMiddleware(req as any, {} as any)
}

export const config = {
    matcher: [
        '/api/auth/callback/credentials',
        '/dashboard/:path*',
        '/comercial/:path*',
        '/contabilidad/:path*',
        '/finanzas/:path*',
        '/proyectos/:path*',
        '/tareas/:path*',
        '/equipo/:path*',
        '/proveedores/:path*',
        '/marketing/:path*',
        '/reportes/:path*',
        '/perfil/:path*',
        '/configuracion/:path*',
        '/chatbot/:path*'
    ]
}
