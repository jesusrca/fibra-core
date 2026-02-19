import { openai } from '@ai-sdk/openai';
import { convertToModelMessages, stepCountIs, streamText, tool, UIMessage } from 'ai';
import { z } from 'zod';
import { getProjects, getLeads, getFinancialSummary, getUsers } from '@/lib/ai/tools';

export const runtime = 'nodejs';
// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
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
        console.error('Chat route error:', error);
        return Response.json(
            { error: 'No se pudo procesar la solicitud del bot.' },
            { status: 500 }
        );
    }
}
