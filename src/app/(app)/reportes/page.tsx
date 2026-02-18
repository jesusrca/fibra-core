'use client'

import { useState } from 'react'
import { FileText, Download, Calendar, Filter, BarChart3, PieChart, ArrowRight, Share2, Mail, ExternalLink } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'

const reportTypes = [
    { id: 'financial', label: 'Financiero Mensual', description: 'P&L, Flujo de caja e impuestos del período.', icon: BarChart3, color: 'text-[hsl(var(--success-text))]', bg: 'bg-emerald-500/10' },
    { id: 'projects', label: 'Estatus de Proyectos', description: 'Avance, hitos y carga de trabajo del equipo.', icon: PieChart, color: 'text-[hsl(var(--info-text))]', bg: 'bg-electric-500/10' },
    { id: 'commercial', label: 'Pipeline Comercial', description: 'Leads, conversiones y proyecciones de venta.', icon: Target, color: 'text-[hsl(var(--warning-text))]', bg: 'bg-gold-500/10' },
    { id: 'marketing', label: 'Efectividad de Campañas', description: 'Métricas de alcance, clics y ROI de marketing.', icon: Megaphone, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
]

import { Target, Megaphone } from 'lucide-react'

const pastReports = [
    { id: 'rep1', name: 'Reporte Mensual — Enero 2026', type: 'Financiero', date: '2026-02-01', size: '2.4 MB', status: 'ready' },
    { id: 'rep2', name: 'Resumen Trimestral Proyectos Q4', type: 'Proyectos', date: '2026-01-15', size: '4.1 MB', status: 'ready' },
    { id: 'rep3', name: 'Auditoría de Marketing Anual', type: 'Marketing', date: '2025-12-28', size: '8.7 MB', status: 'ready' },
]

export default function ReportesPage() {
    const [generating, setGenerating] = useState(false)

    const handleGenerate = () => {
        setGenerating(true)
        setTimeout(() => setGenerating(false), 2000)
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Reportes e Inteligencia</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Genera y automatiza informes estratégicos</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Step 1: Select Type */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="section-title text-base flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">1</span>
                        Seleccionar Tipo de Reporte
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {reportTypes.map((type) => {
                            const Icon = type.icon
                            return (
                                <div key={type.id} className="glass-card p-5 border border-border/40 hover:border-primary/40 transition-all cursor-pointer group">
                                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', type.bg)}>
                                        <Icon className={cn('w-5 h-5', type.color)} />
                                    </div>
                                    <h3 className="text-sm font-bold group-hover:text-primary transition-colors">{type.label}</h3>
                                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{type.description}</p>
                                </div>
                            )
                        })}
                    </div>

                    <div className="pt-6 space-y-4">
                        <h2 className="section-title text-base flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">2</span>
                            Configurar y Generar
                        </h2>
                        <div className="glass-card p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="form-label">Periodo</label>
                                    <select className="form-input">
                                        <option>Este Mes (Febrero 2026)</option>
                                        <option>Mes Pasado (Enero 2026)</option>
                                        <option>Último Trimestre</option>
                                        <option>Personalizado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Formato</label>
                                    <select className="form-input">
                                        <option>PDF Profesional</option>
                                        <option>Excel (XLSX)</option>
                                        <option>Dashboard Interactivo</option>
                                    </select>
                                </div>
                                <div className="col-span-1 sm:col-span-2">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input type="checkbox" className="rounded border-border bg-secondary text-primary focus:ring-primary w-4 h-4 transition-all" defaultChecked />
                                        <span className="text-sm text-foreground font-medium group-hover:text-primary transition-colors">Enviar automáticamente por Email a Gerencia</span>
                                    </label>
                                </div>
                                <div className="col-span-1 sm:col-span-2">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input type="checkbox" className="rounded border-border bg-secondary text-primary focus:ring-primary w-4 h-4 transition-all" defaultChecked />
                                        <span className="text-sm text-foreground font-medium group-hover:text-primary transition-colors">Sincronizar copia en Google Drive</span>
                                    </label>
                                </div>
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="w-full btn-primary justify-center py-3 text-base shadow-xl shadow-primary/20"
                            >
                                {generating ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                        Generando...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <FileText className="w-5 h-5" />
                                        Generar y Enviar Reporte
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* History / Downloads */}
                <div className="space-y-4">
                    <h2 className="section-title text-base flex items-center gap-2">
                        <Download className="w-4 h-4 text-primary" />
                        Reportes Recientes
                    </h2>
                    <div className="space-y-3">
                        {pastReports.map((report) => (
                            <div key={report.id} className="glass-card p-4 border border-border/40 hover:bg-secondary/20 transition-all cursor-pointer">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm font-medium leading-snug">{report.name}</p>
                                    <button className="text-muted-foreground hover:text-primary transition-colors">
                                        <Download className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-3 mt-3">
                                    <span className="badge badge-neutral text-[10px]">{report.type}</span>
                                    <span className="text-[10px] text-muted-foreground">{formatDate(report.date)}</span>
                                    <span className="text-[10px] text-muted-foreground ml-auto">{report.size}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/40">
                                    <button className="text-[10px] text-primary flex items-center gap-1 hover:underline">
                                        <Mail className="w-3 h-3" /> Reenviar
                                    </button>
                                    <button className="text-[10px] text-primary flex items-center gap-1 hover:underline ml-auto">
                                        <ExternalLink className="w-3 h-3" /> Ver en Drive
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="glass-card p-5 bg-primary/5 border-primary/20">
                        <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                            <Share2 className="w-4 h-4" /> Integración n8n
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Tus reportes pueden ser procesados automáticamente por flujos de n8n para análisis externo o integración con otras plataformas.
                        </p>
                        <button className="text-xs font-semibold text-primary mt-3 hover:underline">
                            Configurar webhooks →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
