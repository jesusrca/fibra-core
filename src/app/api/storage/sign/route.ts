import { requireAuthUser } from '@/lib/server-auth'
import { toSignedStorageUrl } from '@/lib/storage'

export const runtime = 'nodejs'
export const maxDuration = 20

export async function POST(request: Request) {
    try {
        await requireAuthUser()
        const body = await request.json().catch(() => ({} as any))
        const ref = String(body?.ref || '').trim()
        const defaultBucket = String(body?.defaultBucket || '').trim() || undefined
        const expiresIn = Number(body?.expiresIn || 60 * 60)

        if (!ref) {
            return Response.json({ success: false, error: 'ref es requerido' }, { status: 400 })
        }

        const signedUrl = await toSignedStorageUrl(ref, {
            defaultBucket,
            expiresIn: Number.isFinite(expiresIn) ? expiresIn : undefined
        })
        if (!signedUrl) {
            return Response.json({ success: false, error: 'No se pudo firmar el archivo' }, { status: 404 })
        }

        return Response.json({ success: true, url: signedUrl })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error firmando archivo'
        return Response.json({ success: false, error: message }, { status: 401 })
    }
}

