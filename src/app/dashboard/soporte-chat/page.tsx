"use client"

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Headset, MessageSquare, Send, UserRound, XCircle } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

type SessionStatus = 'waiting_agent' | 'agent_connected' | 'closed' | 'bot'
type SenderType = 'client' | 'assistant' | 'agent' | 'system'

interface QueueSession {
  id: string
  status: SessionStatus
  client_user_id: string
  assigned_agent_user_id: string | null
  human_requested_at: string | null
  last_message_at: string
  isMine: boolean
  isUnassigned: boolean
  client_profile?: {
    first_name?: string
    last_name?: string
    email?: string
  }
}

function getSessionBadge(status: SessionStatus) {
  if (status === 'waiting_agent') {
    return { label: 'En espera', variant: 'outline' as const }
  }

  if (status === 'agent_connected') {
    return { label: 'Con agente', variant: 'default' as const }
  }

  if (status === 'bot') {
    return { label: 'En bot', variant: 'secondary' as const }
  }

  return { label: 'Cerrado', variant: 'destructive' as const }
}

interface ChatMessage {
  id: string
  sender_type: SenderType
  content: string
  created_at: string
}

export default function SupportChatPage() {
  const realtimeEnabled = process.env.NEXT_PUBLIC_CHAT_REALTIME_ENABLED === 'true'
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const { loading, profile, isSupport } = useAuth()

  const [queue, setQueue] = useState<QueueSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedSession = useMemo(
    () => queue.find((item) => item.id === selectedSessionId) ?? null,
    [queue, selectedSessionId]
  )

  useEffect(() => {
    if (!loading && !isSupport()) {
      router.push('/dashboard')
    }
  }, [loading, isSupport, router])

  const loadQueue = async () => {
    const response = await fetch('/api/chat/support/queue', { cache: 'no-store' })
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data?.error || 'No se pudo cargar la cola')
    }

    setQueue(data.queue ?? [])
    if (!selectedSessionId && data.queue?.length > 0) {
      setSelectedSessionId(data.queue[0].id)
    }
  }

  const loadMessages = async (sessionId: string) => {
    const response = await fetch(`/api/chat/messages?sessionId=${sessionId}`, { cache: 'no-store' })
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data?.error || 'No se pudieron cargar mensajes')
    }

    setMessages(data.messages ?? [])
  }

  useEffect(() => {
    if (loading || !isSupport()) return

    loadQueue().catch((queueError) => {
      const message = queueError instanceof Error ? queueError.message : 'Error de cola'
      setError(message)
    })

    if (!realtimeEnabled) {
      const interval = window.setInterval(() => {
        loadQueue().catch(() => {
          // Ignore transient polling refresh errors.
        })
      }, 4000)

      return () => window.clearInterval(interval)
    }

    const queueChannel = supabase
      .channel('support-chat-queue')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_chat_sessions',
        },
        () => {
          loadQueue().catch(() => {
            // Ignore transient subscription refresh errors.
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(queueChannel)
    }
  }, [loading, isSupport, realtimeEnabled, supabase])

  useEffect(() => {
    if (!selectedSessionId) {
      setMessages([])
      return
    }

    loadMessages(selectedSessionId).catch((messagesError) => {
      const message = messagesError instanceof Error ? messagesError.message : 'Error de mensajes'
      setError(message)
    })

    if (!realtimeEnabled) {
      const interval = window.setInterval(() => {
        loadMessages(selectedSessionId).catch(() => {
          // Ignore transient polling refresh errors.
        })
      }, 2500)

      return () => window.clearInterval(interval)
    }

    const messagesChannel = supabase
      .channel(`support-chat-messages-${selectedSessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_chat_messages',
          filter: `session_id=eq.${selectedSessionId}`,
        },
        () => {
          loadMessages(selectedSessionId).catch(() => {
            // Ignore transient subscription refresh errors.
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
    }
  }, [realtimeEnabled, selectedSessionId, supabase])

  const claimSession = async (sessionId: string) => {
    const response = await fetch('/api/chat/support/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.error || 'No se pudo reclamar la sesion')
    }

    await loadQueue()
    await loadMessages(sessionId)
  }

  const closeSession = async (sessionId: string) => {
    const response = await fetch('/api/chat/support/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.error || 'No se pudo cerrar la sesion')
    }

    await loadQueue()
    setMessages([])
    setSelectedSessionId(null)
  }

  const sendAgentMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedSessionId) return

    const content = inputValue.trim()
    if (!content) return

    setIsSending(true)
    setInputValue('')

    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          content,
          actor: 'agent',
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo enviar el mensaje')
      }

      await loadMessages(selectedSessionId)
      await loadQueue()
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'Error al enviar'
      setError(message)
    } finally {
      setIsSending(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>
  }

  if (!profile || !isSupport()) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold inline-flex items-center gap-2">
          <Headset className="h-6 w-6" />
          Soporte en vivo
        </h1>
        <Badge variant="secondary">{queue.length} chats activos</Badge>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cola de atencion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {queue.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay chats pendientes.</p>
            )}

            {queue.map((item) => {
              const clientName = `${item.client_profile?.first_name || ''} ${item.client_profile?.last_name || ''}`.trim()
              const displayName = clientName || item.client_profile?.email || 'Cliente'
              const badge = getSessionBadge(item.status)

              return (
                <button
                  key={item.id}
                  className={cn(
                    'w-full rounded-lg border p-3 text-left transition',
                    selectedSessionId === item.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  )}
                  onClick={() => setSelectedSessionId(item.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    <Badge variant={badge.variant}>
                      {badge.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(item.last_message_at).toLocaleString()}</p>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">Conversacion</CardTitle>
              {selectedSession && (
                <div className="flex items-center gap-2">
                  {selectedSession.isUnassigned ? (
                    <Button size="sm" onClick={() => claimSession(selectedSession.id)}>
                      Tomar chat
                    </Button>
                  ) : selectedSession.isMine ? (
                    <Button variant="destructive" size="sm" onClick={() => closeSession(selectedSession.id)}>
                      <XCircle className="h-4 w-4" />
                      Cerrar
                    </Button>
                  ) : (
                    <Badge variant="outline">Tomado por otro agente</Badge>
                  )}
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {!selectedSessionId ? (
              <p className="text-sm text-muted-foreground">Selecciona un chat para comenzar.</p>
            ) : (
              <>
                <ScrollArea className="h-[420px] rounded-md border p-3">
                  <div className="space-y-3">
                    {messages.map((message) => {
                      if (message.sender_type === 'system') {
                        return (
                          <div key={message.id} className="text-center text-xs text-muted-foreground">
                            {message.content}
                          </div>
                        )
                      }

                      const isAgent = message.sender_type === 'agent'
                      const isClient = message.sender_type === 'client'

                      return (
                        <div key={message.id} className={cn('flex', isAgent ? 'justify-end' : 'justify-start')}>
                          <div
                            className={cn(
                              'max-w-[80%] rounded-xl px-3 py-2 text-sm',
                              isAgent
                                ? 'bg-primary text-primary-foreground'
                                : isClient
                                  ? 'bg-muted text-foreground'
                                  : 'bg-sky-100 text-sky-900'
                            )}
                          >
                            <div className="inline-flex items-center gap-1 text-[11px] opacity-80 mb-1">
                              {isAgent ? <UserRound className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                              {isAgent ? 'Agente' : isClient ? 'Cliente' : 'Asistente'}
                            </div>
                            {message.content}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>

                <form className="flex gap-2" onSubmit={sendAgentMessage}>
                  <Input
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    placeholder="Escribe respuesta para el cliente..."
                    disabled={!selectedSession || !selectedSession.isMine}
                  />
                  <Button type="submit" disabled={isSending || !selectedSession?.isMine}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
