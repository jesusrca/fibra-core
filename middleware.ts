export { default } from 'next-auth/middleware'

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/comercial/:path*',
        '/contabilidad/:path*',
        '/finanzas/:path*',
        '/proyectos/:path*',
        '/equipo/:path*',
        '/proveedores/:path*',
        '/marketing/:path*',
        '/reportes/:path*',
        '/perfil/:path*',
        '/configuracion/:path*',
        '/chatbot/:path*'
    ]
}

