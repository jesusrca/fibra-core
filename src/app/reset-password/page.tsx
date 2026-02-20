'use client'

import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { resetPasswordWithToken } from '@/lib/actions/password-recovery'

export default function ResetPasswordPage() {
    const searchParams = useSearchParams()
    const token = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams])
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    async function onSubmit(e: FormEvent) {
        e.preventDefault()
        setError('')
        if (!token) {
            setError('Token inválido.')
            return
        }
        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.')
            return
        }
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.')
            return
        }

        setLoading(true)
        const result = await resetPasswordWithToken({ token, password })
        setLoading(false)
        if (!result.success) {
            setError(result.error || 'No se pudo restablecer la contraseña.')
            return
        }
        setSuccess(true)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
                <h1 className="text-xl font-bold">Restablecer contraseña</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Ingresa una nueva contraseña para tu cuenta.
                </p>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                    <div>
                        <label className="form-label">Nueva contraseña</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="form-label">Confirmar contraseña</label>
                        <input
                            type="password"
                            className="form-input"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}
                    {success && <p className="text-sm text-[hsl(var(--success-text))]">Contraseña actualizada. Ya puedes iniciar sesión.</p>}

                    <button type="submit" className="btn-primary w-full justify-center" disabled={loading || success}>
                        {loading ? 'Actualizando...' : 'Guardar contraseña'}
                    </button>
                </form>

                <div className="mt-4">
                    <Link href="/login" className="text-sm text-primary hover:underline">Ir al login</Link>
                </div>
            </div>
        </div>
    )
}

