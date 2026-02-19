// Mock data for demo mode (Phase 1)

export type Role = 'GERENCIA' | 'CONTABILIDAD' | 'FINANZAS' | 'PROYECTOS' | 'MARKETING' | 'COMERCIAL'

export interface User {
    id: string
    name: string
    email: string
    role: Role
    avatar?: string
    telegramId?: string
}

export interface Transaction {
    id: string
    type: 'income' | 'expense'
    category: string
    amount: number
    description: string
    date: string
    status: 'confirmed' | 'pending' | 'cancelled'
}

export interface Project {
    id: string
    name: string
    client: string
    status: 'planning' | 'active' | 'review' | 'completed' | 'paused'
    progress: number
    budget: number
    spent: number
    deadline: string
    team: string[]
    priority: 'low' | 'medium' | 'high'
}

export interface Task {
    id: string
    projectId: string
    title: string
    assignee: string
    status: 'todo' | 'in_progress' | 'review' | 'done'
    priority: 'low' | 'medium' | 'high'
    dueDate: string
}

export interface Lead {
    id: string
    name: string
    company: string
    email: string
    phone: string
    source: string
    status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'
    value: number
    createdAt: string
}

export interface Campaign {
    id: string
    name: string
    channel: string
    status: 'draft' | 'active' | 'paused' | 'completed'
    budget: number
    spent: number
    reach: number
    clicks: number
    conversions: number
    startDate: string
    endDate: string
}

export interface Notification {
    id: string
    type: string
    message: string
    read: boolean
    createdAt: string
    userId: string
}

// ─── Mock Users ───────────────────────────────────────────────────────────────
export const mockUsers: User[] = [
    { id: '1', name: 'Carlos Mendoza', email: 'carlos@fibra.studio', role: 'GERENCIA' },
    { id: '2', name: 'Ana García', email: 'ana@fibra.studio', role: 'CONTABILIDAD' },
    { id: '3', name: 'Luis Torres', email: 'luis@fibra.studio', role: 'FINANZAS' },
    { id: '4', name: 'María López', email: 'maria@fibra.studio', role: 'PROYECTOS' },
    { id: '5', name: 'Diego Ruiz', email: 'diego@fibra.studio', role: 'MARKETING' },
    { id: '6', name: 'Sofía Vargas', email: 'sofia@fibra.studio', role: 'COMERCIAL' },
]

// ─── Mock Transactions ─────────────────────────────────────────────────────────
export const mockTransactions: Transaction[] = [
    { id: 't1', type: 'income', category: 'Servicios de Branding', amount: 8500, description: 'Proyecto identidad visual Nexo Corp', date: '2026-02-15', status: 'confirmed' },
    { id: 't2', type: 'income', category: 'Consultoría', amount: 3200, description: 'Consultoría estrategia de marca Q1', date: '2026-02-12', status: 'confirmed' },
    { id: 't3', type: 'expense', category: 'Software & Herramientas', amount: 890, description: 'Adobe Creative Cloud anual', date: '2026-02-10', status: 'confirmed' },
    { id: 't4', type: 'expense', category: 'Nómina', amount: 12000, description: 'Nómina febrero 2026', date: '2026-02-01', status: 'confirmed' },
    { id: 't5', type: 'income', category: 'Servicios de Branding', amount: 6800, description: 'Rediseño marca Alquimia Foods', date: '2026-01-28', status: 'confirmed' },
    { id: 't6', type: 'expense', category: 'Marketing', amount: 1500, description: 'Pauta publicitaria LinkedIn', date: '2026-01-25', status: 'confirmed' },
    { id: 't7', type: 'income', category: 'Diseño Web', amount: 4200, description: 'Sitio web Pandilla Restaurant', date: '2026-01-20', status: 'pending' },
    { id: 't8', type: 'expense', category: 'Oficina', amount: 2200, description: 'Alquiler oficina febrero', date: '2026-02-01', status: 'confirmed' },
]

