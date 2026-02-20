'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles, File as FileIcon, Mic } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSharedChat } from '@/lib/use-shared-chat'
import { RichTextMessage } from '@/components/chat/rich-text-message'

type ChatFilePart = {
    type: 'file'
    mediaType: string
    filename: string
    url: string
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

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [input, setInput] = useState('')
    const [attachments, setAttachments] = useState<File[]>([])
    const [isRecording, setIsRecording] = useState(false)
    const [recordError, setRecordError] = useState<string | null>(null)
    const [isSending, setIsSending] = useState(false)
    const { messages, sendMessage, status } = useSharedChat()
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const mediaStreamRef = useRef<MediaStream | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const isLoading = status === 'submitted' || status === 'streaming'
    const isBusy = isLoading || isSending

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        if (isOpen) {
            scrollToBottom()
        }
    }, [messages, isOpen])

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
            setRecordError('Este navegador no soporta grabación de audio')
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
                    const file = new File([blob], `audio-widget-${Date.now()}.${ext}`, { type: mimeType })
                    setAttachments([file])
                }
                audioChunksRef.current = []
                if (mediaStreamRef.current) {
                    mediaStreamRef.current.getTracks().forEach((track) => track.stop())
                    mediaStreamRef.current = null
                }
                setIsRecording(false)
            }

            recorder.start()
            setRecordError(null)
            setIsRecording(true)
        } catch (error) {
            setRecordError(error instanceof Error ? error.message : 'No se pudo iniciar la grabación')
            setIsRecording(false)
        }
    }

    const handleSend = async () => {
        const text = input.trim()
        if ((!text && attachments.length === 0) || isBusy) return

        setIsSending(true)
        try {
            const fileParts = await Promise.all(attachments.map(fileToPart))
            if (text && fileParts.length > 0) {
                await sendMessage({ text, files: fileParts })
            } else if (fileParts.length > 0) {
                await sendMessage({ files: fileParts })
            } else {
                await sendMessage({ text })
            }
            setInput('')
            setAttachments([])
            setRecordError(null)
        } catch (error) {
            setRecordError(error instanceof Error ? error.message : 'No se pudo enviar el mensaje')
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 animate-fade-in print:hidden">
            {/* Chat Window */}
            {isOpen && (
                <div className="w-[380px] h-[500px] bg-background/80 backdrop-blur-xl border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="p-4 border-b border-border/50 bg-secondary/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-electric-500 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">Fibra Bot</h3>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Online</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 hover:bg-background/50 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
                                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-2">
                                    <Sparkles className="w-6 h-6 text-primary" />
                                </div>
                                <h4 className="font-medium text-sm">¿En qué puedo ayudarte hoy?</h4>
                                <p className="text-xs text-muted-foreground max-w-[200px]">
                                    Pregúntame sobre proyectos, leads, finanzas o el equipo.
                                </p>
                            </div>
                        )}

                        {messages.map((m) => {
                            const text = m.parts
                                .filter((part): part is Extract<typeof m.parts[number], { type: 'text' }> => part.type === 'text')
                                .map((part) => part.text)
                                .join('')
                            const files = m.parts
                                .filter((part): part is Extract<typeof m.parts[number], { type: 'file' }> => part.type === 'file')

                            return (
                                <div
                                    key={m.id}
                                    className={cn(
                                        "flex items-start gap-3 max-w-[85%]",
                                        m.role === 'user' ? "ml-auto flex-row-reverse" : ""
                                    )}
                                >
                                    <div className={cn(
                                        "w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-xs",
                                        m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                                    )}>
                                        {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                                    </div>

                                    <div className={cn(
                                        "p-3 rounded-2xl text-sm shadow-sm",
                                        m.role === 'user'
                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                            : "bg-card border border-border/50 rounded-tl-none"
                                    )}>
                                        {text && (
                                            m.role === 'assistant'
                                                ? <RichTextMessage content={text} className="space-y-2" />
                                                : <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
                                        )}
                                        {!text && files.length > 0 && <p className="leading-relaxed">Adjunto enviado</p>}
                                        {files.length > 0 && (
                                            <div className="mt-2 flex flex-col gap-1.5">
                                                {files.map((file, idx) => (
                                                    <a
                                                        key={`${m.id}-f-${idx}`}
                                                        href={file.url}
                                                        download={file.filename || `archivo-${idx + 1}`}
                                                        className={cn(
                                                            "inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]",
                                                            m.role === 'user'
                                                                ? "border-white/30 bg-white/10 text-primary-foreground"
                                                                : "border-border bg-background text-foreground"
                                                        )}
                                                    >
                                                        <FileIcon className="w-3 h-3 shrink-0" />
                                                        <span className="truncate">{file.filename || `Archivo ${idx + 1}`}</span>
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}

                        {isLoading && messages[messages.length - 1]?.role === 'user' && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse ml-9">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Escribiendo...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-secondary/30 border-t border-border/50">
                        {attachments.length > 0 && (
                            <div className="mb-2 flex flex-wrap gap-1.5">
                                {attachments.map((file, idx) => (
                                    <span
                                        key={`${file.name}-${idx}`}
                                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px]"
                                    >
                                        <FileIcon className="w-3 h-3 text-muted-foreground" />
                                        <span className="max-w-[190px] truncate">{file.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => setAttachments((state) => state.filter((_, i) => i !== idx))}
                                            className="text-muted-foreground hover:text-foreground"
                                            aria-label={`Quitar ${file.name}`}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault()
                                await handleSend()
                            }}
                            className="flex gap-2 relative items-end"
                        >
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                        e.preventDefault()
                                        handleSend()
                                    }
                                }}
                                placeholder="Escribe tu mensaje..."
                                rows={2}
                                className="flex-1 bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/50 resize-none max-h-28 min-h-[44px]"
                                disabled={isBusy}
                            />
                            <button
                                type="button"
                                onClick={handleRecordToggle}
                                title={isRecording ? 'Detener grabación' : 'Grabar audio'}
                                disabled={isBusy && !isRecording}
                                className={cn(
                                    "p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center",
                                    isRecording
                                        ? "bg-red-500 text-white"
                                        : "bg-secondary text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Mic className="w-4 h-4" />
                            </button>
                            <button
                                type="submit"
                                disabled={isBusy || (input.trim() === '' && attachments.length === 0)}
                                className={cn(
                                    "p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center",
                                    input.trim() === '' && attachments.length === 0
                                        ? "bg-secondary text-muted-foreground cursor-not-allowed"
                                        : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                                )}
                            >
                                {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        </form>
                        <p className="mt-2 text-[10px] text-muted-foreground">Enter: salto de línea · Ctrl+Enter: enviar</p>
                        {isRecording && <p className="mt-2 text-[11px] text-red-500">Grabando audio... toca el mic para detener.</p>}
                        {recordError && <p className="mt-2 text-[11px] text-red-500">{recordError}</p>}
                    </div>
                </div>
            )}

            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="group relative w-14 h-14 bg-gradient-to-br from-primary to-electric-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-primary/40 transition-all hover:scale-105 active:scale-95"
                >
                    <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-20" />
                    <MessageSquare className="w-6 h-6 text-white relative z-10" />

                </button>
            )}
        </div>
    )
}
