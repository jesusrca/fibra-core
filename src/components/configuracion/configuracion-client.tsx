'use client'

import { useState } from 'react'
import {
    User, Bell, Zap, Trash2, Edit2, Plus, Key, Cloud, Send, Mail
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { roleLabels, roleColors } from '@/lib/rbac'
import type { Role } from '@prisma/client'

interface ConfigUser {
    id: string
    name: string
    email: string
    role: Role
    telegramId: string | null
}

export function ConfiguracionClient({ users }: { users: ConfigUser[] }) {
    const [activeTab, setActiveTab] = useState<'usuarios' | 'integraciones' | 'notificaciones'>('usuarios')

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
                    { id: 'integraciones', label: 'Integraciones', icon: Zap },
                    { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
                ].map((tab) => {
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'usuarios' | 'integraciones' | 'notificaciones')}
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
                        <button className="btn-primary"><Plus className="w-4 h-4" /> Invitar Usuario</button>
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
                                                <button className="btn-ghost p-1.5"><Edit2 className="w-3.5 h-3.5" /></button>
                                                <button className="btn-ghost p-1.5 text-[hsl(var(--danger-text))] hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
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

            {activeTab === 'integraciones' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
    )
}
