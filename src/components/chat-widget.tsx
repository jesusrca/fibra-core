'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSharedChat } from '@/lib/use-shared-chat'

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [input, setInput] = useState('')
    const { messages, sendMessage, status } = useSharedChat()
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const isLoading = status === 'submitted' || status === 'streaming'

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        if (isOpen) {
            scrollToBottom()
        }
    }, [messages, isOpen])

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

                        {messages.map((m) => (
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
                                    <p className="whitespace-pre-wrap leading-relaxed">
                                        {m.parts
                                            .filter((part) => part.type === 'text')
                                            .map((part) => part.text)
                                            .join('')}
                                    </p>
                                </div>
                            </div>
                        ))}

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
                        <form
                            onSubmit={(e) => {
                                e.preventDefault()
                                const text = input.trim()
                                if (!text || isLoading) return
                                sendMessage({ text })
                                setInput('')
                            }}
                            className="flex gap-2 relative"
                        >
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Escribe tu mensaje..."
                                className="flex-1 bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/50"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || input.trim() === ''}
                                className={cn(
                                    "p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center",
                                    input.trim() === ''
                                        ? "bg-secondary text-muted-foreground cursor-not-allowed"
                                        : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                                )}
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        </form>
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

                    {/* Notification Badge (Fake for now) */}
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-background" />
                </button>
            )}
        </div>
    )
}
