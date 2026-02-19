'use client'

import { useState } from 'react'
import { Building2, Search } from 'lucide-react'
import { createLead, updateLead } from '@/lib/actions/crm'
import { LeadStatus, Client, Lead, Contact } from '@prisma/client'

type ClientOption = Pick<Client, 'id' | 'name'>
type ContactOption = Pick<Contact, 'id' | 'firstName' | 'lastName' | 'email'>
type ContactSelectOption = Pick<Contact, 'id' | 'firstName' | 'lastName' | 'email' | 'clientId'>

interface LeadFormProps {
    onClose: () => void
    clients: Client[]
    contacts: ContactSelectOption[]
    initialData?: Lead & { client?: ClientOption | null; contact?: ContactOption | null }
}

export function LeadForm({ onClose, clients, contacts, initialData }: LeadFormProps) {
    const initialSelectedContact: ContactSelectOption | null = initialData?.contact
        ? contacts.find((contact) => contact.id === initialData.contact?.id) || {
            ...initialData.contact,
            clientId: initialData.client?.id || ''
        }
        : null

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState(initialData?.companyName || '')
    const [selectedClient, setSelectedClient] = useState<ClientOption | null>(initialData?.client || null)
    const [contactSearch, setContactSearch] = useState('')
    const [selectedContact, setSelectedContact] = useState<ContactSelectOption | null>(initialSelectedContact)

    const isEditing = !!initialData

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    const availableContacts = selectedClient
        ? contacts.filter((c) => c.clientId === selectedClient.id)
        : contacts
    const filteredContacts = availableContacts.filter((c) => {
        const fullName = `${c.firstName} ${c.lastName}`.toLowerCase()
        const query = contactSearch.toLowerCase()
        return fullName.includes(query) || c.email.toLowerCase().includes(query)
    }).slice(0, 8)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        if (selectedClient) {
            formData.set('clientId', selectedClient.id)
            formData.set('companyName', selectedClient.name)
        }

        try {
            if (isEditing) {
                await updateLead(initialData.id, formData)
            } else {
                await createLead(formData)
            }
            onClose()
        } catch (err: any) {
            setError(err.message || `Ocurrió un error al ${isEditing ? 'actualizar' : 'crear'} el lead`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in" onClick={onClose}>
            <div className="modal-form-card p-6 w-full max-w-lg mx-4 overflow-visible" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-foreground">{isEditing ? 'Editar Lead' : 'Nuevo Lead / Cotización'}</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5 relative">
                        <label className="form-label">Empresa / Cliente</label>
                        {!selectedClient ? (
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    name="companyName"
                                    type="text"
                                    className="form-input pl-9"
                                    placeholder="Buscar o escribir nueva empresa..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    required
                                    autoComplete="off"
                                />
                                {searchTerm && filteredClients.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-[70] py-1 max-h-48 overflow-y-auto custom-scrollbar">
                                        {filteredClients.map(c => (
                                            <button
                                                key={c.id}
                                                type="button"
                                            onClick={() => {
                                                setSelectedClient(c)
                                                setSearchTerm(c.name)
                                                if (selectedContact && selectedContact.clientId !== c.id) {
                                                    setSelectedContact(null)
                                                }
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2"
                                        >
                                                <Building2 className="w-3 h-3" />
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
                                <div className="flex items-center gap-2 text-primary">
                                    <Building2 className="w-4 h-4" />
                                    <span className="text-sm font-semibold">{selectedClient.name}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedClient(null)
                                        setSelectedContact(null)
                                    }}
                                    className="text-muted-foreground hover:text-foreground text-xs font-bold"
                                >
                                    CAMBIAR
                                </button>
                            </div>
                        )}
                        <input type="hidden" name="clientId" value={selectedClient?.id || ''} />
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <>
                            <div className="col-span-2">
                                <label className="form-label">Seleccionar contacto existente (opcional)</label>
                                {!selectedContact ? (
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            value={contactSearch}
                                            onChange={(e) => setContactSearch(e.target.value)}
                                            className="form-input pl-9"
                                            placeholder={selectedClient ? 'Buscar por nombre o email...' : 'Buscar por nombre o email...'}
                                        />
                                        {contactSearch && filteredContacts.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-[70] py-1 max-h-48 overflow-y-auto custom-scrollbar">
                                                {filteredContacts.map((contact) => (
                                                    <button
                                                        key={contact.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedContact(contact)
                                                            setContactSearch('')
                                                            if (!selectedClient || selectedClient.id !== contact.clientId) {
                                                                const relatedClient = clients.find((client) => client.id === contact.clientId)
                                                                if (relatedClient) {
                                                                    setSelectedClient({ id: relatedClient.id, name: relatedClient.name })
                                                                    setSearchTerm(relatedClient.name)
                                                                }
                                                            }
                                                        }}
                                                        className="w-full px-4 py-2 text-left text-sm hover:bg-primary/10 hover:text-primary transition-colors"
                                                    >
                                                        <div className="font-medium">{contact.firstName} {contact.lastName}</div>
                                                        <div className="text-xs opacity-80">{contact.email}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
                                        <div className="text-sm">
                                            <p className="font-semibold text-primary">{selectedContact.firstName} {selectedContact.lastName}</p>
                                            <p className="text-xs text-muted-foreground">{selectedContact.email}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedContact(null)}
                                            className="text-muted-foreground hover:text-foreground text-xs font-bold"
                                        >
                                            CAMBIAR
                                        </button>
                                    </div>
                                )}
                                <input type="hidden" name="contactId" value={selectedContact?.id || ''} />
                            </div>
                            {!selectedContact && !isEditing && (
                                <>
                                    <div className="col-span-2">
                                        <label className="form-label">Persona de Contacto (nuevo)</label>
                                        <input name="contactName" type="text" className="form-input" placeholder="Nombre completo" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="form-label">Correo de Contacto</label>
                                        <input name="contactEmail" type="email" className="form-input" placeholder="ejemplo@correo.com" />
                                    </div>
                                </>
                            )}
                            {!selectedContact && isEditing && initialData?.contact && (
                                <p className="col-span-2 text-[11px] text-muted-foreground">
                                    Este lead quedará sin contacto asociado si guardas así.
                                </p>
                            )}
                        </>
                        <div className="col-span-2">
                            <label className="form-label">Servicio Solicitado</label>
                            <input
                                name="serviceRequested"
                                type="text"
                                className="form-input"
                                placeholder="Ej: Branding, Web, etc."
                                defaultValue={initialData?.serviceRequested || ''}
                                required
                            />
                        </div>
                        <div>
                            <label className="form-label">Valor Estimado (USD)</label>
                            <input
                                name="estimatedValue"
                                type="number"
                                step="0.01"
                                className="form-input"
                                placeholder="0.00"
                                defaultValue={initialData?.estimatedValue || ''}
                            />
                        </div>
                        <div>
                            <label className="form-label">Estado</label>
                            <select name="status" className="form-input" defaultValue={initialData?.status || LeadStatus.NEW}>
                                <option value={LeadStatus.NEW}>Nuevo Lead</option>
                                <option value={LeadStatus.CONTACTED}>Contactado</option>
                                <option value={LeadStatus.QUALIFIED}>Calificado</option>
                                <option value={LeadStatus.PROPOSAL}>Propuesta</option>
                                <option value={LeadStatus.WON}>Ganado</option>
                                <option value={LeadStatus.LOST}>Perdido</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="form-label">Requerimiento / Nota</label>
                            <textarea
                                name="requirementDetail"
                                className="form-input min-h-[80px]"
                                placeholder="Describe lo que el cliente necesita..."
                                defaultValue={initialData?.requirementDetail || ''}
                            ></textarea>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" className="flex-1 btn-secondary" onClick={onClose} disabled={loading}>
                            Cancelar
                        </button>
                        <button type="submit" className="flex-1 btn-primary justify-center" disabled={loading}>
                            {loading ? (isEditing ? 'Actualizando...' : 'Creando...') : (isEditing ? 'Guardar Cambios' : 'Crear Lead')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
