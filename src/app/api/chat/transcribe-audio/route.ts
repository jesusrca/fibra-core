import OpenAI from 'openai'
import { requireModuleAccess } from '@/lib/server-auth'

export const runtime = 'nodejs'
export const maxDuration = 30

function sanitizeFileName(name: string) {
    const safe = (name || 'audio.webm')
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80)
    return safe || 'audio.webm'
}

export async function POST(req: Request) {
    try {
        await requireModuleAccess('chatbot')
        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
            return Response.json({ error: 'OPENAI_API_KEY no está configurada.' }, { status: 500 })
        }

        const formData = await req.formData()
        const audio = formData.get('audio')
        if (!(audio instanceof File)) {
            return Response.json({ error: 'No se recibió archivo de audio.' }, { status: 400 })
        }
        if (!audio.type.startsWith('audio/')) {
            return Response.json({ error: 'El archivo enviado no es audio.' }, { status: 400 })
        }
        if (audio.size > 12 * 1024 * 1024) {
            return Response.json({ error: 'El audio excede el límite de 12MB.' }, { status: 400 })
        }

        const arrayBuffer = await audio.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        const filename = sanitizeFileName(audio.name)

        const client = new OpenAI({ apiKey })
        const openaiFile = await OpenAI.toFile(bytes, filename, { type: audio.type || 'audio/webm' })
        const transcript = await client.audio.transcriptions.create({
            model: 'whisper-1',
            file: openaiFile
        })

        const text = (transcript.text || '').trim()
        if (!text) {
            return Response.json({ error: 'Whisper no devolvió texto para este audio.' }, { status: 422 })
        }

        return Response.json({
            success: true,
            text
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo transcribir el audio'
        return Response.json({ error: message }, { status: 500 })
    }
}
