import { requireAuthUser } from '@/lib/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import prisma from '@/lib/prisma'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { revalidatePath } from 'next/cache'
import { createStorageRef } from '@/lib/storage'

export const runtime = 'nodejs'
export const maxDuration = 30

function sanitizeFileName(name: string) {
    const safe = (name || 'photo.jpg')
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80)
    return safe || 'photo.jpg'
}

export async function POST(req: Request) {
    try {
        const user = await requireAuthUser()
        const formData = await req.formData()
        const file = formData.get('file')

        if (!(file instanceof File)) {
            return Response.json({ error: 'No se recibió archivo.' }, { status: 400 })
        }
        if (!file.type.startsWith('image/')) {
            return Response.json({ error: 'La foto de perfil debe ser una imagen.' }, { status: 400 })
        }
        if (file.size > 5 * 1024 * 1024) {
            return Response.json({ error: 'La imagen excede 5MB.' }, { status: 400 })
        }

        const bytes = new Uint8Array(await file.arrayBuffer())
        const supabase = getSupabaseAdminClient()
        const bucket = (process.env.SUPABASE_PROFILE_BUCKET || 'profile-images').trim()
        const filename = sanitizeFileName(file.name)
        const path = `${user.id}/${Date.now()}-${filename}`

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(path, bytes, { contentType: file.type || 'image/jpeg', upsert: false })

        if (uploadError) {
            return Response.json({ error: `No se pudo subir imagen: ${uploadError.message}` }, { status: 500 })
        }

        const avatarRef = createStorageRef(bucket, path)
        const { data: signedData, error: signedError } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 60 * 60 * 24 * 7)
        if (signedError || !signedData?.signedUrl) {
            return Response.json({ error: 'No se pudo generar URL firmada para el avatar.' }, { status: 500 })
        }
        const avatarUrl = signedData.signedUrl

        try {
            await withPrismaRetry(() =>
                prisma.user.update({
                    where: { id: user.id },
                    data: { avatarUrl: avatarRef }
                })
            )
        } catch (dbError) {
            const dbMessage = dbError instanceof Error ? dbError.message : ''
            if (dbMessage.includes('avatarUrl') || dbMessage.includes('column') || dbMessage.includes('P2022')) {
                return Response.json(
                    {
                        error: 'La BD aún no tiene la columna avatarUrl. Ejecuta `npm run db:push` y reinicia el servidor.'
                    },
                    { status: 409 }
                )
            }
            throw dbError
        }

        revalidatePath('/perfil')
        revalidatePath('/equipo')

        return Response.json({ success: true, avatarUrl, avatarRef, bucket, path })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo subir la foto de perfil'
        return Response.json({ error: message }, { status: 500 })
    }
}
