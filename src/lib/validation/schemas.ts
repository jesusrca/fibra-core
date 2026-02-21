import { LeadStatus, ProjectStatus, TransactionCategory } from '@prisma/client'
import { z } from 'zod'

function normalizedText(minLength: number, requiredMessage: string) {
    return z
        .string()
        .trim()
        .min(minLength, requiredMessage)
        .transform((value) => value.replace(/\s+/g, ' '))
}

export const paginationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().trim().max(120).optional().default(''),
    status: z.string().trim().max(40).optional().default('ALL'),
})

export const projectCreateSchema = z.object({
    name: normalizedText(2, 'El nombre del proyecto es obligatorio'),
    clientId: z.string().trim().min(1, 'Debes seleccionar un cliente'),
    directorId: z.string().trim().min(1, 'Debes seleccionar un director'),
    status: z.nativeEnum(ProjectStatus),
    budget: z.coerce.number().nonnegative('El presupuesto no puede ser negativo'),
    serviceType: normalizedText(2, 'El tipo de servicio es obligatorio'),
    endDate: z.date().optional(),
    startDate: z.date().optional(),
})

export const transactionCreateSchema = z.object({
    category: z.nativeEnum(TransactionCategory),
    subcategory: z.string().trim().max(80).optional(),
    amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
    description: z.string().trim().max(240).optional(),
    date: z.date(),
    projectId: z.string().trim().optional(),
    currency: z
        .string()
        .trim()
        .transform((v) => v.toUpperCase())
        .pipe(z.enum(['PEN', 'USD'])),
    bank: z.string().trim().max(120).optional(),
    invoiceId: z.string().trim().optional(),
    receiptUrl: z.string().trim().url().optional(),
})

export const leadCreateSchema = z.object({
    companyName: z.string().trim().max(140).optional(),
    serviceRequested: z.string().trim().max(140).optional(),
    requirementDetail: z.string().trim().max(5000).optional(),
    estimatedValue: z.coerce.number().nonnegative().default(0),
    currency: z
        .string()
        .trim()
        .transform((v) => v.toUpperCase())
        .pipe(z.enum(['USD', 'PEN']))
        .default('USD'),
    status: z.nativeEnum(LeadStatus).default(LeadStatus.NEW),
    clientId: z.string().trim().optional(),
    selectedContactId: z.string().trim().optional(),
    contactName: z.string().trim().max(140).optional(),
    contactEmail: z.string().trim().email().optional().or(z.literal('')),
})

export const csvTransactionRowSchema = z.object({
    date: z.date(),
    category: z.nativeEnum(TransactionCategory),
    subcategory: z.string().trim().max(80).optional(),
    currency: z
        .string()
        .trim()
        .transform((v) => v.toUpperCase())
        .pipe(z.enum(['PEN', 'USD'])),
    bank: z.string().trim().max(120).optional(),
    amount: z.coerce.number().positive(),
    description: z.string().trim().max(240).optional(),
    invoiceNumber: z.string().trim().max(80).optional(),
    projectName: z.string().trim().max(160).optional(),
})
