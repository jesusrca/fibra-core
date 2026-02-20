'use client'

import { useMemo, useState } from 'react'
import { User, Mail, MapPin, Calendar, Camera, Shield, Zap, Target } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { roleLabels } from '@/lib/rbac'
import { updateMyPassword, updateMyProfile } from '@/lib/actions/users'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { formatTimezoneLabel, getTimezoneOptions } from '@/lib/timezones'

interface PerfilClientProps {
    profile: {
        id: string
        name: string
        email: string
        role: string
        phone: string | null
        country: string | null
        timezone: string | null
        specialty: string | null
        birthday: string | null
        createdAt: string
    }
}

export function PerfilClient({ profile }: PerfilClientProps) {
    const { update } = useSession()
    const router = useRouter()
    const [form, setForm] = useState({
        name: profile.name || '',
        specialty: profile.specialty || '',
        phone: profile.phone || '',
        country: profile.country || '',
        timezone: profile.timezone || 'America/Lima',
        birthday: profile.birthday ? profile.birthday.slice(0, 10) : ''
    })
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [showPasswordForm, setShowPasswordForm] = useState(false)
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [passwordSaving, setPasswordSaving] = useState(false)
    const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
    const initials = (form.name || profile.email).split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    const timezoneOptions = useMemo(
        () => getTimezoneOptions(form.timezone || profile.timezone || null),
        [form.timezone, profile.timezone]
    )

    const handleSave = async () => {
        setSaving(true)
        setMessage(null)
        const result = await updateMyProfile({
            name: form.name,
            specialty: form.specialty || undefined,
            phone: form.phone || undefined,
            country: form.country || undefined,
            timezone: form.timezone || undefined,
            birthday: form.birthday ? new Date(`${form.birthday}T00:00:00`) : undefined
        })
        setSaving(false)
        if (!result.success) {
            setMessage(result.error || 'No se pudo guardar')
            return
        }
        await update({
            name: form.name,
            user: {
                name: form.name
            }
        } as any)
        router.refresh()
        setMessage('Perfil actualizado correctamente')
    }

    const handlePasswordUpdate = async () => {
        setPasswordMessage(null)
        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            setPasswordMessage('Completa todos los campos de contraseña')
            return
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordMessage('La confirmación no coincide con la nueva contraseña')
            return
        }
        setPasswordSaving(true)
        const result = await updateMyPassword({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword
        })
        setPasswordSaving(false)
        if (!result.success) {
            setPasswordMessage(result.error || 'No se pudo actualizar la contraseña')
            return
        }
        setPasswordMessage('Contraseña actualizada correctamente')
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setShowPasswordForm(false)
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold text-foreground font-display">Mi Perfil</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Gestiona tu información personal y profesional</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-6">
                    <div className="glass-card p-8 flex flex-col items-center text-center">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-electric-500 to-gold-500 flex items-center justify-center text-4xl font-bold text-white shadow-xl shadow-primary/20">
                                {initials}
                            </div>
                            <button className="absolute -right-2 -bottom-2 w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary transition-colors shadow-lg">
                                <Camera className="w-5 h-5" />
                            </button>
                        </div>

                        <h2 className="text-xl font-bold text-foreground mt-6">{form.name || profile.email}</h2>
                        <span className="badge badge-info mt-2">{roleLabels[profile.role as keyof typeof roleLabels] || profile.role}</span>

                        <div className="w-full h-px bg-border/40 my-6" />

                        <div className="w-full space-y-4 text-left">
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Mail className="w-4 h-4 text-primary" />
                                {profile.email}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <MapPin className="w-4 h-4 text-primary" />
                                {(form.country || 'Sin país')} — {form.timezone || 'Sin zona horaria'}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4 text-primary" />
                                Miembro desde {formatDate(profile.createdAt)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <User className="w-5 h-5 text-primary" /> Información General
                            </h3>
                            <button className="btn-secondary text-xs" onClick={handleSave} disabled={saving}>
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>

                        {message && (
                            <div className="mb-4 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm">
                                {message}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="form-label">Nombre Completo</label>
                                <input type="text" className="form-input" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="form-label">Especialidad / Cargo</label>
                                <input type="text" className="form-input" value={form.specialty} onChange={(e) => setForm((prev) => ({ ...prev, specialty: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="form-label">Correo Electrónico</label>
                                <input type="email" className="form-input" value={profile.email} disabled />
                            </div>
                            <div className="space-y-1.5">
                                <label className="form-label">Teléfono / WhatsApp</label>
                                <input type="text" className="form-input" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="form-label">País</label>
                                <input type="text" className="form-input" value={form.country} onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="form-label">Fecha de Nacimiento</label>
                                <input type="date" className="form-input" value={form.birthday} onChange={(e) => setForm((prev) => ({ ...prev, birthday: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="form-label">Zona Horaria</label>
                                <select className="form-input" value={form.timezone} onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}>
                                    {timezoneOptions.map((tz) => (
                                        <option key={tz} value={tz}>
                                            {formatTimezoneLabel(tz)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-8">
                        <h3 className="text-lg font-bold flex items-center gap-2 mb-8">
                            <Shield className="w-5 h-5 text-primary" /> Seguridad y Cuenta
                        </h3>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-border/40">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground">
                                        <Zap className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">Autenticación de 2 Factores (2FA)</p>
                                        <p className="text-xs text-muted-foreground">Añade una capa extra de seguridad a tu cuenta.</p>
                                    </div>
                                </div>
                                <button className="btn-secondary text-xs">Configurar</button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-border/40">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground">
                                        <Target className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">Cambiar Contraseña</p>
                                        <p className="text-xs text-muted-foreground">Actualiza tu contraseña regularmente.</p>
                                    </div>
                                </div>
                                <button
                                    className="btn-secondary text-xs"
                                    onClick={() => setShowPasswordForm((prev) => !prev)}
                                >
                                    {showPasswordForm ? 'Cancelar' : 'Actualizar'}
                                </button>
                            </div>

                            {showPasswordForm && (
                                <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
                                    <div>
                                        <label className="form-label">Contraseña actual</label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            value={passwordForm.currentPassword}
                                            onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="form-label">Nueva contraseña</label>
                                            <input
                                                type="password"
                                                className="form-input"
                                                value={passwordForm.newPassword}
                                                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label">Confirmar nueva contraseña</label>
                                            <input
                                                type="password"
                                                className="form-input"
                                                value={passwordForm.confirmPassword}
                                                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                    {passwordMessage && (
                                        <p className="text-xs text-muted-foreground">{passwordMessage}</p>
                                    )}
                                    <div className="flex justify-end">
                                        <button className="btn-primary text-xs" onClick={handlePasswordUpdate} disabled={passwordSaving}>
                                            {passwordSaving ? 'Actualizando...' : 'Guardar nueva contraseña'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