// ─── Mock Projects ─────────────────────────────────────────────────────────────
export const mockProjects: Project[] = [
    { id: 'p1', name: 'Identidad Visual Nexo Corp', client: 'Nexo Corp', status: 'active', progress: 65, budget: 12000, spent: 7800, deadline: '2026-03-15', team: ['María López', 'Diego Ruiz'], priority: 'high' },
    { id: 'p2', name: 'Estrategia de Marca Alquimia', client: 'Alquimia Foods', status: 'review', progress: 90, budget: 8500, spent: 7650, deadline: '2026-02-28', team: ['Carlos Mendoza', 'Sofía Vargas'], priority: 'high' },
    { id: 'p3', name: 'Sitio Web Pandilla', client: 'Pandilla Restaurant', status: 'active', progress: 40, budget: 6000, spent: 2400, deadline: '2026-04-01', team: ['María López'], priority: 'medium' },
    { id: 'p4', name: 'Campaña Social Media Q1', client: 'Nexo Corp', status: 'active', progress: 55, budget: 4500, spent: 2475, deadline: '2026-03-31', team: ['Diego Ruiz'], priority: 'medium' },
    { id: 'p5', name: 'Manual de Marca Urbano', client: 'Urbano Inmobiliaria', status: 'planning', progress: 10, budget: 9000, spent: 900, deadline: '2026-05-15', team: ['Carlos Mendoza', 'María López'], priority: 'low' },
    { id: 'p6', name: 'Packaging Café Origen', client: 'Café Origen', status: 'completed', progress: 100, budget: 5500, spent: 5200, deadline: '2026-01-31', team: ['Diego Ruiz', 'Sofía Vargas'], priority: 'medium' },
]

// ─── Mock Tasks ────────────────────────────────────────────────────────────────
export const mockTasks: Task[] = [
    { id: 'tk1', projectId: 'p1', title: 'Investigación de mercado y competencia', assignee: 'María López', status: 'done', priority: 'high', dueDate: '2026-02-10' },
    { id: 'tk2', projectId: 'p1', title: 'Propuesta de paleta de colores', assignee: 'Diego Ruiz', status: 'in_progress', priority: 'high', dueDate: '2026-02-20' },
    { id: 'tk3', projectId: 'p1', title: 'Diseño de logotipo (3 propuestas)', assignee: 'María López', status: 'in_progress', priority: 'high', dueDate: '2026-02-25' },
    { id: 'tk4', projectId: 'p1', title: 'Presentación al cliente', assignee: 'Carlos Mendoza', status: 'todo', priority: 'medium', dueDate: '2026-03-05' },
    { id: 'tk5', projectId: 'p2', title: 'Revisión final manual de marca', assignee: 'Carlos Mendoza', status: 'review', priority: 'high', dueDate: '2026-02-22' },
    { id: 'tk6', projectId: 'p3', title: 'Wireframes y arquitectura de información', assignee: 'María López', status: 'done', priority: 'medium', dueDate: '2026-02-15' },
    { id: 'tk7', projectId: 'p3', title: 'Diseño UI homepage', assignee: 'María López', status: 'in_progress', priority: 'medium', dueDate: '2026-03-01' },
    { id: 'tk8', projectId: 'p4', title: 'Calendario editorial febrero', assignee: 'Diego Ruiz', status: 'done', priority: 'medium', dueDate: '2026-02-01' },
]

// ─── Mock Leads ────────────────────────────────────────────────────────────────
export const mockLeads: Lead[] = [
    { id: 'l1', name: 'Roberto Jiménez', company: 'TechStart SAS', email: 'roberto@techstart.co', phone: '+57 300 123 4567', source: 'LinkedIn', status: 'qualified', value: 15000, createdAt: '2026-02-10' },
    { id: 'l2', name: 'Patricia Morales', company: 'Grupo Éxito', email: 'pmorales@exito.com', phone: '+57 310 987 6543', source: 'Referido', status: 'proposal', value: 28000, createdAt: '2026-02-05' },
    { id: 'l3', name: 'Andrés Castillo', company: 'Castillo & Asociados', email: 'acastillo@cya.co', phone: '+57 320 456 7890', source: 'Web', status: 'contacted', value: 8500, createdAt: '2026-02-14' },
    { id: 'l4', name: 'Valentina Cruz', company: 'Moda Latina', email: 'vcruz@modalatina.com', phone: '+57 315 234 5678', source: 'Instagram', status: 'new', value: 12000, createdAt: '2026-02-17' },
    { id: 'l5', name: 'Fernando Ospina', company: 'Ospina Construcciones', email: 'fospina@ospina.co', phone: '+57 305 678 9012', source: 'Referido', status: 'won', value: 22000, createdAt: '2026-01-20' },
    { id: 'l6', name: 'Claudia Herrera', company: 'Herrera Eventos', email: 'claudia@herreraev.com', phone: '+57 318 345 6789', source: 'Web', status: 'lost', value: 6000, createdAt: '2026-01-15' },
]

