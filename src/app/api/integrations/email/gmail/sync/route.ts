import { syncGmailEmails } from '@/lib/actions/email'

export async function POST() {
    const result = await syncGmailEmails()
    if (!result.success) {
        return Response.json({ success: false, error: result.error }, { status: 400 })
    }
    return Response.json({ success: true, synced: result.synced || 0 })
}
