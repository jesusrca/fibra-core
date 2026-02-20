import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import { requireAnyRole } from '@/lib/server-auth'
import { Role } from '@prisma/client'
import { createStorageRef } from '@/lib/storage'

export const runtime = 'nodejs'
export const maxDuration = 30

function sanitizeFileName(name: string) {
    const safe = (name || 'invoice.pdf')
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 100)
    return safe || 'invoice.pdf'
}

export async function POST(req: Request) {
    try {
        await requireAnyRole([Role.ADMIN, Role.GERENCIA, Role.CONTABILIDAD, Role.COMERCIAL])
        const formData = await req.formData()
        const file = formData.get('file')

        if (!(file instanceof File)) {
            return Response.json({ error: 'No se recibió archivo.' }, { status: 400 })
        }

        const mime = file.type || 'application/octet-stream'
        const allowedTypes = new Set([
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/webp'
        ])
        if (!allowedTypes.has(mime)) {
            return Response.json({ error: 'Formato inválido. Usa PDF o imagen.' }, { status: 400 })
        }
        if (file.size > 15 * 1024 * 1024) {
            return Response.json({ error: 'El archivo excede 15MB.' }, { status: 400 })
        }

        const bytes = new Uint8Array(await file.arrayBuffer())
        const supabase = getSupabaseAdminClient()
        const bucket = (process.env.SUPABASE_INVOICE_BUCKET || 'invoice-files').trim()
        const filename = sanitizeFileName(file.name)
        const path = `${new Date().toISOString().slice(0, 10)}/${Date.now()}-${filename}`

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(path, bytes, {
                contentType: mime,
                upsert: false
            })

        if (uploadError) {
            return Response.json({ error: `No se pudo subir archivo: ${uploadError.message}` }, { status: 500 })
        }

        const fileRef = createStorageRef(bucket, path)
        const { data: signedData, error: signedError } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 60 * 60 * 24 * 7)
        if (signedError || !signedData?.signedUrl) {
            return Response.json({ error: 'No se pudo generar URL firmada del archivo.' }, { status: 500 })
        }
        return Response.json({
            success: true,
            fileUrl: signedData.signedUrl,
            fileRef,
            bucket,
            path
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo subir el archivo de factura'
        return Response.json({ error: message }, { status: 500 })
    }
}
