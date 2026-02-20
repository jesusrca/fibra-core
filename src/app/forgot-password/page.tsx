'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { requestPasswordReset } from '@/lib/actions/password-recovery'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)

    async function onSubmit(e: FormEvent) {
        e.preventDefault()
        setLoading(true)
        await requestPasswordReset(email)
        setLoading(false)
        setDone(true)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
                <h1 className="text-xl font-bold">Recuperar contraseña</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Te enviaremos un enlace de recuperación por correo.
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

                    {done && (
                        <p className="text-sm text-[hsl(var(--success-text))]">
                            Si el correo existe, enviamos instrucciones de recuperación.
                        </p>
                    )}

                    <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
                        {loading ? 'Enviando...' : 'Enviar enlace'}
                    </button>
                </form>

                <div className="mt-4">
                    <Link href="/login" className="text-sm text-primary hover:underline">Volver al login</Link>
                </div>
            </div>
        </div>
    )
}

