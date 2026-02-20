'use server'

import { requireModuleAccess } from '@/lib/server-auth'
import { sendSystemEmailByBrevo } from '@/lib/brevo'

export async function sendBrevoTestEmail(input: { to: string }) {
    await requireModuleAccess('configuracion')
    const to = (input.to || '').trim().toLowerCase()
    if (!to) return { success: false, error: 'Correo destino obligatorio' }

    const result = await sendSystemEmailByBrevo({
        to,
        subject: 'Prueba Brevo - Fibra Core',
        text: 'Brevo está configurado correctamente para correos del sistema.'
    })

    if (!result.success) return { success: false, error: result.error || 'No se pudo enviar correo de prueba' }
    return { success: true }
}

