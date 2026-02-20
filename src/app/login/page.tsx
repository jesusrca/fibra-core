'use client'

import { FormEvent, useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

export default function LoginPage() {
    const router = useRouter()
    const callbackUrl = '/dashboard'
    const { status } = useSession()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (status === 'authenticated') {
            router.replace(callbackUrl)
        }
    }, [status, router, callbackUrl])

    async function onSubmit(e: FormEvent) {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        const result = await signIn('credentials', {
            email,
            password,
            redirect: false,
            callbackUrl
        })

        setIsLoading(false)

        if (result?.error) {
            setError('No se pudo iniciar sesión. Verifica que el email exista.')
            return
        }

        router.push(result?.url || callbackUrl)
        router.refresh()
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
                <h1 className="text-xl font-bold">Iniciar sesión</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Usa el correo de un usuario existente en la base de datos.
                </p>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                    <div>
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="form-label">Contraseña</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <div className="mt-2 text-right">
                            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}

                    <button type="submit" className="btn-primary w-full justify-center" disabled={isLoading}>
                        {isLoading ? 'Ingresando...' : 'Continuar'}
                    </button>
                </form>
            </div>
        </div>
    )
}
