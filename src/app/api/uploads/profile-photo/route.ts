import { requireAuthUser } from '@/lib/server-auth'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import prisma from '@/lib/prisma'
import { withPrismaRetry } from '@/lib/prisma-retry'
import { revalidatePath } from 'next/cache'

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

        const { data } = supabase.storage.from(bucket).getPublicUrl(path)
        const avatarUrl = data.publicUrl

        await withPrismaRetry(() =>
            prisma.user.update({
                where: { id: user.id },
                data: { avatarUrl }
            })
        )

        revalidatePath('/perfil')
        revalidatePath('/equipo')

        return Response.json({ success: true, avatarUrl, bucket, path })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo subir la foto de perfil'
        return Response.json({ error: message }, { status: 500 })
    }
}
