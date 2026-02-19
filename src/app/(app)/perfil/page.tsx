'use client'

import { useState } from 'react'
import { User, Mail, Phone, MapPin, Calendar, Camera, Shield, Zap, Target, Briefcase } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useApp } from '@/lib/app-context'
import { roleLabels } from '@/lib/rbac'

export default function PerfilPage() {
    const { currentUser } = useApp()

    // Using mock data for own profile
    const userProfile = {
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        phone: '+51 987 654 321',
        country: 'Perú',
        timezone: 'Lima (GMT-5)',
        specialty: 'Director de Arte / Branding',
        birthday: '1992-05-15',
        bio: 'Apasionado por el diseño minimalista y la estrategia de marca. Llevo más de 8 años construyendo identidades visuales que conectan personas.',
        joinDate: '2023-01-10'
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
                {/* Left Column: Avatar & Quick Info */}
                <div className="space-y-6">
                    <div className="glass-card p-8 flex flex-col items-center text-center">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-electric-500 to-gold-500 flex items-center justify-center text-4xl font-bold text-white shadow-xl shadow-primary/20">
                                {userProfile.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <button className="absolute -right-2 -bottom-2 w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary transition-colors shadow-lg">
                                <Camera className="w-5 h-5" />
                            </button>
                        </div>

                        <h2 className="text-xl font-bold text-foreground mt-6">{userProfile.name}</h2>
                        <span className="badge badge-info mt-2">{roleLabels[userProfile.role]}</span>

                        <div className="w-full h-px bg-border/40 my-6" />

                        <div className="w-full space-y-4 text-left">
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Mail className="w-4 h-4 text-primary" />
                                {userProfile.email}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <MapPin className="w-4 h-4 text-primary" />
                                {userProfile.country} — {userProfile.timezone}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4 text-primary" />
                                Miembro desde {formatDate(userProfile.joinDate)}
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-widest">Estadísticas</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-secondary/20 rounded-xl border border-border/40 text-center">
                                <p className="text-2xl font-bold text-primary">24</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Proyectos</p>
                            </div>
                            <div className="p-4 bg-secondary/20 rounded-xl border border-border/40 text-center">
                                <p className="text-2xl font-bold text-success text-[hsl(var(--success-text))]">98%</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Efectividad</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Detailed Forms */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <User className="w-5 h-5 text-primary" /> Información General
                            </h3>
                            <button className="btn-secondary text-xs">Guardar Cambios</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="form-label">Nombre Completo</label>
                                <input type="text" className="form-input" defaultValue={userProfile.name} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="form-label">Especialidad / Cargo</label>
                                <input type="text" className="form-input" defaultValue={userProfile.specialty} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="form-label">Correo Electrónico</label>
                                <input type="email" className="form-input" defaultValue={userProfile.email} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="form-label">Teléfono / WhatsApp</label>
                                <input type="text" className="form-input" defaultValue={userProfile.phone} />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="form-label">Bio Corta</label>
                                <textarea className="form-input min-h-[100px]" defaultValue={userProfile.bio} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="form-label">Fecha de Nacimiento</label>
                                <input type="date" className="form-input" defaultValue={userProfile.birthday} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="form-label">Zona Horaria</label>
                                <select className="form-input">
                                    <option>Lima (GMT-5)</option>
                                    <option>New York (GMT-5)</option>
                                    <option>Madrid (GMT+1)</option>
                                    <option>Buenos Aires (GMT-3)</option>
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
                                <button className="btn-secondary text-xs">Actualizar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
