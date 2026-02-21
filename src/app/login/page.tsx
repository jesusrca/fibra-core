'use client'

import { FormEvent, useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { startAuthentication } from '@simplewebauthn/browser'

export default function LoginPage() {
    const router = useRouter()
    const callbackUrl = '/dashboard'
    const { status } = useSession()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isPasskeyLoading, setIsPasskeyLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (status === 'authenticated') {
            router.replace(callbackUrl)
        }
    }, [status, router, callbackUrl])

    async function onSubmitPassword(e: FormEvent) {
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
            setError('No se pudo iniciar sesión. Verifica el email y contraseña.')
            return
        }

        router.push(result?.url || callbackUrl)
        router.refresh()
    }

    async function onStartPasskeyLogin() {
        if (!email) {
            setError('Ingresa tu email primero para usar Passkey')
            return
        }
        setIsPasskeyLoading(true)
        setError('')

        try {
            // 1. Obtener opciones del servidor
            const res = await fetch('/api/auth/webauthn/login/options', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'No se pudo iniciar passkey')
            }

            const options = await res.json()

            // 2. Interactuar con el navegador
            const asseResp = await startAuthentication(options)

            // 3. Verificar con el servidor
            const verifyRes = await fetch('/api/auth/webauthn/login/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, response: asseResp })
            })

            const verifyData = await verifyRes.json()

            if (verifyData.success) {
                // 4. Iniciar sesión real con NextAuth usando el provider 'passkey'
                const result = await signIn('passkey', {
                    email,
                    passkeyVerified: 'true',
                    redirect: false,
                    callbackUrl
                })

                if (result?.error) throw new Error('Falló el SignIn interno')

                router.push(result?.url || callbackUrl)
                router.refresh()
            } else {
                throw new Error(verifyData.error || 'Verificación fallida')
            }

        } catch (err: any) {
            console.error('Passkey error:', err)
            // Error amigable si el usuario cancela
            if (err.name === 'NotAllowedError') {
                setError('Autenticación cancelada.')
            } else {
                setError(err.message || 'Error usando Passkey')
            }
        } finally {
            setIsPasskeyLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
                <h1 className="text-xl font-bold">Iniciar sesión</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Usa el correo de un usuario existente en la base de datos.
                </p>

                <div className="mt-6 space-y-4">
                    <div>
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && password) {
                                    onSubmitPassword(e as any)
                                }
                            }}
                            required
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}

                    <div className="space-y-3 pt-2">
                        <button
                            type="button"
                            onClick={onStartPasskeyLogin}
                            className="btn-primary w-full justify-center bg-indigo-600 hover:bg-indigo-700"
                            disabled={isPasskeyLoading || isLoading}
                        >
                            {isPasskeyLoading ? 'Verificando Passkey...' : 'Iniciar sesión con Passkey'}
                        </button>

                        <div className="relative flex items-center py-2">
                            <div className="flex-grow border-t border-border"></div>
                            <span className="shrink-0 px-3 text-muted-foreground text-xs uppercase">O usa tu contraseña</span>
                            <div className="flex-grow border-t border-border"></div>
                        </div>

                        <form onSubmit={onSubmitPassword} className="space-y-4">
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

                            <button type="submit" className="btn-secondary w-full justify-center" disabled={isLoading || isPasskeyLoading}>
                                {isLoading ? 'Ingresando...' : 'Iniciar con Contraseña'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
