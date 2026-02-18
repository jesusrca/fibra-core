'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, Paperclip, Mic, ArrowRight, Zap, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
}

export default function ChatbotPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Hola, soy el asistente IA de Fibra Core. Puedo ayudarte a analizar finanzas, gestionar proyectos o reportar métricas comerciales. ¿Qué necesitas saber hoy?',
            timestamp: new Date(),
        },
    ])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isTyping])

    const handleSend = () => {
        if (!input.trim()) return

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMsg])
        setInput('')
        setIsTyping(true)

        // Simulate AI response
        setTimeout(() => {
            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `Basado en la información de la plataforma, he encontrado que el proyecto "Identidad Visual Nexo Corp" tiene un avance del 65% y está dentro del presupuesto. Respecto a tus finanzas, los ingresos de febrero ($22,700) superan los gastos, manteniendo un margen saludable del 27%.`,
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, assistantMsg])
            setIsTyping(false)
        }, 1500)
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
            {messages.length === 1 && (
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
                {messages.map((m) => (
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
                                m.role === 'assistant' ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
                            )}
                        >
                            {m.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>
                        <div
                            className={cn(
                                'p-4 rounded-2xl text-sm leading-relaxed shadow-sm',
                                m.role === 'assistant'
                                    ? 'bg-card border border-border/60 text-foreground'
                                    : 'bg-primary text-primary-foreground font-medium'
                            )}
                        >
                            <div className="whitespace-pre-wrap">{m.content}</div>
                            <div
                                className={cn(
                                    'text-[10px] mt-2 opacity-50',
                                    m.role === 'user' ? 'text-right' : ''
                                )}
                            >
                                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}
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
                <div className="glass-card p-2 flex items-end gap-2 border-primary/20 shadow-lg shadow-primary/5 focus-within:border-primary/40 focus-within:shadow-primary/10 transition-all duration-300">
                    <button className="btn-ghost p-2 text-muted-foreground">
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSend()
                            }
                        }}
                        placeholder="Pregúntame sobre tus finanzas, proyectos o ventas..."
                        className="flex-1 bg-transparent border-none resize-none px-3 py-2.5 text-sm text-foreground focus:ring-0 placeholder:text-muted-foreground max-h-32 min-h-[44px]"
                        rows={1}
                    />
                    <button className="btn-ghost p-2 text-muted-foreground">
                        <Mic className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className={cn(
                            'p-2.5 rounded-xl transition-all duration-300',
                            input.trim() && !isTyping
                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                                : 'bg-secondary text-muted-foreground opacity-50 cursor-not-allowed'
                        )}
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-[10px] text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Respuestas basadas en datos reales de Fibra Core
                </p>
            </div>
        </div>
    )
}
