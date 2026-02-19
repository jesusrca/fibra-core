import { openai } from '@ai-sdk/openai';
import { convertToModelMessages, stepCountIs, streamText, tool, UIMessage } from 'ai';
import { z } from 'zod';
import {
    createClientByAI,
    createContactByAI,
    createLeadByAI,
    getFinancialSummary,
    getLeads,
    getProjects,
    getUsers
} from '@/lib/ai/tools';
import { AuthError, requireModuleAccess } from '@/lib/server-auth';
import { LeadStatus } from '@prisma/client';

export const runtime = 'nodejs';
// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const user = await requireModuleAccess('chatbot');

        if (!process.env.OPENAI_API_KEY) {
            return Response.json(
                { error: 'OPENAI_API_KEY no está configurada en el entorno.' },
                { status: 500 }
            );
        }

        const body = await req.json();
        const messages = Array.isArray(body?.messages) ? body.messages : [];

        if (messages.length === 0) {
            return Response.json(
                { error: 'No se recibieron mensajes para procesar.' },
                { status: 400 }
            );
        }

        const result = streamText({
            model: openai('gpt-4o'),
            messages: await convertToModelMessages(messages as UIMessage[]),
            system: `You are Fibra Bot, an AI assistant for the Fibra branding studio management platform.
      You have access to the company database through tools.
      Your goal is to help users find information about projects, leads, finances, and team members quickly.
      
      Guidelines:
      - Always check the database before answering questions about specific data.
      - Be concise, professional, and keep the response clean and well ordered.
      - If the user asks about a specific project or client, try to search for it.
      - When mentioning a specific project returned by tools, ALWAYS include a direct markdown link to its detail page using its id:
        [Project Name](/proyectos/{projectId})
      - Prefer short sections with clear bullets and avoid noisy formatting.
      - Format monetary values with the currency symbol (S/ or $).
      - For dates, use a readable format (e.g., "DD/MM/YYYY").
      - If you can't find information, state that clearly.
      - When listing multiple items, use bullet points for readability.
      - For write operations (create lead/client/contact), always confirm required data and then call tools.
      - If a write tool returns "success: false", explain the reason to the user clearly.
    `,
            tools: {
                getProjects: tool({
                    description: 'Get a list of projects. Filter by status (ACTIVE, PLANNING, COMPLETED, etc.) or search by name/client.',
                    inputSchema: z.object({
                        status: z.enum(['ACTIVE', 'PLANNING', 'COMPLETED', 'ON_HOLD', 'REVIEW']).optional(),
                        query: z.string().optional().describe('Search term for project name or client name')
                    }),
                    execute: async ({ status, query }) => getProjects({ status, query })
                }),
                getLeads: tool({
                    description: 'Get a list of sales leads. Filter by status (NEW, CONTACTED, PROPOSAL, WON, LOST) or search by company/contact.',
                    inputSchema: z.object({
                        status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']).optional(),
                        query: z.string().optional().describe('Search term for company or contact name')
                    }),
                    execute: async ({ status, query }) => getLeads({ status, query })
                }),
                getFinancialSummary: tool({
                    description: 'Get a financial summary for the current month (Income vs Expenses).',
                    inputSchema: z.object({}),
                    execute: async () => getFinancialSummary()
                }),
                getUsers: tool({
                    description: 'Get a list of team members. Filter by role.',
                    inputSchema: z.object({
                        role: z.enum(['ADMIN', 'GERENCIA', 'CONTABILIDAD', 'FINANZAS', 'PROYECTOS', 'MARKETING', 'COMERCIAL']).optional()
                    }),
                    execute: async ({ role }) => getUsers({ role })
                }),
                createClient: tool({
                    description: 'Create a company/client in CRM. Requires name.',
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
                createContact: tool({
                    description: 'Create a contact. Requires firstName, lastName, email and either clientId or clientName.',
                    inputSchema: z.object({
                        firstName: z.string().min(1),
                        lastName: z.string().min(1),
                        email: z.string().email(),
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
                    description: 'Create a sales lead. Requires serviceRequested and either companyName or clientId.',
                    inputSchema: z.object({
                        companyName: z.string().optional(),
                        clientId: z.string().optional(),
                        contactId: z.string().optional(),
                        serviceRequested: z.string().min(2),
                        requirementDetail: z.string().optional(),
                        estimatedValue: z.number().min(0).optional(),
                        source: z.string().optional(),
                        status: z.nativeEnum(LeadStatus).optional()
                    }),
                    execute: async (input) => createLeadByAI({ userId: user.id, role: user.role }, input)
                })
            },
            stopWhen: stepCountIs(5),
        });

        return result.toUIMessageStreamResponse({
            onError: (error) => {
                console.error('Chat stream error:', error);
                return 'Ocurrió un error procesando la respuesta del bot.';
            }
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return Response.json({ error: error.message }, { status: error.status });
        }
        console.error('Chat route error:', error);
        return Response.json(
            { error: 'No se pudo procesar la solicitud del bot.' },
            { status: 500 }
        );
    }
}
