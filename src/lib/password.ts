import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

export function hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex')
    const derivedKey = scryptSync(password, salt, 64).toString('hex')
    return `${salt}:${derivedKey}`
}

export function verifyPassword(password: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(':')
    if (!salt || !hash) return false

    const derivedKey = scryptSync(password, salt, 64)
    const hashBuffer = Buffer.from(hash, 'hex')
    if (hashBuffer.length !== derivedKey.length) return false

    return timingSafeEqual(hashBuffer, derivedKey)
}
