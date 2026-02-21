'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useChat, type UIMessage } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'

const SHARED_CHAT_ID = 'fibra-chat-session'
const SHARED_CHAT_STORAGE_KEY = 'fibra-chat-messages-v2'

function isValidMessage(message: any): message is UIMessage {
    if (!message || typeof message !== 'object') return false
    if (typeof message.id !== 'string') return false
    if (message.role !== 'user' && message.role !== 'assistant' && message.role !== 'system') return false
    if (!Array.isArray(message.parts)) return false
    return true
}

export function useSharedChat() {
    const transport = useMemo(() => new DefaultChatTransport({ api: '/api/chat' }), [])
    const chat = useChat({
        id: SHARED_CHAT_ID,
        transport,
        experimental_throttle: 50,
    })
    const hydratedRef = useRef(false)

    useEffect(() => {
        if (hydratedRef.current) return
        hydratedRef.current = true

        try {
            const raw = localStorage.getItem(SHARED_CHAT_STORAGE_KEY)
            if (!raw) return
            const parsed = JSON.parse(raw)
            if (!Array.isArray(parsed)) return
            const safeMessages = parsed.filter(isValidMessage)
            if (safeMessages.length > 0) {
                chat.setMessages(safeMessages)
            }
        } catch {
            // Ignore malformed local storage data
        }
    }, [chat])

    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (!hydratedRef.current) return

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }

        saveTimeoutRef.current = setTimeout(() => {
            try {
                const safeMessages = chat.messages.map((message) => {
                    const nonFileParts = message.parts.filter((part) => part.type !== 'file')
                    return {
                        ...message,
                        parts: nonFileParts.length > 0
                            ? nonFileParts
                            : [{ type: 'text' as const, text: '[Adjunto enviado]' }]
                    }
                })
                localStorage.setItem(SHARED_CHAT_STORAGE_KEY, JSON.stringify(safeMessages))
            } catch {
                // Ignore storage quota / serialization errors
            }
        }, 1000) // Debounce by 1 second

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
        }
    }, [chat.messages])

    return chat
}
