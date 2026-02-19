import type { NextAuthOptions } from 'next-auth'
import { getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import prisma from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'

export const authOptions: NextAuthOptions = {
    session: {
        strategy: 'jwt'
    },
    pages: {
        signIn: '/login'
    },
    providers: [
        CredentialsProvider({
            name: 'Email',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' }
            },
            async authorize(credentials) {
                const email = credentials?.email?.trim().toLowerCase()
                const password = credentials?.password
                if (!email || !password) return null

                const user = await prisma.user.findUnique({
                    where: { email },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        passwordHash: true
                    }
                })

                if (!user) return null
                if (!user.passwordHash) return null
                if (!verifyPassword(password, user.passwordHash)) return null

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id
                token.role = user.role
                token.name = user.name
                token.email = user.email
            }
            if (trigger === 'update' && session) {
                const sessionAny = session as any
                const nextName = sessionAny?.user?.name || sessionAny?.name
                const nextEmail = sessionAny?.user?.email || sessionAny?.email
                if (nextName) token.name = nextName
                if (nextEmail) token.email = nextEmail
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string
                session.user.role = token.role as typeof session.user.role
                session.user.name = (token.name as string) || session.user.name
                session.user.email = (token.email as string) || session.user.email
            }
            return session
        }
    }
}

export function auth() {
    return getServerSession(authOptions)
}
