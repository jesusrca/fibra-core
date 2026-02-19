export function isPrismaPoolTimeoutError(error: unknown): boolean {
    if (!(error instanceof Error)) return false
    return error.message.includes('Timed out fetching a new connection from the connection pool')
}

export async function withPrismaRetry<T>(
    operation: () => Promise<T>,
    retries = 2,
    baseDelayMs = 250
): Promise<T> {
    let attempt = 0
    let lastError: unknown

    while (attempt <= retries) {
        try {
            return await operation()
        } catch (error) {
            lastError = error
            if (!isPrismaPoolTimeoutError(error) || attempt === retries) {
                throw error
            }
            const waitMs = baseDelayMs * (attempt + 1)
            await new Promise((resolve) => setTimeout(resolve, waitMs))
            attempt += 1
        }
    }

    throw lastError
}
