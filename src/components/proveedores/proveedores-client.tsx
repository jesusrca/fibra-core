'use client'

import { Truck, Search, Plus, Globe, Phone, Mail, MapPin, MoreHorizontal, Star, ShieldCheck, Edit2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { createSupplier, updateSupplier, deleteSupplier } from '@/lib/actions/suppliers'

interface ProveedoresClientProps {
    initialSuppliers: any[]
}

export function ProveedoresClient({ initialSuppliers }: ProveedoresClientProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null)
    const [loading, setLoading] = useState(false)

    const filteredSuppliers = initialSuppliers.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.city.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        const data = {
            name: formData.get('name') as string,
            category: formData.get('category') as string,
            city: formData.get('city') as string,
            rating: parseFloat(formData.get('rating') as string || '0'),
            contactName: formData.get('contactName') as string,
        }

        if (selectedSupplier) {
            await updateSupplier(selectedSupplier.id, data)
        } else {
            await createSupplier(data)
        }

        setLoading(false)
        setShowForm(false)
        setSelectedSupplier(null)
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold text-foreground font-display">Directorio de Proveedores</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Aliados estratégicos y proveedores de servicios</p>
                </div>
                <button className="btn-primary" onClick={() => { setSelectedSupplier(null); setShowForm(true); }}>
                    <Plus className="w-4 h-4" /> Nuevo Proveedor
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, categoría o ciudad..."
                        className="form-input pl-10 h-11"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <button className="flex-1 btn-secondary h-11">Categorías</button>
                    <button className="flex-1 btn-secondary h-11">Ubicación</button>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Empresa</th>
                                <th>Categoría</th>
                                <th>Ubicación</th>
                                <th>Calificación</th>
                                <th>Contacto</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSuppliers.map((p) => (
                                <tr key={p.id} className="group hover:bg-secondary/20 transition-colors">
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                                <Truck className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-foreground">{p.name}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                                    <span className="text-[10px] text-emerald-400 uppercase font-bold">Verificado</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span className="badge badge-neutral">{p.category}</span></td>
                                    <td>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {p.city}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-1">
                                            <Star className="w-3.5 h-3.5 text-gold-500 fill-gold-500" />
                                            <span className="text-sm font-medium">{p.rating}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex flex-col gap-1">
                                            <p className="text-xs font-medium text-foreground">{p.contactName || 'Sin contacto'}</p>
                                        </div>
                                    </td>
                                    <td className="text-right">
                                        <button
                                            className="btn-ghost p-1.5"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedSupplier(p);
                                                setShowForm(true);
                                            }}
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredSuppliers.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                                        No se encontraron proveedores que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => { setShowForm(false); setSelectedSupplier(null); }}>
                    <div className="glass-card p-6 w-full max-w-md mx-4 relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-foreground">{selectedSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
                            <button onClick={() => { setShowForm(false); setSelectedSupplier(null); }} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
                        </div>

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div>
                                <label className="form-label">Nombre de la Empresa</label>
                                <input name="name" type="text" className="form-input" placeholder="Nombre comercial" required defaultValue={selectedSupplier?.name} />
                            </div>
                            <div>
                                <label className="form-label">Categoría</label>
                                <select name="category" className="form-input" defaultValue={selectedSupplier?.category}>
                                    <option value="Imprenta">Imprenta</option>
                                    <option value="Logística">Logística</option>
                                    <option value="Infraestructura / IT">Infraestructura / IT</option>
                                    <option value="Marketing / Medios">Marketing / Medios</option>
                                    <option value="Consultoría">Consultoría</option>
                                    <option value="Otros">Otros</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Ciudad / País</label>
                                    <input name="city" type="text" className="form-input" placeholder="Ej: Lima, Perú" defaultValue={selectedSupplier?.city} />
                                </div>
                                <div>
                                    <label className="form-label">Calificación</label>
                                    <input name="rating" type="number" step="0.1" max="5" min="0" className="form-input" placeholder="5.0" defaultValue={selectedSupplier?.rating} />
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Contacto Principal</label>
                                <input name="contactName" type="text" className="form-input" placeholder="Nombre completo" defaultValue={selectedSupplier?.contactName} />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" className="flex-1 btn-secondary" onClick={() => { setShowForm(false); setSelectedSupplier(null); }}>Cancelar</button>
                                <button type="submit" className="flex-1 btn-primary justify-center" disabled={loading}>
                                    {loading ? 'Guardando...' : (selectedSupplier ? 'Guardar Cambios' : 'Registrar Proveedor')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
