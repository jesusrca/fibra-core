import { openai } from '@ai-sdk/openai';
import { convertToModelMessages, experimental_transcribe, stepCountIs, streamText, tool, UIMessage } from 'ai';
import OpenAI from 'openai';
import { z } from 'zod';
import {
    createClientByAI,
    createContactByAI,
    createLeadByAI,
    createProjectByAI,
    getFinancialSummary,
    getLeads,
    getProjects,
    getSuppliers,
    getUsers
} from '@/lib/ai/tools';
import { AuthError, requireModuleAccess } from '@/lib/server-auth';
import { LeadStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { withPrismaRetry } from '@/lib/prisma-retry';

export const runtime = 'nodejs';
// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

type UserChatContext = {
    id: string
}

type ChatFilePart = Extract<UIMessage['parts'][number], { type: 'file' }>

function isFilePart(part: UIMessage['parts'][number]): part is ChatFilePart {
    return part.type === 'file'
}

function decodeDataUrl(dataUrl: string) {
    const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/)
    if (!match) return null

    const mediaType = match[1] || 'application/octet-stream'
    const isBase64 = Boolean(match[2])
    const payload = match[3] || ''

    try {
        const data = isBase64
            ? Buffer.from(payload, 'base64')
            : Buffer.from(decodeURIComponent(payload), 'utf8')
        return { mediaType, data: new Uint8Array(data) }
    } catch {
        return null
    }
}

function isExtractableText(mediaType: string, filename?: string) {
    const lowerType = mediaType.toLowerCase()
    const lowerName = (filename || '').toLowerCase()

    if (lowerType.startsWith('text/')) return true
    if (lowerType.includes('json') || lowerType.includes('csv') || lowerType.includes('xml')) return true
    return ['.txt', '.md', '.csv', '.json', '.xml'].some((ext) => lowerName.endsWith(ext))
}

function compactText(raw: string, maxLength = 1800) {
    const normalized = raw.replace(/\s+/g, ' ').trim()
    if (normalized.length <= maxLength) return normalized
    return `${normalized.slice(0, maxLength)}...`
}

async function transcribeAudioWithOpenAI(params: {
    filename: string
    mediaType: string
    data: Uint8Array
}) {
    const primaryModel = 'gpt-4o-mini-transcribe'
    const fallbackModel = 'whisper-1'

    try {
        const transcript = await experimental_transcribe({
            model: openai.transcription(primaryModel),
            audio: params.data
        })
        return {
            text: transcript.text,
            language: transcript.language || undefined
        }
    } catch (sdkError) {
        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) throw sdkError

        try {
            const client = new OpenAI({ apiKey })
            const file = await OpenAI.toFile(params.data, params.filename, { type: params.mediaType })
            const fallback = await client.audio.transcriptions.create({
                model: fallbackModel,
                file
            })
            return {
                text: fallback.text,
                language: undefined
            }
        } catch (fallbackError) {
            throw fallbackError instanceof Error
                ? fallbackError
                : sdkError
        }
    }
}

async function auditAttachmentProcessing(input: {
    userId: string
    attachments: Array<Record<string, unknown>>
    success: boolean
    error?: string
}) {
    try {
        await withPrismaRetry(() =>
            prisma.toolAuditLog.create({
                data: {
                    userId: input.userId,
                    toolName: 'chat_attachments',
                    action: 'ATTACHMENT_PROCESS',
                    inputJson: {
                        attachments: input.attachments,
                    } as any,
                    success: input.success,
                    error: input.error || null
                }
            })
        )
    } catch (error) {
        console.error('Attachment audit log error:', error)
    }
}

