'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
// import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
// Dialog components removed for simplicity
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  Send,
  ArrowLeft,
  Edit,
  Trash2,
  User,
  Calendar,
  Tag,
  Target,
  Loader2,
  EyeOff
} from 'lucide-react'
// import { format } from 'date-fns'
// import { es } from 'date-fns/locale'
import { useAuth } from '@/hooks/use-auth'
import { useTicket, useUpdateTicket, useUpdateTicketStatus } from '@/hooks/use-tickets'
import { useTicketComments, useCreateTicketComment, useUpdateTicketComment, useDeleteTicketComment } from '@/hooks/use-ticket-comments'
import { useAssignableUsers } from '@/hooks/use-users'
import { useClients } from '@/hooks/use-clients'
import { TicketCommentInsert } from '@/lib/services/ticket-comments'

export default function TicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ticketId = params.id as string
  
  const [newComment, setNewComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState('')
  
  const { user } = useAuth()
  const { data: ticket, isLoading: ticketLoading } = useTicket(ticketId)
  const { data: comments = [], isLoading: commentsLoading } = useTicketComments(ticketId)
  const { data: assignableUsers = [] } = useAssignableUsers()
  const { data: clients = [] } = useClients()
  
  const updateTicketMutation = useUpdateTicket()
  const updateStatusMutation = useUpdateTicketStatus()
  const createCommentMutation = useCreateTicketComment()
  const updateCommentMutation = useUpdateTicketComment()
  const deleteCommentMutation = useDeleteTicketComment()

  const getStatusBadge = (status: string) => {
    const variants = {
      open: { variant: 'destructive' as const, icon: AlertTriangle, label: 'Abierto' },
      in_progress: { variant: 'default' as const, icon: Clock, label: 'En Progreso' },
      pending: { variant: 'secondary' as const, icon: Clock, label: 'Pendiente' },
      resolved: { variant: 'outline' as const, icon: CheckCircle, label: 'Resuelto' },
      closed: { variant: 'secondary' as const, icon: XCircle, label: 'Cerrado' },
    }
    
    const config = variants[status as keyof typeof variants] || variants.open
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const variants = {
      critical: 'destructive' as const,
      high: 'destructive' as const,
      medium: 'default' as const,
      low: 'secondary' as const,
    }
    
    const labels = {
      critical: 'Crítica',
      high: 'Alta',
      medium: 'Media',
      low: 'Baja',
    }
    
    return (
      <Badge variant={variants[priority as keyof typeof variants] || 'default'}>
        {labels[priority as keyof typeof labels] || priority}
      </Badge>
    )
  }

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate({
      id: ticketId,
      status: newStatus as any
    })
  }

  const handleAssignmentChange = (assignedTo: string) => {
    updateTicketMutation.mutate({
      id: ticketId,
      data: { assigned_to: assignedTo === 'unassigned' ? undefined : assignedTo }
    })
  }

  const handleSubmitComment = () => {
    if (!newComment.trim() || !user) return
    
    const commentData: TicketCommentInsert = {
      ticket_id: ticketId,
      comment: newComment.trim(),
      created_by: user.id,
      is_internal: isInternal
    }
    
    createCommentMutation.mutate(commentData, {
      onSuccess: () => {
        setNewComment('')
        setIsInternal(false)
      }
    })
  }

  const handleEditComment = (commentId: string, currentText: string) => {
    setEditingComment(commentId)
    setEditCommentText(currentText)
  }

  const handleUpdateComment = () => {
    if (!editCommentText.trim() || !user || !editingComment) return
    
    updateCommentMutation.mutate({
      id: editingComment,
      comment: editCommentText.trim(),
      userId: user.id,
      ticketId
    }, {
      onSuccess: () => {
        setEditingComment(null)
        setEditCommentText('')
      }
    })
  }

  const handleDeleteComment = (commentId: string) => {
    if (!user) return
    
    if (confirm('¿Estás seguro de que deseas eliminar este comentario?')) {
      deleteCommentMutation.mutate({
        id: commentId,
        userId: user.id,
        ticketId
      })
    }
  }

  if (ticketLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <XCircle className="h-16 w-16 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-xl font-semibold">Ticket no encontrado</h2>
          <p className="text-muted-foreground">El ticket solicitado no existe o no tienes permisos para verlo.</p>
        </div>
        <Button onClick={() => router.push('/dashboard/tickets')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Tickets
        </Button>
      </div>
    )
  }

  const client = clients.find(c => c.id === ticket.client_id)
  const assignedUser = assignableUsers.find(u => u.id === ticket.assigned_to)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/dashboard/tickets')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Ticket #{ticket.id.slice(-8)}</h1>
            <p className="text-muted-foreground">{ticket.title}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(ticket.status)}
          {getPriorityBadge(ticket.priority)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-5" />
                Descripción del Ticket
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{ticket.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-5" />
                Comentarios ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Comments List */}
              {commentsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay comentarios aún</p>
                  <p className="text-sm">Sé el primero en comentar</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {comments.map((comment) => (
                    <div 
                      key={comment.id} 
                      className={`p-4 rounded-lg border ${
                        comment.is_internal 
                          ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' 
                          : 'bg-background'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{comment.user.first_name} {comment.user.last_name}</span>
                          {comment.is_internal && (
                            <Badge variant="secondary" className="text-xs">
                              <EyeOff className="h-3 w-3 mr-1" />
                              Interno
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                          {user?.id === comment.created_by && (
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditComment(comment.id, comment.comment)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteComment(comment.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      {editingComment === comment.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editCommentText}
                            onChange={(e) => setEditCommentText(e.target.value)}
                            placeholder="Editar comentario..."
                            rows={3}
                          />
                          <div className="flex space-x-2">
                            <Button size="sm" onClick={handleUpdateComment}>
                              Guardar
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setEditingComment(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add Comment Form */}
              <div className="border-t pt-4 space-y-4">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escribir un comentario..."
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="internal"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="internal" className="text-sm">
                      <EyeOff className="h-4 w-4 inline mr-1" />
                      Comentario interno
                    </Label>
                  </div>
                  <Button 
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || createCommentMutation.isPending}
                  >
                    {createCommentMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Enviar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Estado del Ticket</Label>
                <Select 
                  value={ticket.status} 
                  onValueChange={handleStatusChange}
                  disabled={updateStatusMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Abierto</SelectItem>
                    <SelectItem value="in_progress">En Progreso</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="resolved">Resuelto</SelectItem>
                    <SelectItem value="closed">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Asignar a</Label>
                <Select 
                  value={ticket.assigned_to || 'unassigned'} 
                  onValueChange={handleAssignmentChange}
                  disabled={updateTicketMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sin asignar</SelectItem>
                    {assignableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información del Ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Cliente</p>
                  <p className="text-sm text-muted-foreground">
                    {client?.name || 'Sin asignar'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Asignado a</p>
                  <p className="text-sm text-muted-foreground">
                    {assignedUser ? `${assignedUser.first_name} ${assignedUser.last_name}` : 'Sin asignar'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Categoría</p>
                  <p className="text-sm text-muted-foreground capitalize">{ticket.category}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Creado</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {ticket.resolved_at && (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Resuelto</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(ticket.resolved_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}