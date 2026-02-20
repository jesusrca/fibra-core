'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, Paperclip, Mic, Zap, Info, X, File as FileIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSharedChat } from '@/lib/use-shared-chat'
import type { UIMessage } from 'ai'
import { RichTextMessage } from '@/components/chat/rich-text-message'

const MAX_ATTACHMENTS = 6
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

type ChatFilePart = Extract<UIMessage['parts'][number], { type: 'file' }>

function isFilePart(part: UIMessage['parts'][number]): part is ChatFilePart {
    return part.type === 'file'
}

function getTextFromParts(parts: UIMessage['parts']) {
    return parts
        .filter((part): part is Extract<UIMessage['parts'][number], { type: 'text' }> => part.type === 'text')
        .map((part) => part.text)
        .join('')
}

function getFileParts(parts: UIMessage['parts']) {
    return parts.filter(isFilePart)
}

function readFileAsDataURL(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo'))
        reader.readAsDataURL(file)
    })
}

async function fileToPart(file: File): Promise<ChatFilePart> {
    return {
        type: 'file',
        mediaType: file.type || 'application/octet-stream',
        filename: file.name,
        url: await readFileAsDataURL(file),
    }
}

export default function ChatbotPage() {
    const [input, setInput] = useState('')
    const [attachments, setAttachments] = useState<File[]>([])
    const [isSending, setIsSending] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [isRecording, setIsRecording] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const mediaStreamRef = useRef<MediaStream | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const { messages, sendMessage, status, error } = useSharedChat()
    const isTyping = status === 'submitted' || status === 'streaming'
    const isBusy = isTyping || isSending

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isTyping])

    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop()
            }
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach((track) => track.stop())
            }
        }
    }, [])

    const addFiles = (incoming: File[]) => {
        const issues: string[] = []
        setAttachments((previous) => {
            const next: File[] = [...previous]
            for (const file of incoming) {
                const alreadyAdded = next.some(
                    (f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
                )
                if (alreadyAdded) continue

                if (file.size > MAX_FILE_SIZE_BYTES) {
                    issues.push(`${file.name}: excede 10MB`)
                    continue
                }
                if (next.length >= MAX_ATTACHMENTS) {
                    issues.push(`Máximo ${MAX_ATTACHMENTS} adjuntos por mensaje`)
                    break
                }
                next.push(file)
            }
            return next
        })
        setUploadError(issues.length > 0 ? issues.join(' · ') : null)
    }

    const stopRecording = () => {
        const recorder = mediaRecorderRef.current
        if (recorder && recorder.state !== 'inactive') {
            recorder.stop()
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop())
            mediaStreamRef.current = null
        }
        setIsRecording(false)
    }

    const handleRecordToggle = async () => {
        if (isRecording) {
            stopRecording()
            return
        }

        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            setUploadError('Tu navegador no soporta grabación de audio')
            return
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            mediaStreamRef.current = stream
            const recorder = new MediaRecorder(stream)
            mediaRecorderRef.current = recorder
            audioChunksRef.current = []

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data)
                }
            }

            recorder.onstop = () => {
                const mimeType = recorder.mimeType || 'audio/webm'
                const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'm4a' : 'webm'
                const blob = new Blob(audioChunksRef.current, { type: mimeType })
                if (blob.size > 0) {
                    const file = new File([blob], `audio-${Date.now()}.${ext}`, { type: mimeType })
                    addFiles([file])
                }
                audioChunksRef.current = []
                if (mediaStreamRef.current) {
                    mediaStreamRef.current.getTracks().forEach((track) => track.stop())
                    mediaStreamRef.current = null
                }
                setIsRecording(false)
            }

            recorder.start()
            setUploadError(null)
            setIsRecording(true)
        } catch (recordError) {
            setUploadError(recordError instanceof Error ? recordError.message : 'No se pudo iniciar la grabación')
            setIsRecording(false)
        }
    }

    const handleSend = async () => {
        const text = input.trim()
        if ((!text && attachments.length === 0) || isBusy) return

        setIsSending(true)
        setUploadError(null)
        const previousInput = input
        const previousAttachments = attachments
        setInput('')
        setAttachments([])
        try {
            const fileParts = await Promise.all(previousAttachments.map(fileToPart))

            if (text && fileParts.length > 0) {
                await sendMessage({ text, files: fileParts })
            } else if (fileParts.length > 0) {
                await sendMessage({ files: fileParts })
            } else {
                await sendMessage({ text })
            }
        } catch (sendError) {
            setInput(previousInput)
            setAttachments(previousAttachments)
            setUploadError(sendError instanceof Error ? sendError.message : 'No se pudo enviar el mensaje')
        } finally {
            setIsSending(false)
        }
    }

    const suggestions = [
        '¿Cuál es la rentabilidad de este mes?',
        'Estatus del proyecto Nexo Corp',
        'Resumen de leads ganados en 2026',
        '¿Qué tareas tengo pendientes para hoy?',
    ]

    return (
        <div className="h-full flex flex-col max-w-4xl mx-auto animate-fade-in">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                        <Bot className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            Fibra AI Assistant
                            <span className="badge badge-info py-0 px-1.5 text-[10px]">GPT-4o</span>
                        </h1>
                        <p className="text-xs text-muted-foreground">Expertos en tu negocio, 24/7</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="btn-ghost p-2" title="Información del contexto">
                        <Info className="w-4 h-4" />
                    </button>
                    <button className="btn-ghost p-2" title="Sincronizar datos">
                        <Zap className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Suggestion Chips */}
            {messages.length === 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                    {suggestions.map((s) => (
                        <button
                            key={s}
                            onClick={() => setInput(s)}
                            className="text-xs px-3 py-2 rounded-full border border-border bg-card/50 hover:border-primary/40 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar" ref={scrollRef}>
                {messages.map((m) => {
                    const textContent = getTextFromParts(m.parts)
                    const fileParts = getFileParts(m.parts)

                    return (
                    <div
                        key={m.id}
                        className={cn(
                            'flex gap-4 max-w-[85%]',
                            m.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                        )}
                    >
                        <div
                            className={cn(
                                'w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-1',
                                m.role === 'assistant' ? 'bg-primary/20 text-primary' : 'bg-secondary text-foreground'
                            )}
                        >
                            {m.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>
                        <div
                            className={cn(
                                'p-4 rounded-2xl text-sm leading-relaxed shadow-sm',
                                m.role === 'assistant'
                                    ? 'bg-card border border-border/60 text-foreground'
                                    : 'bg-primary text-primary-foreground font-semibold'
                            )}
                        >
                            <div className="space-y-2">
                                {m.role === 'assistant'
                                    ? <RichTextMessage content={textContent} className="space-y-2" />
                                    : <p className="whitespace-pre-wrap">{textContent}</p>}
                                {fileParts.length > 0 && (
                                    <div className="space-y-1.5 pt-1">
                                        {fileParts.map((filePart, idx) => (
                                            <a
                                                key={`${m.id}-f-${idx}`}
                                                href={filePart.url}
                                                download={filePart.filename || `archivo-${idx + 1}`}
                                                className={cn(
                                                    'inline-flex max-w-full items-center gap-2 rounded-lg border px-2.5 py-1 text-xs',
                                                    m.role === 'assistant'
                                                        ? 'border-border bg-background text-foreground'
                                                        : 'border-white/30 bg-white/10 text-primary-foreground'
                                                )}
                                            >
                                                <FileIcon className="h-3.5 w-3.5 shrink-0" />
                                                <span className="truncate">
                                                    {filePart.filename || `Archivo ${idx + 1}`}
                                                </span>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div
                                className={cn(
                                    'text-[10px] mt-2 opacity-70',
                                    m.role === 'user' ? 'text-primary-foreground/90' : 'text-muted-foreground'
                                )}
                            >
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                    )
                })}
                {error && (
                    <div className="text-xs text-red-500 px-2">
                        Error del chatbot: {error.message}
                    </div>
                )}
                {isTyping && (
                    <div className="flex gap-4 max-w-[80%]">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center mt-1">
                            <Bot className="w-4 h-4" />
                        </div>
                        <div className="bg-card border border-border/60 p-4 rounded-2xl flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="mt-6 flex-shrink-0">
                {attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                        {attachments.map((file, idx) => (
                            <span
                                key={`${file.name}-${file.size}-${idx}`}
                                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground"
                            >
                                <FileIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="max-w-[180px] truncate">{file.name}</span>
                                <button
                                    type="button"
                                    onClick={() => setAttachments((state) => state.filter((_, i) => i !== idx))}
                                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                    aria-label={`Quitar ${file.name}`}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}
                <div className="glass-card p-2 flex items-end gap-2 border-primary/20 shadow-lg shadow-primary/5 focus-within:border-primary/40 focus-within:shadow-primary/10 transition-all duration-300">
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        accept="image/*,audio/*,.txt,.csv,.json,.md,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                        onChange={(e) => {
                            const selected = Array.from(e.target.files || [])
                            if (selected.length > 0) addFiles(selected)
                            e.currentTarget.value = ''
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-ghost p-2 text-muted-foreground"
                        title="Adjuntar archivo"
                        disabled={isBusy}
                    >
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                e.preventDefault()
                                handleSend()
                            }
                        }}
                        onPaste={(e) => {
                            const files = Array.from(e.clipboardData?.files || [])
                            if (files.length > 0) {
                                e.preventDefault()
                                addFiles(files)
                            }
                        }}
                        placeholder="Pregúntame sobre tus finanzas, proyectos o ventas..."
                        className="flex-1 bg-transparent border-none resize-none px-3 py-2.5 text-sm text-foreground focus:ring-0 placeholder:text-muted-foreground max-h-32 min-h-[44px]"
                        rows={2}
                        disabled={isBusy}
                    />
                    <button
                        type="button"
                        onClick={handleRecordToggle}
                        className={cn(
                            'btn-ghost p-2',
                            isRecording ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground'
                        )}
                        title={isRecording ? 'Detener grabación' : 'Grabar audio'}
                        disabled={isBusy && !isRecording}
                    >
                        <Mic className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={isBusy || (!input.trim() && attachments.length === 0)}
                        className={cn(
                            'p-2.5 rounded-xl transition-all duration-300',
                            !isBusy && (input.trim() || attachments.length > 0)
                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                                : 'bg-secondary text-muted-foreground opacity-50 cursor-not-allowed'
                        )}
                    >
                        {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </div>
                {uploadError && <p className="text-[11px] text-red-500 mt-2">{uploadError}</p>}
                {isRecording && <p className="text-[11px] text-red-500 mt-2">Grabando audio... presiona el micrófono para detener.</p>}
                <p className="text-[10px] text-muted-foreground mt-1">`Enter` agrega salto de línea. `Ctrl+Enter` envía.</p>
                <p className="text-[10px] text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Respuestas basadas en datos reales de Fibra Core
                </p>
            </div>
        </div>
    )
}
