'use client'

import { useState, useTransition } from 'react'
import { FileText, Download, BarChart3, PieChart, Target, Megaphone, Send } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import { emailReportByBrevo, generateReport } from '@/lib/actions/reports'

const reportTypes = [
    { id: 'financial', label: 'Financiero', description: 'P&L y flujo de caja', icon: BarChart3, color: 'text-[hsl(var(--success-text))]', bg: 'bg-emerald-500/10' },
    { id: 'projects', label: 'Proyectos', description: 'Estatus y carga operativa', icon: PieChart, color: 'text-[hsl(var(--info-text))]', bg: 'bg-electric-500/10' },
    { id: 'commercial', label: 'Comercial', description: 'Pipeline y conversiones', icon: Target, color: 'text-[hsl(var(--warning-text))]', bg: 'bg-gold-500/10' },
    { id: 'marketing', label: 'Marketing', description: 'Fuentes y efectividad', icon: Megaphone, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
] as const

interface ReportItem {
    id: string
    name: string
    type: string
    format: string
    status: string
    periodLabel: string | null
    createdAt: Date | string
}

export function ReportesClient({ initialReports }: { initialReports: ReportItem[] }) {
    const [reports, setReports] = useState(initialReports)
    const [type, setType] = useState<(typeof reportTypes)[number]['id']>('financial')
    const [period, setPeriod] = useState<'this_month' | 'last_month' | 'last_quarter'>('this_month')
    const [format, setFormat] = useState<'JSON' | 'CSV'>('JSON')
    const [emailTo, setEmailTo] = useState('')
    const [isPending, startTransition] = useTransition()

    const handleGenerate = () => {
        startTransition(async () => {
            const result = await generateReport({ type, period, format })
            if (result.success && result.report) {
                setReports((state) => [
                    {
                        id: result.report.id,
                        name: result.report.name,
                        type: result.report.type,
                        format: result.report.format,
                        status: result.report.status,
                        periodLabel: result.report.periodLabel,
                        createdAt: result.report.createdAt
                    },
                    ...state
                ])
            }
        })
    }

    const handleEmailReport = (reportId: string) => {
        startTransition(async () => {
            const result = await emailReportByBrevo({ reportId, to: emailTo || undefined })
            if (!result.success) {
                alert(result.error || 'No se pudo enviar por correo')
                return
            }
            alert('Reporte enviado por correo con Brevo')
        })
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Reportes e Inteligencia</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Generación, historial y descarga de reportes</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="section-title text-base">Generar Reporte</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {reportTypes.map((rt) => {
                            const Icon = rt.icon
                            return (
                                <button
                                    key={rt.id}
                                    type="button"
                                    onClick={() => setType(rt.id)}
                                    className={cn(
                                        'glass-card p-5 border transition-all text-left',
                                        type === rt.id ? 'border-primary/50 bg-primary/5' : 'border-border/40 hover:border-primary/40'
                                    )}
                                >
                                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', rt.bg)}>
                                        <Icon className={cn('w-5 h-5', rt.color)} />
                                    </div>
                                    <h3 className="text-sm font-bold">{rt.label}</h3>
                                    <p className="text-xs text-muted-foreground mt-2">{rt.description}</p>
                                </button>
                            )
                        })}
                    </div>

                    <div className="glass-card p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="form-label">Periodo</label>
                                <select className="form-input" value={period} onChange={(e) => setPeriod(e.target.value as any)}>
                                    <option value="this_month">Este mes</option>
                                    <option value="last_month">Mes pasado</option>
                                    <option value="last_quarter">Último trimestre</option>
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Formato</label>
                                <select className="form-input" value={format} onChange={(e) => setFormat(e.target.value as any)}>
                                    <option value="JSON">JSON</option>
                                    <option value="CSV">CSV</option>
                                </select>
                            </div>
                        </div>

                        <button onClick={handleGenerate} disabled={isPending} className="w-full btn-primary justify-center py-3">
                            {isPending ? 'Generando...' : <span className="flex items-center gap-2"><FileText className="w-5 h-5" /> Generar Reporte</span>}
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="section-title text-base">Historial</h2>
                    <div className="glass-card p-3">
                        <label className="form-label">Enviar reportes a (opcional)</label>
                        <input
                            type="email"
                            value={emailTo}
                            onChange={(e) => setEmailTo(e.target.value)}
                            className="form-input"
                            placeholder="si vacío, se usa tu correo de usuario"
                        />
                    </div>
                    <div className="space-y-3">
                        {reports.map((r) => (
                            <div key={r.id} className="glass-card p-4 border border-border/40">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm font-medium leading-snug">{r.name}</p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            className="text-muted-foreground hover:text-primary transition-colors"
                                            type="button"
                                            onClick={() => handleEmailReport(r.id)}
                                            title="Enviar por correo (Brevo)"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                        <a className="text-muted-foreground hover:text-primary transition-colors" href={`/api/reports/${r.id}/download`}>
                                            <Download className="w-4 h-4" />
                                        </a>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                    <span className="badge badge-neutral text-[10px] uppercase">{r.type}</span>
                                    <span className="badge badge-info text-[10px] uppercase">{r.format}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase">{r.status}</span>
                                    <span className="text-[10px] text-muted-foreground ml-auto">{formatDate(r.createdAt)}</span>
                                </div>
                                {r.periodLabel && (
                                    <p className="text-[11px] text-muted-foreground mt-2">Periodo: {r.periodLabel}</p>
                                )}
                            </div>
                        ))}
                        {reports.length === 0 && (
                            <div className="glass-card p-4 text-sm text-muted-foreground">Aún no hay reportes generados.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