async function enrichMessagesWithAttachmentContext(
    messages: UIMessage[],
    user: UserChatContext
): Promise<UIMessage[]> {
    const latestUserIndex = [...messages]
        .map((message, index) => ({ message, index }))
        .reverse()
        .find((entry) => entry.message.role === 'user')?.index

    if (latestUserIndex == null) return messages

    const latestUserMessage = messages[latestUserIndex]
    const fileParts = latestUserMessage.parts.filter(isFilePart)
    if (fileParts.length === 0) return messages
    const filteredOriginalParts = latestUserMessage.parts.filter((part) => {
        if (!isFilePart(part)) return true
        const mediaType = (part.mediaType || '').toLowerCase()
        if (mediaType.startsWith('image/')) return true
        if (mediaType === 'application/pdf') return true
        return false
    })

    const attachmentSummaries: string[] = []
    const auditDetails: Array<Record<string, unknown>> = []
    let hasProcessingError = false

    for (const filePart of fileParts) {
        const filename = filePart.filename || 'archivo-adjunto'
        const mediaType = filePart.mediaType || 'application/octet-stream'
        const detail: Record<string, unknown> = { filename, mediaType }

        if (!filePart.url.startsWith('data:')) {
            detail.status = 'url_not_supported'
            attachmentSummaries.push(`- ${filename}: adjunto referenciado por URL externa (no se extrajo contenido directo).`)
            auditDetails.push(detail)
            continue
        }

        const decoded = decodeDataUrl(filePart.url)
        if (!decoded) {
            detail.status = 'invalid_data_url'
            hasProcessingError = true
            attachmentSummaries.push(`- ${filename}: no se pudo decodificar el archivo.`)
            auditDetails.push(detail)
            continue
        }

        const normalizedMediaType = mediaType || decoded.mediaType
        detail.sizeBytes = decoded.data.byteLength
        if (decoded.data.byteLength > 12 * 1024 * 1024) {
            detail.status = 'too_large'
            hasProcessingError = true
            attachmentSummaries.push(`- ${filename}: excede el límite de procesamiento automático (12MB).`)
            auditDetails.push(detail)
            continue
        }

        if (normalizedMediaType.startsWith('audio/')) {
            try {
                const transcript = await transcribeAudioWithOpenAI({
                    filename,
                    mediaType: normalizedMediaType,
                    data: decoded.data
                })
                const transcriptText = compactText(transcript.text, 2200)
                detail.status = 'transcribed'
                detail.language = transcript.language || null
                detail.transcriptPreview = transcriptText
                attachmentSummaries.push(
                    `- Audio "${filename}" (${transcript.language || 'idioma no detectado'}): ${transcriptText}`
                )
            } catch (error) {
                detail.status = 'transcription_error'
                detail.error = error instanceof Error ? error.message : 'Error transcribiendo audio'
                hasProcessingError = true
                attachmentSummaries.push(`- Audio "${filename}": no se pudo transcribir automáticamente.`)
            }
            auditDetails.push(detail)
            continue
        }

        if (normalizedMediaType.startsWith('image/')) {
            detail.status = 'image_ready_for_vision'
            attachmentSummaries.push(
                `- Imagen "${filename}": el asistente debe analizarla visualmente y resumirla en español.`
            )
            auditDetails.push(detail)
            continue
        }

        if (normalizedMediaType === 'application/pdf') {
            detail.status = 'pdf_ready_for_model'
            attachmentSummaries.push(
                `- Documento PDF "${filename}": usa el contenido del archivo para responder y traducir al español si aplica.`
            )
            auditDetails.push(detail)
            continue
        }

        if (isExtractableText(normalizedMediaType, filename)) {
            try {
                const text = new TextDecoder().decode(decoded.data)
                const preview = compactText(text, 2200)
                detail.status = 'text_extracted'
                detail.textPreview = preview
                attachmentSummaries.push(`- Archivo "${filename}": ${preview}`)
            } catch (error) {
                detail.status = 'text_extract_error'
                detail.error = error instanceof Error ? error.message : 'Error extrayendo texto'
                hasProcessingError = true
                attachmentSummaries.push(`- Archivo "${filename}": no se pudo extraer texto.`)
            }
            auditDetails.push(detail)
            continue
        }

        detail.status = 'unsupported_binary'
        attachmentSummaries.push(
            `- Archivo "${filename}" (${normalizedMediaType}): adjunto recibido, formato binario sin extracción automática de texto.`
        )
        auditDetails.push(detail)
    }

    if (attachmentSummaries.length > 0) {
        const attachmentContext = [
            'Contexto de adjuntos procesados automáticamente:',
            ...attachmentSummaries,
            'Instrucción: responde en español y traduce el contenido si el adjunto está en otro idioma.'
        ].join('\n')

        latestUserMessage.parts = [
            ...filteredOriginalParts,
            { type: 'text', text: `\n\n${attachmentContext}` }
        ]
    } else {
        latestUserMessage.parts = filteredOriginalParts
    }

    await auditAttachmentProcessing({
        userId: user.id,
        attachments: auditDetails,
        success: !hasProcessingError
    })

    return messages
}

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

        const uiMessages = messages as UIMessage[]
        const enrichedMessages = await enrichMessagesWithAttachmentContext(uiMessages, { id: user.id })
        const modelMessages = await convertToModelMessages(
            enrichedMessages.map(({ id: _id, ...rest }) => rest)
        )

        const result = streamText({
            model: openai('gpt-4o'),
            messages: modelMessages,
            system: `You are Fibra Bot, an AI assistant for the Fibra branding studio management platform.
      You have access to the company database through tools.
      Your goal is to help users find information about projects, leads, finances, team members, and suppliers quickly.
      
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
      - For write operations (create lead/client/contact/project), indica los datos recomendados, pero permite guardado mínimo cuando solo hay nombre.
      - Si faltan datos no críticos (email, empresa, director, presupuesto), crea el registro base y sugiere completarlo luego.
      - If a write tool returns "success: false", explain the reason to the user clearly.
      - For project creation, minimum operativo: nombre del proyecto. Si falta cliente, usar cliente placeholder y luego completar.
      - If user sends attachments (images, audio, documents), process them and answer using that content.
      - Always keep the final response clean, structured, and in Spanish.
      - If extracted/transcribed content is in another language, translate it to Spanish before final response.
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
                getSuppliers: tool({
                    description: 'Get a list of suppliers. Filter by category, city or search query.',
                    inputSchema: z.object({
                        query: z.string().optional().describe('Search by supplier name, category, city or contact'),
                        category: z.string().optional(),
                        city: z.string().optional()
                    }),
                    execute: async ({ query, category, city }) => getSuppliers({ userId: user.id, role: user.role }, { query, category, city })
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
                    description: 'Create a contact. Can be created with minimal data (name only) and completed later.',
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
                }),
                createProject: tool({
                    description: 'Create a project. Can be created with only name. Missing fields are completed later.',
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
                        startDate: z.string().optional().describe('ISO date format recommended (YYYY-MM-DD)'),
                        endDate: z.string().optional().describe('ISO date format recommended (YYYY-MM-DD)')
                    }),
                    execute: async (input) => createProjectByAI({ userId: user.id, role: user.role }, input)
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
