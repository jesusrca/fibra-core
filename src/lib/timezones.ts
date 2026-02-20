export function getTimezoneOptions(extra?: string | null) {
    const fallback = [
        'UTC',
        'America/Lima',
        'America/Bogota',
        'America/Santiago',
        'America/Buenos_Aires',
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'America/Mexico_City',
        'Europe/London',
        'Europe/Madrid',
        'Europe/Paris',
        'Europe/Berlin',
        'Asia/Tokyo',
        'Asia/Seoul',
        'Asia/Shanghai',
        'Asia/Singapore',
        'Asia/Dubai',
        'Australia/Sydney',
    ]

    try {
        const maybeIntl = Intl as unknown as {
            supportedValuesOf?: (key: string) => string[]
        }
        const values = typeof maybeIntl.supportedValuesOf === 'function'
            ? maybeIntl.supportedValuesOf('timeZone')
            : []
        const merged = [...values]
        for (const tz of fallback) {
            if (!merged.includes(tz)) merged.push(tz)
        }
        if (extra && !merged.includes(extra)) merged.push(extra)
        return merged.sort((a, b) => a.localeCompare(b))
    } catch {
        const list = [...fallback]
        if (extra && !list.includes(extra)) list.push(extra)
        return list.sort((a, b) => a.localeCompare(b))
    }
}

export function formatTimezoneLabel(timezone: string) {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            timeZoneName: 'longOffset',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).formatToParts(new Date())
        const offset = parts.find((part) => part.type === 'timeZoneName')?.value || 'GMT'
        return `${timezone} (${offset})`
    } catch {
        return timezone
    }
}

