"use client"

import Link from "next/link"
import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { Bot, Headset, MessageCircle, Send, UserRound, X } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

type ChatRole = "client" | "assistant" | "agent" | "system"
type ChatStatus = "bot" | "waiting_agent" | "agent_connected" | "closed"

interface ChatMessage {
  id: string
  sender_type: ChatRole
  content: string
  created_at: string
}

interface ChatSession {
  id: string
  status: ChatStatus
}

interface ChatViewer {
  userId: string
  role: string | null
  canSupport: boolean
}

export function FloatingChat() {
  const realtimeEnabled = process.env.NEXT_PUBLIC_CHAT_REALTIME_ENABLED === "true"
  const [supabase] = useState(() => createClient())
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [session, setSession] = useState<ChatSession | null>(null)
  const [viewer, setViewer] = useState<ChatViewer | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [isEscalating, setIsEscalating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const statusLabel = useMemo(() => {
    if (!session) return "Sin sesion"
    if (session.status === "bot") return "Asistente IA"
    if (session.status === "waiting_agent") return "Esperando agente"
    if (session.status === "agent_connected") return "Agente conectado"
    return "Conversacion cerrada"
  }, [session])

  const canSend = useMemo(() => {
    return (
      inputValue.trim().length > 0 &&
      !isSending &&
      !!session &&
      session.status !== "closed"
    )
  }, [inputValue, isSending, session])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadMessages = async (sessionId: string) => {
    const response = await fetch(`/api/chat/messages?sessionId=${sessionId}`, {
      method: "GET",
      cache: "no-store",
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.error || "No se pudieron cargar mensajes")
    }

    setMessages(data.messages ?? [])
    if (data.session?.status) {
      setSession({ id: sessionId, status: data.session.status })
    }
  }

  const loadSession = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/chat/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo abrir el chat")
      }

      setSession(data.session)
      setViewer(data.viewer)
      await loadMessages(data.session.id)
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Error inesperado"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    if (session) return
    loadSession()
  }, [isOpen, session])

  useEffect(() => {
    if (!isOpen || !session) return

    if (!realtimeEnabled) {
      const interval = window.setInterval(() => {
        loadMessages(session.id).catch(() => {
          // Ignore transient polling refresh errors.
        })
      }, 3000)

      return () => window.clearInterval(interval)
    }

    const messageChannel = supabase
      .channel(`chat-session-messages-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_chat_messages",
          filter: `session_id=eq.${session.id}`,
        },
        () => {
          loadMessages(session.id).catch(() => {
            // Ignore transient subscription refresh errors.
          })
        }
      )
      .subscribe()

    const sessionChannel = supabase
      .channel(`chat-session-state-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_chat_sessions",
          filter: `id=eq.${session.id}`,
        },
        () => {
          loadMessages(session.id).catch(() => {
            // Ignore transient subscription refresh errors.
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messageChannel)
      supabase.removeChannel(sessionChannel)
    }
  }, [isOpen, realtimeEnabled, session, supabase])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session || !canSend) return

    const content = inputValue.trim()
    setInputValue("")
    setIsSending(true)
    setError(null)

    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          content,
          actor: "client",
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo enviar el mensaje")
      }

      if (data?.sessionStatus) {
        setSession((prev) => (prev ? { ...prev, status: data.sessionStatus } : prev))
      }

      await loadMessages(session.id)
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : "Error al enviar"
      setError(message)
    } finally {
      setIsSending(false)
    }
  }

  const handleEscalate = async () => {
    if (!session) return
    setIsEscalating(true)
    setError(null)

    try {
      const response = await fetch("/api/chat/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo escalar el chat")
      }

      setSession(data.session)
      await loadMessages(session.id)
    } catch (escalateError) {
      const message = escalateError instanceof Error ? escalateError.message : "Error al escalar"
      setError(message)
    } finally {
      setIsEscalating(false)
    }
  }

  return (
    <div className="fixed right-3 bottom-3 z-50 sm:right-6 sm:bottom-6">
      <div
        className={cn(
          "absolute right-0 bottom-16 w-[calc(100vw-1.5rem)] max-w-[24rem] transition-all duration-200 sm:w-[24rem]",
          isOpen
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-3 opacity-0 pointer-events-none"
        )}
      >
        <Card className="gap-0 overflow-hidden border shadow-xl">
          <CardHeader className="space-y-2 border-b bg-background/90 px-4 py-3 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold">Asistente Solven</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={session?.status === "agent_connected" ? "default" : "secondary"}>
                  {statusLabel}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsOpen(false)}
                  aria-label="Cerrar chat"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {viewer?.canSupport && (
              <Link href="/dashboard/soporte-chat" className="text-xs text-sky-700 hover:underline inline-flex items-center gap-1">
                <Headset className="h-3.5 w-3.5" />
                Ir al panel de soporte
              </Link>
            )}
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-[22rem] px-4 py-3">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando chat...</p>
              ) : (
                <div className="space-y-3">
                  {messages.length === 0 && !error && (
                    <div className="bg-muted/70 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                      Hola, cuentame tu problema y te ayudo. Si lo prefieres, puedes escalar a soporte humano.
                    </div>
                  )}

                  {messages.map((message) => {
                    if (message.sender_type === "system") {
                      return (
                        <div key={message.id} className="text-center text-xs text-muted-foreground">
                          {message.content}
                        </div>
                      )
                    }

                    const isClient = message.sender_type === "client"
                    const isAgent = message.sender_type === "agent"

                    return (
                      <div
                        key={message.id}
                        className={cn("flex", isClient ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                            isClient
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : isAgent
                                ? "bg-sky-100 text-sky-900 rounded-bl-sm"
                                : "bg-muted text-foreground rounded-bl-sm"
                          )}
                        >
                          {isAgent && (
                            <div className="mb-1 inline-flex items-center gap-1 text-[11px] font-medium text-sky-700">
                              <UserRound className="h-3 w-3" />
                              Soporte humano
                            </div>
                          )}
                          {message.content}
                        </div>
                      </div>
                    )
                  })}

                  {error && (
                    <p className="text-xs text-destructive">{error}</p>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
          </CardContent>

          <CardFooter className="border-t p-3 flex-col items-stretch gap-2">
            {!!session &&
              !viewer?.canSupport &&
              session.status === "bot" && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isEscalating}
                  onClick={handleEscalate}
                >
                  <Headset className="h-4 w-4" />
                  {isEscalating ? "Escalando..." : "Hablar con soporte humano"}
                </Button>
              )}

            <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
              <Input
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Escribe tu mensaje..."
                className="h-9"
                autoComplete="off"
                disabled={!session || session.status === "closed"}
              />
              <Button type="submit" size="icon" disabled={!canSend} aria-label="Enviar mensaje">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>

      <Button
        type="button"
        size="icon-lg"
        className="rounded-full shadow-lg"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Cerrar asistente" : "Abrir asistente"}
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </Button>

      {!isOpen && (
        <div className="bg-background/95 text-muted-foreground absolute right-14 bottom-2 hidden rounded-full border px-3 py-1 text-xs shadow-sm backdrop-blur sm:flex sm:items-center sm:gap-1">
          <Bot className="h-3.5 w-3.5" />
          Chat de soporte
        </div>
      )}
    </div>
  )
}
