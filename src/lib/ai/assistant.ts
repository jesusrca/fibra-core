import { openai } from '@ai-sdk/openai'
import { generateText, stepCountIs, tool } from 'ai'
import { LeadStatus, Role } from '@prisma/client'
import { z } from 'zod'
import {
    createClientByAI,
    createContactByAI,
    createLeadByAI,
    updateLeadStatusByAI,
    createProjectByAI,
    createTaskByAI,
    getClients,
    getContacts,
    getFinancialSummary,
    getLeads,
    getProjects,
    getSuppliers,
    getUsers
} from '@/lib/ai/tools'

type AssistantUserContext = {
    id: string
    role: Role
}

function getSystemPrompt() {
    const now = new Date()
    const todayIso = now.toISOString().slice(0, 10)
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowIso = tomorrow.toISOString().slice(0, 10)

    return `You are Fibra Bot, an AI assistant for the Fibra branding studio management platform.
Current date reference: today is ${todayIso}. Tomorrow is ${tomorrowIso}.

Guidelines:
- Always answer in Spanish.
- Keep responses clean and concise.
- Use tools for real data queries and write operations.
- For company queries, use getClients and confirm existence even if it has zero active projects.
- For contact queries, use getContacts to return real email/phone data.
- Client creation requires only name. Email can be completed later.
- For write operations, do not claim success unless tool returns success:true.
- Convert relative dates like "hoy" or "mañana" using the date reference above.
- Use date format DD/MM/YYYY in final responses.
- Respect the original currency from data (USD => $, PEN => S/). Never change currency.
- If mentioning a project, include its URL path in plain text: /proyectos/{projectId}.
- If creating multiple clients in one request, use createClientsBulk and include each edit URL:
  /comercial?tab=companies&editClientId={clientId}
`
}

