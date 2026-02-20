'use client'

import { useState } from 'react'
import {
    User, Bell, Zap, Trash2, Edit2, Plus, Key, Cloud, Send, Mail, RefreshCcw, Link2Off
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { roleLabels, roleColors } from '@/lib/rbac'
import type { Role } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { createAccountingBank, deleteAccountingBank, updateAccountingBank } from '@/lib/actions/accounting-settings'
import { disconnectEmailIntegration, syncGmailEmails, upsertGmailIntegration } from '@/lib/actions/email'
import { createUser, deleteUser, updateUser } from '@/lib/actions/users'
import { sendBrevoTestEmail } from '@/lib/actions/system-email'

interface ConfigUser {
    id: string
    name: string
    email: string
    role: Role
    telegramId: string | null
}

interface AccountingBank {
    id: string
    name: string
    code: string | null
    supportedCurrencies: string[]
    isActive: boolean
    createdAt: Date | string
}

interface EmailIntegration {
    id: string
    provider: string
    accountEmail: string
    isActive: boolean
    lastSyncAt: Date | string | null
    updatedAt: Date | string
}

export function ConfiguracionClient({
    users,
    accountingBanks,
    emailIntegrations
}: {
    users: ConfigUser[]
    accountingBanks: AccountingBank[]
    emailIntegrations: EmailIntegration[]
}) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'usuarios' | 'integraciones' | 'notificaciones' | 'contabilidad'>('usuarios')
    const [showBankForm, setShowBankForm] = useState(false)
    const [showUserForm, setShowUserForm] = useState(false)
    const [editingUser, setEditingUser] = useState<ConfigUser | null>(null)
    const [editingBank, setEditingBank] = useState<AccountingBank | null>(null)
    const [savingBank, setSavingBank] = useState(false)
    const [savingUser, setSavingUser] = useState(false)
    const [userError, setUserError] = useState<string | null>(null)
    const [bankError, setBankError] = useState<string | null>(null)
    const [gmailError, setGmailError] = useState<string | null>(null)
    const [gmailSaving, setGmailSaving] = useState(false)
    const [gmailSyncing, setGmailSyncing] = useState(false)
    const [brevoTestTo, setBrevoTestTo] = useState('')
    const [brevoSending, setBrevoSending] = useState(false)
    const [brevoError, setBrevoError] = useState<string | null>(null)

    const openCreateBank = () => {
        setEditingBank(null)
        setBankError(null)
        setShowBankForm(true)
    }

    const openEditBank = (bank: AccountingBank) => {
        setEditingBank(bank)
        setBankError(null)
        setShowBankForm(true)
    }

    const handleSaveBank = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSavingBank(true)
        setBankError(null)
        const formData = new FormData(e.currentTarget)
        const payload = {
            name: (formData.get('name') as string || '').trim(),
            code: (formData.get('code') as string || '').trim(),
            supportedCurrencies: (formData.getAll('supportedCurrencies') as string[]).map((c) => c.toUpperCase()),
            isActive: formData.get('isActive') === 'on'
        }

        const result = editingBank
            ? await updateAccountingBank(editingBank.id, payload)
            : await createAccountingBank(payload)

        setSavingBank(false)
        if (!result.success) {
            setBankError(result.error || 'No se pudo guardar el banco')
            return
        }

        setShowBankForm(false)
        setEditingBank(null)
        router.refresh()
    }

    const handleDeleteBank = async (bankId: string) => {
        if (!confirm('¿Eliminar este banco?')) return
        const result = await deleteAccountingBank(bankId)
        if (!result.success) {
            alert(result.error || 'No se pudo eliminar el banco')
            return
        }
        router.refresh()
    }

    const openCreateUser = () => {
        setEditingUser(null)
        setUserError(null)
        setShowUserForm(true)
    }

    const openEditUser = (user: ConfigUser) => {
        setEditingUser(user)
        setUserError(null)
        setShowUserForm(true)
    }

    const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSavingUser(true)
        setUserError(null)
        const formData = new FormData(e.currentTarget)
        const payload = {
            name: (formData.get('name') as string || '').trim(),
            email: (formData.get('email') as string || '').trim().toLowerCase(),
            role: (formData.get('role') as Role) || 'COMERCIAL',
            password: ((formData.get('password') as string) || '').trim() || undefined
        }

        const result = editingUser
            ? await updateUser(editingUser.id, payload)
            : await createUser(payload)

        setSavingUser(false)
        if (!result.success) {
            setUserError(result.error || 'No se pudo guardar el usuario')
            return
        }
        setShowUserForm(false)
        setEditingUser(null)
        router.refresh()
    }

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('¿Eliminar este usuario?')) return
        const result = await deleteUser(userId)
        if (!result.success) {
            alert(result.error || 'No se pudo eliminar el usuario')
            return
        }
        router.refresh()
    }

    const handleSaveGmail = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setGmailSaving(true)
        setGmailError(null)
        const formData = new FormData(e.currentTarget)
        const result = await upsertGmailIntegration({
            accountEmail: (formData.get('accountEmail') as string || '').trim(),
            refreshToken: (formData.get('refreshToken') as string || '').trim(),
            clientId: (formData.get('clientId') as string || '').trim(),
            clientSecret: (formData.get('clientSecret') as string || '').trim()
        })
        setGmailSaving(false)
        if (!result.success) {
            setGmailError(result.error || 'No se pudo guardar la integración Gmail')
            return
        }
        router.refresh()
    }

    const handleSyncGmail = async () => {
        setGmailSyncing(true)
        const result = await syncGmailEmails()
        setGmailSyncing(false)
        if (!result.success) {
            setGmailError(result.error || 'No se pudo sincronizar')
            return
        }
        alert(`Sincronización completada. Correos nuevos: ${result.synced || 0}`)
        router.refresh()
    }

    const handleDisconnectGmail = async (integrationId: string) => {
        const confirmed = confirm('¿Desconectar esta integración Gmail?')
        if (!confirmed) return
        const result = await disconnectEmailIntegration(integrationId)
        if (!result.success) {
            setGmailError(result.error || 'No se pudo desconectar')
            return
        }
        router.refresh()
    }

    const handleBrevoTest = async () => {
        setBrevoSending(true)
        setBrevoError(null)
        const result = await sendBrevoTestEmail({ to: brevoTestTo })
        setBrevoSending(false)
        if (!result.success) {
            setBrevoError(result.error || 'No se pudo enviar correo de prueba')
            return
        }
        alert('Correo de prueba enviado por Brevo')
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Control de acceso e integraciones del sistema</p>
                </div>
            </div>

            <div className="flex gap-1 border-b border-border/60 mb-6">
                {[
                    { id: 'usuarios', label: 'Usuarios y Roles', icon: User },
                    { id: 'contabilidad', label: 'Contabilidad', icon: Plus },
                    { id: 'integraciones', label: 'Integraciones', icon: Zap },
                    { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
                ].map((tab) => {
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'usuarios' | 'integraciones' | 'notificaciones' | 'contabilidad')}
                            className={cn(
                                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all',
                                activeTab === tab.id
                                    ? 'border-primary text-primary bg-primary/5'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {activeTab === 'usuarios' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="section-title text-base font-bold">Gestión de Usuarios</h2>
                        <button className="btn-primary" onClick={openCreateUser}><Plus className="w-4 h-4" /> Invitar Usuario</button>
                    </div>
                    <div className="glass-card overflow-hidden">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Usuario</th>
                                    <th>Rol</th>
                                    <th>ID Telegram</th>
                                    <th>Estado</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold ring-1 ring-border">
                                                    {u.name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{u.name}</p>
                                                    <p className="text-[10px] text-muted-foreground">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className={cn('badge', roleColors[u.role])}>{roleLabels[u.role]}</span></td>
                                        <td className="text-xs font-mono text-muted-foreground">{u.telegramId || 'No vinculado'}</td>
                                        <td className="text-xs text-muted-foreground">Activo</td>
                                        <td className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <button className="btn-ghost p-1.5" onClick={() => openEditUser(u)}><Edit2 className="w-3.5 h-3.5" /></button>
                                                <button className="btn-ghost p-1.5 text-[hsl(var(--danger-text))] hover:bg-red-500/10" onClick={() => handleDeleteUser(u.id)}><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                                            No hay usuarios registrados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'contabilidad' && (
                <div className="space-y-5">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="section-title text-base font-bold">Configuración Contable</h2>
                            <p className="text-xs text-muted-foreground mt-1">Catálogo de bancos para registrar transacciones</p>
                        </div>
                        <button className="btn-primary" onClick={openCreateBank}>
                            <Plus className="w-4 h-4" /> Nuevo Banco
                        </button>
                    </div>

                    <div className="glass-card overflow-hidden">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Banco</th>
                                    <th>Código</th>
                                    <th>Monedas</th>
                                    <th>Estado</th>
                                    <th>Creado</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accountingBanks.map((bank) => (
                                    <tr key={bank.id}>
                                        <td className="font-medium">{bank.name}</td>
                                        <td className="text-xs font-mono text-muted-foreground">{bank.code || '-'}</td>
                                        <td className="text-xs text-muted-foreground">{(bank.supportedCurrencies || []).join(' / ') || '-'}</td>
                                        <td>
                                            <span className={cn('badge', bank.isActive ? 'badge-success' : 'badge-neutral')}>
                                                {bank.isActive ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="text-xs text-muted-foreground">
                                            {new Date(bank.createdAt).toLocaleDateString('es-PE')}
                                        </td>
                                        <td className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <button className="btn-ghost p-1.5" onClick={() => openEditBank(bank)}>
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button className="btn-ghost p-1.5 text-[hsl(var(--danger-text))] hover:bg-red-500/10" onClick={() => handleDeleteBank(bank.id)}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {accountingBanks.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                                            No hay bancos configurados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'integraciones' && (
                <div className="space-y-4">
                    <div className="glass-card p-5 border-l-4 border-red-500">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                    <Mail className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold">Gmail por Usuario</h3>
                                    <p className="text-[10px] text-muted-foreground">Conecta cuenta y sincroniza emails para contacto/proyecto</p>
                                </div>
                            </div>
                            <button className="btn-secondary text-xs" onClick={handleSyncGmail} disabled={gmailSyncing}>
                                {gmailSyncing ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
                                Sync ahora
                            </button>
                        </div>

                        {gmailError && (
                            <div className="mb-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg">
                                {gmailError}
                            </div>
                        )}

                        <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleSaveGmail}>
                            <div>
                                <label className="form-label">Correo Gmail</label>
                                <input name="accountEmail" type="email" className="form-input" placeholder="usuario@gmail.com" required />
                            </div>
                            <div>
                                <label className="form-label">Refresh Token</label>
                                <input name="refreshToken" type="password" className="form-input" placeholder="1//..." required />
                            </div>
                            <div>
                                <label className="form-label">Google Client ID</label>
                                <input name="clientId" className="form-input" placeholder="xxxx.apps.googleusercontent.com (opcional si está en .env)" />
                            </div>
                            <div>
                                <label className="form-label">Google Client Secret</label>
                                <input name="clientSecret" type="password" className="form-input" placeholder="GOCSPX-... (opcional si está en .env)" />
                            </div>
                            <div className="md:col-span-2 flex justify-end">
                                <button className="btn-primary" type="submit" disabled={gmailSaving}>
                                    {gmailSaving ? 'Guardando...' : 'Guardar integración Gmail'}
                                </button>
                            </div>
                        </form>

                        <div className="mt-4 table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Cuenta</th>
                                        <th>Proveedor</th>
                                        <th>Estado</th>
                                        <th>Última sync</th>
                                        <th className="text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {emailIntegrations.map((integration) => (
                                        <tr key={integration.id}>
                                            <td className="font-medium">{integration.accountEmail}</td>
                                            <td className="text-xs uppercase text-muted-foreground">{integration.provider}</td>
                                            <td>
                                                <span className={cn('badge', integration.isActive ? 'badge-success' : 'badge-neutral')}>
                                                    {integration.isActive ? 'Activa' : 'Inactiva'}
                                                </span>
                                            </td>
                                            <td className="text-xs text-muted-foreground">
                                                {integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString('es-PE') : 'Sin sincronizar'}
                                            </td>
                                            <td className="text-right">
                                                <button className="btn-ghost p-1.5 text-destructive" onClick={() => handleDisconnectGmail(integration.id)}>
                                                    <Link2Off className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {emailIntegrations.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="text-center py-6 text-sm text-muted-foreground">No hay integraciones de correo configuradas.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="glass-card p-5 border-l-4 border-blue-600">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold">Brevo (Sistema)</h3>
                                    <p className="text-[10px] text-muted-foreground">Notificaciones, reportes y recuperación de contraseña</p>
                                </div>
                            </div>
                            <span className="badge badge-neutral">API</span>
                        </div>
                        <div className="space-y-2">
                            <input
                                type="email"
                                className="form-input"
                                placeholder="correo@destino.com"
                                value={brevoTestTo}
                                onChange={(e) => setBrevoTestTo(e.target.value)}
                            />
                            <button className="btn-secondary text-xs" onClick={handleBrevoTest} disabled={brevoSending}>
                                {brevoSending ? 'Enviando...' : 'Enviar prueba Brevo'}
                            </button>
                            {brevoError && <p className="text-xs text-destructive">{brevoError}</p>}
                        </div>
                    </div>

                    <div className="glass-card p-5 border-l-4 border-indigo-500">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                    <Send className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold">Telegram Bot</h3>
                                    <p className="text-[10px] text-muted-foreground">Entrada de datos y consultas rápidas</p>
                                </div>
                            </div>
                            <span className="badge badge-neutral">Configurar</span>
                        </div>
                    </div>

                    <div className="glass-card p-5 border-l-4 border-emerald-600">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                    <Cloud className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold">Google Drive</h3>
                                    <p className="text-[10px] text-muted-foreground">Sincronización de reportes y archivos</p>
                                </div>
                            </div>
                            <span className="badge badge-neutral">Pendiente</span>
                        </div>
                    </div>

                    <div className="glass-card p-5 border-l-4 border-orange-600">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold">n8n Automation</h3>
                                    <p className="text-[10px] text-muted-foreground">Flujos de trabajo personalizados</p>
                                </div>
                            </div>
                            <button className="btn-secondary py-1 px-2 text-[10px] font-semibold">Test Webhook</button>
                        </div>
                    </div>

                    <div className="glass-card p-5 border-l-4 border-primary">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Key className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold">OpenAI</h3>
                                    <p className="text-[10px] text-muted-foreground">Motor de inteligencia de la plataforma</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            )}

            {activeTab === 'notificaciones' && (
                <div className="glass-card p-6 max-w-2xl">
                    <h2 className="section-title mb-6">Canales y Preferencias</h2>
                    <div className="space-y-6">
                        {[
                            { id: 'inapp', label: 'Notificaciones en Plataforma', desc: 'Alertas en la campana del header para eventos críticos.', icon: Bell },
                            { id: 'tg', label: 'Bot de Telegram', desc: 'Recibir notificaciones en tu chat de Telegram vinculado.', icon: Send },
                            { id: 'mail', label: 'Correo Electrónico', desc: 'Resúmenes y reportes vía email.', icon: Mail },
                        ].map((channel) => (
                            <div key={channel.id} className="flex items-start gap-4 p-4 bg-secondary/20 rounded-xl border border-border/40">
                                <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground">
                                    <channel.icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-bold">{channel.label}</p>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" defaultChecked />
                                            <div className="w-9 h-5 bg-secondary rounded-full peer-checked:bg-primary" />
                                        </label>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{channel.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showUserForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowUserForm(false)}>
                    <div className="modal-form-card p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-foreground mb-4">{editingUser ? 'Editar usuario' : 'Invitar usuario'}</h3>
                        <form className="space-y-4" onSubmit={handleSaveUser}>
                            {userError && (
                                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg">
                                    {userError}
                                </div>
                            )}
                            <div>
                                <label className="form-label">Nombre</label>
                                <input name="name" required className="form-input" defaultValue={editingUser?.name || ''} placeholder="Nombre y apellido" />
                            </div>
                            <div>
                                <label className="form-label">Correo</label>
                                <input name="email" type="email" required className="form-input" defaultValue={editingUser?.email || ''} placeholder="usuario@fibra.studio" />
                            </div>
                            <div>
                                <label className="form-label">Rol</label>
                                <select name="role" className="form-input" defaultValue={editingUser?.role || 'COMERCIAL'}>
                                    {(Object.keys(roleLabels) as Role[]).map((role) => (
                                        <option key={role} value={role}>{roleLabels[role]}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Contraseña {editingUser ? '(opcional)' : ''}</label>
                                <input name="password" type="password" className="form-input" placeholder={editingUser ? 'Dejar vacío para no cambiar' : 'Temporal (opcional)'} />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" className="flex-1 btn-secondary" onClick={() => setShowUserForm(false)}>Cancelar</button>
                                <button type="submit" className="flex-1 btn-primary justify-center" disabled={savingUser}>
                                    {savingUser ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showBankForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowBankForm(false)}>
                    <div className="modal-form-card p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-foreground mb-4">{editingBank ? 'Editar banco' : 'Nuevo banco'}</h3>
                        <form className="space-y-4" onSubmit={handleSaveBank}>
                            {bankError && (
                                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg">
                                    {bankError}
                                </div>
                            )}
                            <div>
                                <label className="form-label">Nombre</label>
                                <input name="name" required className="form-input" defaultValue={editingBank?.name || ''} placeholder="Ej: BCP" />
                            </div>
                            <div>
                                <label className="form-label">Código (opcional)</label>
                                <input name="code" className="form-input" defaultValue={editingBank?.code || ''} placeholder="Ej: BCP" />
                            </div>
                            <div>
                                <label className="form-label">Monedas habilitadas</label>
                                <div className="flex items-center gap-4 mt-2">
                                    <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                        <input
                                            name="supportedCurrencies"
                                            type="checkbox"
                                            value="PEN"
                                            defaultChecked={editingBank ? editingBank.supportedCurrencies.includes('PEN') : true}
                                        />
                                        PEN
                                    </label>
                                    <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                        <input
                                            name="supportedCurrencies"
                                            type="checkbox"
                                            value="USD"
                                            defaultChecked={editingBank ? editingBank.supportedCurrencies.includes('USD') : true}
                                        />
                                        USD
                                    </label>
                                </div>
                            </div>
                            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                <input name="isActive" type="checkbox" defaultChecked={editingBank ? editingBank.isActive : true} />
                                Banco activo
                            </label>
                            <div className="flex gap-2 pt-2">
                                <button type="button" className="flex-1 btn-secondary" onClick={() => setShowBankForm(false)}>Cancelar</button>
                                <button type="submit" className="flex-1 btn-primary justify-center" disabled={savingBank}>
                                    {savingBank ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