// ─── Mock Campaigns ────────────────────────────────────────────────────────────
export const mockCampaigns: Campaign[] = [
    { id: 'c1', name: 'Branding Q1 2026 - LinkedIn', channel: 'LinkedIn', status: 'active', budget: 2000, spent: 1200, reach: 45000, clicks: 1890, conversions: 23, startDate: '2026-01-01', endDate: '2026-03-31' },
    { id: 'c2', name: 'Portafolio Instagram', channel: 'Instagram', status: 'active', budget: 1500, spent: 890, reach: 82000, clicks: 3200, conversions: 45, startDate: '2026-01-15', endDate: '2026-03-15' },
    { id: 'c3', name: 'Email Marketing Leads', channel: 'Email', status: 'active', budget: 500, spent: 280, reach: 1200, clicks: 340, conversions: 18, startDate: '2026-02-01', endDate: '2026-02-28' },
    { id: 'c4', name: 'Google Ads Branding', channel: 'Google Ads', status: 'paused', budget: 3000, spent: 1650, reach: 120000, clicks: 2800, conversions: 31, startDate: '2026-01-01', endDate: '2026-03-31' },
]

// ─── Mock Notifications ────────────────────────────────────────────────────────
export const mockNotifications: Notification[] = [
    { id: 'n1', type: 'task_due', message: 'Tarea "Propuesta de paleta de colores" vence mañana', read: false, createdAt: '2026-02-18T10:00:00Z', userId: '1' },
    { id: 'n2', type: 'new_lead', message: 'Nuevo lead: Valentina Cruz de Moda Latina ($12,000)', read: false, createdAt: '2026-02-17T15:30:00Z', userId: '1' },
    { id: 'n3', type: 'report_ready', message: 'Reporte financiero de enero está listo para descargar', read: false, createdAt: '2026-02-15T09:00:00Z', userId: '1' },
    { id: 'n4', type: 'project_update', message: 'Proyecto "Alquimia" pasó a revisión — 90% completado', read: true, createdAt: '2026-02-14T14:00:00Z', userId: '1' },
    { id: 'n5', type: 'invoice_overdue', message: 'Factura #INV-2026-007 lleva 5 días vencida ($4,200)', read: true, createdAt: '2026-02-13T08:00:00Z', userId: '1' },
]

// ─── Monthly Revenue (for charts) ─────────────────────────────────────────────
export const monthlyRevenue = [
    { month: 'Sep', ingresos: 28000, gastos: 18000 },
    { month: 'Oct', ingresos: 32000, gastos: 19500 },
    { month: 'Nov', ingresos: 29500, gastos: 17800 },
    { month: 'Dic', ingresos: 38000, gastos: 22000 },
    { month: 'Ene', ingresos: 35000, gastos: 20500 },
    { month: 'Feb', ingresos: 22700, gastos: 16590 },
]

export const COLORS = ['#0EA5E9', '#F5C842', '#8B5CF6', '#10B981']

export const leadFunnelData = [
    { stage: 'Nuevos', count: 1 },
    { stage: 'Contactados', count: 1 },
    { stage: 'Calificados', count: 1 },
    { stage: 'Propuesta', count: 1 },
    { stage: 'Ganados', count: 1 },
]

// ─── Fixed Costs & Payroll ───────────────────────────────────────────────────
export interface FixedCost {
    id: string
    name: string
    amount: number
    category: 'alquiler' | 'servicios' | 'suscripciones' | 'otros'
    dueDate: string
}

export interface Payroll {
    id: string
    userId: string
    userName: string
    salary: number
    bonus: number
    status: 'paid' | 'pending'
    paymentDate: string
}

export const mockFixedCosts: FixedCost[] = [
    { id: 'fc1', name: 'Alquiler Oficina Miraflores', amount: 1500, category: 'alquiler', dueDate: '2026-03-05' },
    { id: 'fc2', name: 'Internet y Telefonía', amount: 120, category: 'servicios', dueDate: '2026-03-10' },
    { id: 'fc3', name: 'Adobe Creative Cloud', amount: 85, category: 'suscripciones', dueDate: '2026-03-15' },
    { id: 'fc4', name: 'AWS Hosting', amount: 45, category: 'suscripciones', dueDate: '2026-03-20' },
]

export const mockPayroll: Payroll[] = [
    { id: 'pr1', userId: 'u1', userName: 'Jesús Cerrón', salary: 3500, bonus: 0, status: 'pending', paymentDate: '2026-02-28' },
    { id: 'pr2', userId: 'u2', userName: 'María López', salary: 2800, bonus: 200, status: 'pending', paymentDate: '2026-02-28' },
    { id: 'pr3', userId: 'u3', userName: 'Carlos Mendoza', salary: 2500, bonus: 150, status: 'pending', paymentDate: '2026-02-28' },
    { id: 'pr4', userId: 'u4', userName: 'Ana García', salary: 2200, bonus: 0, status: 'pending', paymentDate: '2026-02-28' },
]
