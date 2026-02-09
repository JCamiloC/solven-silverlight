'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
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
  EyeOff,
  Mail,
  Monitor,
  Package,
  Key,
  FileText
} from 'lucide-react'
// import { format } from 'date-fns'
// import { es } from 'date-fns/locale'
import { useAuth } from '@/hooks/use-auth'
import { useTicket, useUpdateTicket, useUpdateTicketStatus } from '@/hooks/use-tickets'
import { useTicketComments, useCreateTicketComment, useUpdateTicketComment, useDeleteTicketComment } from '@/hooks/use-ticket-comments'
import { useAssignableUsers } from '@/hooks/use-users'
import { useClients } from '@/hooks/use-clients'
import { useHardwareAsset } from '@/hooks/use-hardware'
import { useSoftwareLicense } from '@/hooks/use-software'
import { useAccessCredential } from '@/hooks/use-access-credentials'
import { TicketCommentInsert } from '@/lib/services/ticket-comments'
import { TicketDetailPDF } from '@/lib/services/ticket-detail-pdf'
import { toast } from 'sonner'

export default function TicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ticketId = params.id as string
  
  const [newComment, setNewComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [tiempoRespuesta, setTiempoRespuesta] = useState('')
  const [tiempoSolucion, setTiempoSolucion] = useState('')
  
  const { user, profile } = useAuth()
  const { data: ticket, isLoading: ticketLoading } = useTicket(ticketId)
  const { data: comments = [], isLoading: commentsLoading } = useTicketComments(ticketId)
  const { data: assignableUsers = [] } = useAssignableUsers()
  const { data: clients = [] } = useClients()
  
  // Obtener datos relacionados según categoría
  const { data: relatedHardware } = useHardwareAsset(ticket?.hardware_id || '')
  const { data: relatedSoftware } = useSoftwareLicense(ticket?.software_id || '')
  const { data: relatedAccess } = useAccessCredential(ticket?.access_credential_id || '')
  
  const updateTicketMutation = useUpdateTicket()
  const updateStatusMutation = useUpdateTicketStatus()
  const createCommentMutation = useCreateTicketComment()
  const updateCommentMutation = useUpdateTicketComment()
  const deleteCommentMutation = useDeleteTicketComment()

  // Inicializar tiempos cuando el ticket carga
  useEffect(() => {
    if (ticket) {
      setTiempoRespuesta(ticket.tiempo_respuesta || '')
      setTiempoSolucion(ticket.tiempo_solucion || '')
    }
  }, [ticket])

  // Validar que clientes solo vean sus propios tickets
  useEffect(() => {
    if (ticket && profile?.role === 'cliente') {
      // Verificar que el ticket pertenece al cliente
      if (ticket.client_id !== profile.client_id) {
        toast.error('No tienes permiso para ver este ticket')
        router.push('/dashboard/tickets')
      }
    }
  }, [ticket, profile, router])

  const handleUpdateTiempoRespuesta = () => {
    if (!ticket) return
    updateTicketMutation.mutate({
      id: ticketId,
      data: { tiempo_respuesta: tiempoRespuesta || undefined }
    }, {
      onSuccess: () => {
        toast.success('Tiempo de respuesta actualizado')
      },
      onError: () => {
        toast.error('Error al actualizar tiempo de respuesta')
      }
    })
  }

  const handleUpdateTiempoSolucion = () => {
    if (!ticket) return
    updateTicketMutation.mutate({
      id: ticketId,
      data: { tiempo_solucion: tiempoSolucion || undefined }
    }, {
      onSuccess: () => {
        toast.success('Tiempo de solución actualizado')
      },
      onError: () => {
        toast.error('Error al actualizar tiempo de solución')
      }
    })
  }

  // Función para generar PDF del ticket
  const handleGeneratePDF = async () => {
    if (!ticket) return

    setGeneratingPDF(true)
    try {
      const client = clients.find(c => c.id === ticket.client_id)
      const clientName = client?.name || 'Cliente'
      
      await TicketDetailPDF.generateTicketPDF(ticket, comments, clientName)
      toast.success('PDF generado exitosamente')
    } catch (error) {
      console.error('Error generando PDF:', error)
      toast.error('Error al generar el PDF')
    } finally {
      setGeneratingPDF(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      open: { variant: 'destructive' as const, icon: AlertTriangle, label: 'Abierto' },
      in_progress: { variant: 'default' as const, icon: Clock, label: 'En Progreso' },
      pendiente_confirmacion: { variant: 'secondary' as const, icon: Clock, label: 'Pendiente Confirmación' },
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
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/dashboard/tickets')}
          >
            <ArrowLeft className="mr-1 md:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Volver</span>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg md:text-2xl font-bold truncate">{ticket.ticket_number || `Ticket #${ticket.id.slice(-8)}`}</h1>
            <p className="text-sm text-muted-foreground truncate">{ticket.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGeneratePDF}
            disabled={generatingPDF}
          >
            {generatingPDF ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generar PDF
              </>
            )}
          </Button>
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
            <CardContent className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{ticket.description}</p>
              </div>

              {/* Attachment Section */}
              {ticket.attachment_url && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3">Archivo Adjunto</h3>
                  {ticket.attachment_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <div className="space-y-2">
                      <img 
                        src={ticket.attachment_url} 
                        alt={ticket.attachment_name}
                        className="max-w-full h-auto rounded-lg border"
                      />
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm text-muted-foreground">
                        <span className="truncate">{ticket.attachment_name}</span>
                        <span className="text-xs sm:text-sm">{(ticket.attachment_size! / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    </div>
                  ) : (
                    <a
                      href={ticket.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{ticket.attachment_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ticket.attachment_size && `${(ticket.attachment_size / 1024 / 1024).toFixed(2)} MB`}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Descargar
                      </Button>
                    </a>
                  )}
                </div>
              )}
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
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                        <div className="flex items-center flex-wrap gap-2">
                          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium text-sm">{comment.user.first_name} {comment.user.last_name}</span>
                          {comment.is_internal && (
                            <Badge variant="secondary" className="text-xs">
                              <EyeOff className="h-3 w-3 mr-1" />
                              Interno
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                          {user?.id === comment.created_by && (
                            <div className="flex gap-1">
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
                {/* Los técnicos siempre pueden comentar, los clientes solo si están asignados */}
                {(profile?.role === 'administrador' || profile?.role === 'lider_soporte' || profile?.role === 'agente_soporte') || 
                 (profile?.client_id === ticket.client_id && ticket.assigned_to) ? (
                  <>
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Escribir un comentario..."
                      rows={3}
                    />
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
                        className="w-full sm:w-auto"
                      >
                        {createCommentMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Enviar
                      </Button>
                    </div>
                    
                    {/* Acciones Rápidas - Solo para técnicos */}
                    {(profile?.role === 'administrador' || profile?.role === 'lider_soporte' || profile?.role === 'agente_soporte') && (
                      <div className="border-t pt-4 mt-4">
                        <h4 className="text-sm font-semibold mb-3">Acciones Rápidas</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm">Estado del Ticket</Label>
                            <Select 
                              value={ticket.status} 
                              onValueChange={handleStatusChange}
                              disabled={updateStatusMutation.isPending}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Abierto</SelectItem>
                                <SelectItem value="in_progress">En Progreso</SelectItem>
                                <SelectItem value="pendiente_confirmacion">Pendiente Confirmación</SelectItem>
                                <SelectItem value="resolved">Resuelto</SelectItem>
                                <SelectItem value="closed">Cerrado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Asignar a</Label>
                            <Select 
                              value={ticket.assigned_to || 'unassigned'} 
                              onValueChange={handleAssignmentChange}
                              disabled={updateTicketMutation.isPending}
                            >
                              <SelectTrigger className="h-9">
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
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Este ticket no tiene un usuario asignado aún</p>
                    <p className="text-xs">Los comentarios estarán disponibles cuando se asigne a alguien</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
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
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Categoría</p>
                  <p className="text-sm text-muted-foreground capitalize">{ticket.category}</p>
                </div>
              </div>
              
              {/* Información relacionada según categoría */}
              {ticket.category === 'hardware' && relatedHardware && (
                <div className="flex items-start space-x-2">
                  <Monitor className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Hardware</p>
                    <p className="text-sm text-muted-foreground truncate">{relatedHardware.name}</p>
                    {relatedHardware.serial_number && (
                      <p className="text-xs text-muted-foreground">S/N: {relatedHardware.serial_number}</p>
                    )}
                  </div>
                </div>
              )}
              
              {ticket.category === 'software' && relatedSoftware && (
                <div className="flex items-start space-x-2">
                  <Package className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Software</p>
                    <p className="text-sm text-muted-foreground truncate">{relatedSoftware.name}</p>
                    {relatedSoftware.license_key && (
                      <p className="text-xs text-muted-foreground font-mono truncate">{relatedSoftware.license_key}</p>
                    )}
                  </div>
                </div>
              )}
              
              {ticket.category === 'access' && relatedAccess && (
                <div className="flex items-start space-x-2">
                  <Key className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Acceso</p>
                    <p className="text-sm text-muted-foreground truncate">{relatedAccess.system_name}</p>
                    {relatedAccess.username && (
                      <p className="text-xs text-muted-foreground truncate">Usuario: {relatedAccess.username}</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Email de contacto */}
              {ticket.contact_email && (
                <div className="flex items-start space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Email de Contacto</p>
                    <p className="text-sm text-muted-foreground truncate">{ticket.contact_email}</p>
                  </div>
                </div>
              )}
              
              {/* Usuario Afectado */}
              {ticket.usuario_afectado && (
                <div className="flex items-start space-x-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Usuario Afectado</p>
                    <p className="text-sm text-muted-foreground truncate">{ticket.usuario_afectado}</p>
                  </div>
                </div>
              )}
              
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
              
              {/* Tiempos de Respuesta y Solución */}
              <div className="flex items-start space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-1">Tiempo de Respuesta</p>
                  <Input
                    type="text"
                    placeholder="Ej: 2 horas, 30 minutos"
                    value={tiempoRespuesta}
                    onChange={(e) => setTiempoRespuesta(e.target.value)}
                    onBlur={handleUpdateTiempoRespuesta}
                    className="h-8 text-sm"
                    disabled={profile?.role === 'cliente'}
                  />
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-1">Tiempo de Solución</p>
                  <Input
                    type="text"
                    placeholder="Ej: 1 día, 5 horas"
                    value={tiempoSolucion}
                    onChange={(e) => setTiempoSolucion(e.target.value)}
                    onBlur={handleUpdateTiempoSolucion}
                    className="h-8 text-sm"
                    disabled={profile?.role === 'cliente'}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}