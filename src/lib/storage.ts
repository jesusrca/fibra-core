import { getSupabaseAdminClient } from '@/lib/supabase-admin'

function tryDecode(value: string) {
    try {
        return decodeURIComponent(value)
    } catch {
        return value
    }
}

export function createStorageRef(bucket: string, path: string) {
    return `${bucket}:${path}`
}

export function parseStorageRef(
    value?: string | null,
    defaultBucket?: string
): { bucket: string; path: string } | null {
    const raw = (value || '').trim()
    if (!raw) return null

    const colonIndex = raw.indexOf(':')
    if (colonIndex > 0 && !raw.startsWith('http')) {
        return {
            bucket: raw.slice(0, colonIndex),
            path: raw.slice(colonIndex + 1)
        }
    }

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
        const match = raw.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?]+)/i)
        if (match) {
            return {
                bucket: tryDecode(match[1]),
                path: tryDecode(match[2])
            }
        }
        return null
    }

    if (defaultBucket) {
        return { bucket: defaultBucket, path: raw }
    }

    return null
}

export async function toSignedStorageUrl(
    value?: string | null,
    options?: { defaultBucket?: string; expiresIn?: number }
): Promise<string | null> {
    const raw = (value || '').trim()
    if (!raw) return null

    const parsed = parseStorageRef(raw, options?.defaultBucket)
    if (!parsed) return raw

    const supabase = getSupabaseAdminClient()
    const expiresIn = Math.max(60, options?.expiresIn || 60 * 60 * 24)
    const { data, error } = await supabase.storage
        .from(parsed.bucket)
        .createSignedUrl(parsed.path, expiresIn)

    if (error) return null
    return data?.signedUrl || null
}

