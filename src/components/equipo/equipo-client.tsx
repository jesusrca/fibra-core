'use client'

import { Plus, Search, Mail, Edit2, Phone, MapPin, CalendarDays, Clock3 } from 'lucide-react'
import { useState } from 'react'
import { formatDate } from '@/lib/utils'
import { createUser, updateUser } from '@/lib/actions/users'
import { Role } from '@prisma/client'

interface TeamMember {
    id: string
    name: string
    email: string
    role: Role
    specialty: string | null
    phone: string | null
    country: string | null
    birthday: Date | null
    timezone: string | null
    schedule: string | null
}

interface EquipoClientProps {
    initialUsers: TeamMember[]
}

function toInputDate(value: Date | string | null | undefined) {
    if (!value) return ''
    return new Date(value).toISOString().slice(0, 10)
}

export function EquipoClient({ initialUsers }: EquipoClientProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
    const [loading, setLoading] = useState(false)

    const filteredTeam = initialUsers.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.specialty || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.country || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        const data = {
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            role: formData.get('role') as Role,
            specialty: ((formData.get('specialty') as string) || '').trim() || undefined,
            phone: ((formData.get('phone') as string) || '').trim() || undefined,
            country: ((formData.get('country') as string) || '').trim() || undefined,
            birthday: formData.get('birthday') ? new Date(formData.get('birthday') as string) : undefined,
            timezone: ((formData.get('timezone') as string) || '').trim() || undefined,
            schedule: ((formData.get('schedule') as string) || '').trim() || undefined,
        }

        if (selectedMember) {
            await updateUser(selectedMember.id, data)
        } else {
            await createUser(data)
        }

        setLoading(false)
        setShowForm(false)
        setSelectedMember(null)
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold text-foreground font-display">Equipo de Trabajo</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Gestión de talento, roles y disponibilidad</p>
                </div>
                <button className="btn-primary" onClick={() => { setSelectedMember(null); setShowForm(true); }}>
                    <Plus className="w-4 h-4" /> Nuevo Miembro
                </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o cargo..."
                        className="form-input pl-10 h-11"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary h-11 px-4">Filtrar</button>
                    <button className="btn-secondary h-11 px-4">Exportar</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredTeam.map((member) => (
                    <div key={member.id} className="glass-card p-6 flex flex-col group relative">
                        <button
                            className="absolute top-4 right-4 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity btn-ghost"
                            onClick={() => { setSelectedMember(member); setShowForm(true); }}
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-electric-500 to-gold-500 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-primary/20">
                                {member.name.split(' ').map((n) => n[0]).join('')}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-foreground truncate">{member.name}</h3>
                                <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Mail className="w-3.5 h-3.5" />
                                {member.email}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Phone className="w-3.5 h-3.5" />
                                {member.phone || 'Sin teléfono'}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <MapPin className="w-3.5 h-3.5" />
                                {member.country || 'Sin país'}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock3 className="w-3.5 h-3.5" />
                                {member.schedule || 'Sin horario'} {member.timezone ? `· ${member.timezone}` : ''}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <CalendarDays className="w-3.5 h-3.5" />
                                {member.birthday ? formatDate(member.birthday) : 'Sin cumpleaños'}
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between">
                            <span className="badge badge-neutral">{member.specialty || 'General'}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-success">
                                Activo
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => { setShowForm(false); setSelectedMember(null); }}>
                    <div className="glass-card p-6 w-full max-w-md mx-4 relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-foreground">{selectedMember ? 'Editar Miembro' : 'Nuevo Miembro'}</h2>
                            <button onClick={() => { setShowForm(false); setSelectedMember(null); }} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
                        </div>

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div>
                                <label className="form-label">Nombre Completo</label>
                                <input name="name" type="text" className="form-input" placeholder="Nombre y apellido" required defaultValue={selectedMember?.name} />
                            </div>
                            <div>
                                <label className="form-label">Cargo / Rol</label>
                                <select name="role" className="form-input" required defaultValue={selectedMember?.role}>
                                    <option value="ADMIN">ADMIN</option>
                                    <option value="GERENCIA">GERENCIA</option>
                                    <option value="CONTABILIDAD">CONTABILIDAD</option>
                                    <option value="FINANZAS">FINANZAS</option>
                                    <option value="PROYECTOS">PROYECTOS</option>
                                    <option value="MARKETING">MARKETING</option>
                                    <option value="COMERCIAL">COMERCIAL</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Especialidad</label>
                                    <input name="specialty" type="text" className="form-input" placeholder="Ej: Branding" defaultValue={selectedMember?.specialty || ''} />
                                </div>
                                <div>
                                    <label className="form-label">Teléfono</label>
                                    <input name="phone" type="text" className="form-input" placeholder="+51 999 999 999" defaultValue={selectedMember?.phone || ''} />
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Correo Corporativo</label>
                                <input name="email" type="email" className="form-input" placeholder="usuario@fibra.studio" required defaultValue={selectedMember?.email} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">País</label>
                                    <input name="country" type="text" className="form-input" placeholder="Perú" defaultValue={selectedMember?.country || ''} />
                                </div>
                                <div>
                                    <label className="form-label">Cumpleaños</label>
                                    <input name="birthday" type="date" className="form-input" defaultValue={toInputDate(selectedMember?.birthday)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Zona Horaria</label>
                                    <input name="timezone" type="text" className="form-input" placeholder="America/Lima" defaultValue={selectedMember?.timezone || ''} />
                                </div>
                                <div>
                                    <label className="form-label">Horario</label>
                                    <input name="schedule" type="text" className="form-input" placeholder="Lun-Vie 9:00-18:00" defaultValue={selectedMember?.schedule || ''} />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" className="flex-1 btn-secondary" onClick={() => { setShowForm(false); setSelectedMember(null); }}>Cancelar</button>
                                <button type="submit" className="flex-1 btn-primary justify-center" disabled={loading}>
                                    {loading ? 'Guardando...' : (selectedMember ? 'Guardar Cambios' : 'Agregar Miembro')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