export async function generateFibraAssistantReply(user: AssistantUserContext, prompt: string) {
    const result = await generateText({
        model: openai('gpt-4o'),
        system: getSystemPrompt(),
        prompt,
        tools: {
            getProjects: tool({
                description: 'Get projects by status or query',
                inputSchema: z.object({
                    status: z.enum(['ACTIVE', 'PLANNING', 'COMPLETED', 'ON_HOLD', 'REVIEW']).optional(),
                    query: z.string().optional()
                }),
                execute: async ({ status, query }) => getProjects({ status, query })
            }),
            getLeads: tool({
                description: 'Get leads by status or query',
                inputSchema: z.object({
                    status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']).optional(),
                    query: z.string().optional()
                }),
                execute: async ({ status, query }) => getLeads({ status: status as LeadStatus | undefined, query })
            }),
            getFinancialSummary: tool({
                description: 'Get current month financial summary',
                inputSchema: z.object({}),
                execute: async () => getFinancialSummary()
            }),
            getUsers: tool({
                description: 'Get team members',
                inputSchema: z.object({
                    role: z.enum(['ADMIN', 'GERENCIA', 'CONTABILIDAD', 'FINANZAS', 'PROYECTOS', 'MARKETING', 'COMERCIAL']).optional()
                }),
                execute: async ({ role }) => getUsers({ role: role as Role | undefined })
            }),
            getClients: tool({
                description: 'Get companies/clients with projects summary',
                inputSchema: z.object({
                    query: z.string().optional(),
                    hasActiveProjects: z.boolean().optional(),
                    limit: z.number().int().min(1).max(30).optional()
                }),
                execute: async ({ query, hasActiveProjects, limit }) =>
                    getClients({ userId: user.id, role: user.role }, { query, hasActiveProjects, limit })
            }),
            getContacts: tool({
                description: 'Get contacts by name/email/company',
                inputSchema: z.object({
                    query: z.string().optional(),
                    clientName: z.string().optional(),
                    limit: z.number().int().min(1).max(30).optional()
                }),
                execute: async ({ query, clientName, limit }) =>
                    getContacts({ userId: user.id, role: user.role }, { query, clientName, limit })
            }),
            getSuppliers: tool({
                description: 'Get suppliers',
                inputSchema: z.object({
                    query: z.string().optional(),
                    category: z.string().optional(),
                    city: z.string().optional()
                }),
                execute: async ({ query, category, city }) => getSuppliers({ userId: user.id, role: user.role }, { query, category, city })
            }),
            createClient: tool({
                description: 'Create client',
                inputSchema: z.object({
                    name: z.string().min(2),
                    country: z.string().optional(),
                    industry: z.string().optional(),
                    taxId: z.string().optional(),
                    address: z.string().optional(),
                    mainEmail: z.string().email().optional()
                }),
                execute: async (input) => createClientByAI({ userId: user.id, role: user.role }, input)
            }),
            createClientsBulk: tool({
                description: 'Create multiple clients. Only name is required for each.',
                inputSchema: z.object({
                    clients: z.array(
                        z.object({
                            name: z.string().min(2),
                            country: z.string().optional(),
                            industry: z.string().optional(),
                            taxId: z.string().optional(),
                            address: z.string().optional(),
                            mainEmail: z.string().email().optional()
                        })
                    ).min(1).max(20)
                }),
                execute: async ({ clients }) => {
                    const results = await Promise.all(
                        clients.map(async (clientInput) => {
                            const result = await createClientByAI({ userId: user.id, role: user.role }, clientInput)
                            if (!result.success) {
                                return {
                                    success: false as const,
                                    name: clientInput.name,
                                    error: result.error || 'No se pudo crear el cliente'
                                }
                            }
                            return {
                                success: true as const,
                                name: result.client.name,
                                created: result.created,
                                clientId: result.client.id,
                                editUrl: `/comercial?tab=companies&editClientId=${result.client.id}`
                            }
                        })
                    )
                    const createdCount = results.filter(
                        (r): r is Extract<typeof r, { success: true }> => r.success
                    ).filter((r) => r.created).length
                    return {
                        success: results.some((r) => r.success),
                        total: results.length,
                        createdCount,
                        results
                    }
                }
            }),
            createContact: tool({
                description: 'Create contact',
                inputSchema: z.object({
                    firstName: z.string().min(1).optional(),
                    lastName: z.string().min(1).optional(),
                    fullName: z.string().min(1).optional(),
                    email: z.string().email().optional(),
                    phone: z.string().optional(),
                    contactMethod: z.string().optional(),
                    country: z.string().optional(),
                    specialty: z.string().optional(),
                    clientId: z.string().optional(),
                    clientName: z.string().optional()
                }),
                execute: async (input) => createContactByAI({ userId: user.id, role: user.role }, input)
            }),
            createLead: tool({
                description: 'Create lead',
                inputSchema: z.object({
                    companyName: z.string().optional(),
                    clientId: z.string().optional(),
                    contactId: z.string().optional(),
                    serviceRequested: z.string().min(2),
                    requirementDetail: z.string().optional(),
                    estimatedValue: z.number().min(0).optional(),
                    currency: z.enum(['USD', 'PEN']).optional(),
                    source: z.string().optional(),
                    status: z.nativeEnum(LeadStatus).optional()
                }),
                execute: async (input) => createLeadByAI({ userId: user.id, role: user.role }, input)
            }),
            createProject: tool({
                description: 'Create project',
                inputSchema: z.object({
                    name: z.string().min(2),
                    clientId: z.string().optional(),
                    clientName: z.string().optional(),
                    directorId: z.string().optional(),
                    directorEmail: z.string().email().optional(),
                    directorName: z.string().optional(),
                    budget: z.number().min(0).optional(),
                    serviceType: z.string().optional(),
                    status: z.enum(['PLANNING', 'ACTIVE', 'REVIEW', 'COMPLETED', 'ON_HOLD']).optional(),
                    startDate: z.string().optional(),
                    endDate: z.string().optional()
                }),
                execute: async (input) => createProjectByAI({ userId: user.id, role: user.role }, input)
            }),
            createTask: tool({
                description: 'Create task',
                inputSchema: z.object({
                    title: z.string().min(2),
                    description: z.string().optional(),
                    projectId: z.string().optional(),
                    projectName: z.string().optional(),
                    assigneeId: z.string().optional(),
                    assigneeEmail: z.string().email().optional(),
                    assigneeName: z.string().optional(),
                    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
                    dueDate: z.string().optional(),
                    startDate: z.string().optional()
                }).refine((data) => Boolean(data.projectId || data.projectName), {
                    message: 'Debes indicar projectId o projectName'
                }),
                execute: async (input) => createTaskByAI({ userId: user.id, role: user.role }, input)
            }),
            updateLeadStatus: tool({
                description: 'Update lead status',
                inputSchema: z.object({
                    leadId: z.string().min(1),
                    status: z.nativeEnum(LeadStatus)
                }),
                execute: async (input) => updateLeadStatusByAI({ userId: user.id, role: user.role }, input)
            })
        },
        stopWhen: stepCountIs(5)
    })

    return (result.text || '').trim()
}
