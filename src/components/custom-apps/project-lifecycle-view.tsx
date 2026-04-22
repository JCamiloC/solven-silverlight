'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  useCreateSoftwareDocument,
  useCreateSoftwareMeeting,
  useCreateSoftwareMeetingItem,
  useCreateSoftwarePostsaleAdjustment,
  useCreateSoftwareRelease,
  useSoftwareDocuments,
  useSoftwareMeetingItems,
  useSoftwareMeetings,
  useSoftwarePostsaleAdjustments,
  useSoftwareProjectPhases,
  useSoftwareReleases,
  useUpdateSoftwareMeetingItem,
  useUpdateSoftwarePostsaleAdjustment,
  useUpdateSoftwareProjectPhase,
  useUpdateSoftwareRelease,
} from '@/hooks/use-custom-applications'
import { useAuth } from '@/hooks/use-auth'
import { SoftwareMeetingItemStatus, SoftwarePhaseStatus, SoftwarePostsaleStatus, SoftwareReleaseStatus } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

const PHASE_STATUS_OPTIONS: Array<{ value: SoftwarePhaseStatus; label: string }> = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'bloqueada', label: 'Bloqueada' },
  { value: 'completada', label: 'Completada' },
]

const DOC_TYPE_OPTIONS = [
  { value: 'drp', label: 'DRP' },
  { value: 'caso_uso', label: 'Caso de uso' },
  { value: 'modelo_bd', label: 'Modelo de BD' },
  { value: 'acta_reunion', label: 'Acta de reunión' },
  { value: 'entrega_produccion', label: 'Entrega producción' },
  { value: 'manual', label: 'Manual' },
  { value: 'otro', label: 'Otro' },
]

const MEETING_TYPE_OPTIONS = [
  { value: 'kickoff', label: 'Kickoff' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'planeacion', label: 'Planeación' },
  { value: 'qa', label: 'QA' },
  { value: 'entrega', label: 'Entrega' },
  { value: 'postventa', label: 'Posventa' },
  { value: 'otro', label: 'Otro' },
]

const ITEM_TYPE_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'acuerdo', label: 'Acuerdo' },
  { value: 'riesgo', label: 'Riesgo' },
]

const ITEM_STATUS_OPTIONS: Array<{ value: SoftwareMeetingItemStatus; label: string }> = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'resuelto', label: 'Resuelto' },
  { value: 'cerrado', label: 'Cerrado' },
]

const RELEASE_STATUS_OPTIONS: Array<{ value: SoftwareReleaseStatus; label: string }> = [
  { value: 'planeada', label: 'Planeada' },
  { value: 'ejecutada', label: 'Ejecutada' },
  { value: 'fallida', label: 'Fallida' },
  { value: 'rollback', label: 'Rollback' },
]

const POSTSALE_STATUS_OPTIONS: Array<{ value: SoftwarePostsaleStatus; label: string }> = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'resuelto', label: 'Resuelto' },
  { value: 'cancelado', label: 'Cancelado' },
]

function formatDate(value?: string | null) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return format(parsed, 'dd/MM/yyyy HH:mm', { locale: es })
}

interface ProjectLifecycleViewProps {
  applicationId: string
}

export function ProjectLifecycleView({ applicationId }: ProjectLifecycleViewProps) {
  const { profile } = useAuth()
  const { data: phases = [], isLoading: loadingPhases } = useSoftwareProjectPhases(applicationId)
  const { data: documents = [], isLoading: loadingDocuments } = useSoftwareDocuments(applicationId)
  const { data: meetings = [], isLoading: loadingMeetings } = useSoftwareMeetings(applicationId)
  const { data: meetingItems = [], isLoading: loadingMeetingItems } = useSoftwareMeetingItems(applicationId)
  const { data: releases = [], isLoading: loadingReleases } = useSoftwareReleases(applicationId)
  const { data: postsale = [], isLoading: loadingPostsale } = useSoftwarePostsaleAdjustments(applicationId)

  const updatePhase = useUpdateSoftwareProjectPhase(applicationId)
  const createDocument = useCreateSoftwareDocument(applicationId)
  const createMeeting = useCreateSoftwareMeeting(applicationId)
  const createMeetingItem = useCreateSoftwareMeetingItem(applicationId)
  const updateMeetingItem = useUpdateSoftwareMeetingItem(applicationId)
  const createRelease = useCreateSoftwareRelease(applicationId)
  const updateRelease = useUpdateSoftwareRelease(applicationId)
  const createPostsale = useCreateSoftwarePostsaleAdjustment(applicationId)
  const updatePostsale = useUpdateSoftwarePostsaleAdjustment(applicationId)

  const [docType, setDocType] = useState('drp')
  const [docTitle, setDocTitle] = useState('')
  const [docVersion, setDocVersion] = useState('')
  const [docUrl, setDocUrl] = useState('')
  const [docSummary, setDocSummary] = useState('')

  const [meetingDate, setMeetingDate] = useState('')
  const [meetingType, setMeetingType] = useState('seguimiento')
  const [meetingSummary, setMeetingSummary] = useState('')
  const [meetingNotes, setMeetingNotes] = useState('')

  const [itemMeetingId, setItemMeetingId] = useState('')
  const [itemType, setItemType] = useState('pendiente')
  const [itemDescription, setItemDescription] = useState('')
  const [itemDueDate, setItemDueDate] = useState('')

  const [releaseVersion, setReleaseVersion] = useState('')
  const [releaseEnvironment, setReleaseEnvironment] = useState('staging')
  const [releaseDate, setReleaseDate] = useState('')
  const [releaseStatus, setReleaseStatus] = useState<SoftwareReleaseStatus>('planeada')
  const [releaseChangelog, setReleaseChangelog] = useState('')
  const [releaseDocUrl, setReleaseDocUrl] = useState('')

  const [postsaleTitle, setPostsaleTitle] = useState('')
  const [postsaleDetail, setPostsaleDetail] = useState('')
  const [postsalePriority, setPostsalePriority] = useState('media')

  const pendingMeetingItems = useMemo(
    () => meetingItems.filter((item) => item.status === 'pendiente' || item.status === 'en_progreso'),
    [meetingItems]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ciclo de Vida del Proyecto</CardTitle>
        <CardDescription>
          Gestión integral del proyecto B2B: fases, documentos, reuniones, salidas y posventa.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="fases" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="fases">Fases</TabsTrigger>
            <TabsTrigger value="documentacion">Documentación</TabsTrigger>
            <TabsTrigger value="reuniones">Reuniones</TabsTrigger>
            <TabsTrigger value="releases">Salidas</TabsTrigger>
            <TabsTrigger value="posventa">Posventa</TabsTrigger>
          </TabsList>

          <TabsContent value="fases" className="space-y-4">
            {loadingPhases ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Cargando fases...
              </div>
            ) : (
              <div className="space-y-3">
                {phases.map((phase) => (
                  <div key={phase.id} className="rounded-md border p-3 space-y-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium">{phase.title}</p>
                        <p className="text-xs text-muted-foreground">{phase.phase_key}</p>
                      </div>
                      <Badge variant="outline">{phase.completion_percentage}%</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label>Estado</Label>
                        <Select
                          value={phase.status}
                          onValueChange={(value) =>
                            updatePhase.mutate({
                              id: phase.id,
                              data: { status: value as SoftwarePhaseStatus },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PHASE_STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Inicio plan</Label>
                        <Input
                          type="date"
                          value={phase.planned_start_date || ''}
                          onChange={(event) =>
                            updatePhase.mutate({
                              id: phase.id,
                              data: { planned_start_date: event.target.value || null },
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Fin plan</Label>
                        <Input
                          type="date"
                          value={phase.planned_end_date || ''}
                          onChange={(event) =>
                            updatePhase.mutate({
                              id: phase.id,
                              data: { planned_end_date: event.target.value || null },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {phases.length === 0 && (
                  <p className="text-sm text-muted-foreground">No hay fases registradas aún. Ejecuta el SQL para seed inicial.</p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="documentacion" className="space-y-4">
            <div className="rounded-md border p-3 space-y-3">
              <p className="font-medium">Nuevo documento</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOC_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Título</Label>
                  <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
                </div>
                <div>
                  <Label>Versión</Label>
                  <Input value={docVersion} onChange={(e) => setDocVersion(e.target.value)} placeholder="v1.0" />
                </div>
                <div>
                  <Label>URL documento</Label>
                  <Input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div className="md:col-span-2">
                  <Label>Resumen</Label>
                  <Textarea rows={3} value={docSummary} onChange={(e) => setDocSummary(e.target.value)} />
                </div>
              </div>
              <LoadingButton
                type="button"
                loading={createDocument.isPending}
                loadingText="Guardando..."
                onClick={async () => {
                  if (!docTitle.trim()) return
                  await createDocument.mutateAsync({
                    application_id: applicationId,
                    doc_type: docType as any,
                    title: docTitle.trim(),
                    version: docVersion || null,
                    storage_url: docUrl || null,
                    summary: docSummary || null,
                    created_by: profile?.id || null,
                  })
                  setDocTitle('')
                  setDocVersion('')
                  setDocUrl('')
                  setDocSummary('')
                }}
              >
                Guardar documento
              </LoadingButton>
            </div>

            {loadingDocuments ? (
              <div className="text-sm text-muted-foreground">Cargando documentos...</div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="rounded-md border p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{doc.doc_type} {doc.version ? `• ${doc.version}` : ''}</p>
                    </div>
                    {doc.storage_url ? (
                      <a href={doc.storage_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                        Abrir
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin URL</span>
                    )}
                  </div>
                ))}
                {documents.length === 0 && <p className="text-sm text-muted-foreground">Sin documentación registrada.</p>}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reuniones" className="space-y-4">
            <div className="rounded-md border p-3 space-y-3">
              <p className="font-medium">Nueva reunión</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Fecha reunión</Label>
                  <Input type="datetime-local" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={meetingType} onValueChange={setMeetingType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MEETING_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Resumen</Label>
                  <Input value={meetingSummary} onChange={(e) => setMeetingSummary(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Notas</Label>
                  <Textarea rows={3} value={meetingNotes} onChange={(e) => setMeetingNotes(e.target.value)} />
                </div>
              </div>
              <LoadingButton
                type="button"
                loading={createMeeting.isPending}
                loadingText="Guardando..."
                onClick={async () => {
                  if (!meetingDate) return
                  await createMeeting.mutateAsync({
                    application_id: applicationId,
                    meeting_date: new Date(meetingDate).toISOString(),
                    meeting_type: meetingType as any,
                    attendees: [],
                    summary: meetingSummary || null,
                    notes: meetingNotes || null,
                    created_by: profile?.id || null,
                  })
                  setMeetingDate('')
                  setMeetingSummary('')
                  setMeetingNotes('')
                }}
              >
                Guardar reunión
              </LoadingButton>
            </div>

            <div className="rounded-md border p-3 space-y-3">
              <p className="font-medium">Nuevo pendiente/acuerdo/riesgo</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Reunión</Label>
                  <Select value={itemMeetingId} onValueChange={setItemMeetingId}>
                    <SelectTrigger><SelectValue placeholder="Seleccione reunión" /></SelectTrigger>
                    <SelectContent>
                      {meetings.map((meeting) => (
                        <SelectItem key={meeting.id} value={meeting.id}>
                          {formatDate(meeting.meeting_date)} - {meeting.meeting_type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={itemType} onValueChange={setItemType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ITEM_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Descripción</Label>
                  <Textarea rows={3} value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} />
                </div>
                <div>
                  <Label>Fecha compromiso</Label>
                  <Input type="date" value={itemDueDate} onChange={(e) => setItemDueDate(e.target.value)} />
                </div>
              </div>
              <LoadingButton
                type="button"
                loading={createMeetingItem.isPending}
                loadingText="Guardando..."
                onClick={async () => {
                  if (!itemMeetingId || !itemDescription.trim()) return
                  await createMeetingItem.mutateAsync({
                    meeting_id: itemMeetingId,
                    application_id: applicationId,
                    item_type: itemType as any,
                    description: itemDescription.trim(),
                    due_date: itemDueDate || null,
                    status: 'pendiente',
                  })
                  setItemDescription('')
                  setItemDueDate('')
                }}
              >
                Guardar ítem
              </LoadingButton>
            </div>

            {(loadingMeetings || loadingMeetingItems) ? (
              <div className="text-sm text-muted-foreground">Cargando reuniones e ítems...</div>
            ) : (
              <div className="space-y-3">
                {pendingMeetingItems.map((item) => (
                  <div key={item.id} className="rounded-md border p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.item_type} • compromiso: {item.due_date || '-'}
                      </p>
                    </div>
                    <Select
                      value={item.status}
                      onValueChange={(value) =>
                        updateMeetingItem.mutate({ id: item.id, data: { status: value as SoftwareMeetingItemStatus } })
                      }
                    >
                      <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ITEM_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {pendingMeetingItems.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sin pendientes activos.</p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="releases" className="space-y-4">
            <div className="rounded-md border p-3 space-y-3">
              <p className="font-medium">Registrar salida</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Versión</Label>
                  <Input value={releaseVersion} onChange={(e) => setReleaseVersion(e.target.value)} placeholder="v1.0.0" />
                </div>
                <div>
                  <Label>Ambiente</Label>
                  <Select value={releaseEnvironment} onValueChange={setReleaseEnvironment}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="produccion">Producción</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fecha</Label>
                  <Input type="datetime-local" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select value={releaseStatus} onValueChange={(value) => setReleaseStatus(value as SoftwareReleaseStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RELEASE_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Changelog</Label>
                  <Textarea rows={3} value={releaseChangelog} onChange={(e) => setReleaseChangelog(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>URL acta/entrega</Label>
                  <Input value={releaseDocUrl} onChange={(e) => setReleaseDocUrl(e.target.value)} placeholder="https://..." />
                </div>
              </div>
              <LoadingButton
                type="button"
                loading={createRelease.isPending}
                loadingText="Guardando..."
                onClick={async () => {
                  if (!releaseVersion.trim() || !releaseDate) return
                  await createRelease.mutateAsync({
                    application_id: applicationId,
                    version: releaseVersion.trim(),
                    environment: releaseEnvironment as any,
                    release_date: new Date(releaseDate).toISOString(),
                    status: releaseStatus,
                    changelog: releaseChangelog || null,
                    delivery_document_url: releaseDocUrl || null,
                    delivered_by: profile?.id || null,
                  })
                  setReleaseVersion('')
                  setReleaseDate('')
                  setReleaseChangelog('')
                  setReleaseDocUrl('')
                }}
              >
                Guardar salida
              </LoadingButton>
            </div>

            {loadingReleases ? (
              <div className="text-sm text-muted-foreground">Cargando salidas...</div>
            ) : (
              <div className="space-y-2">
                {releases.map((release) => (
                  <div key={release.id} className="rounded-md border p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="font-medium">{release.version} • {release.environment}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(release.release_date)}</p>
                    </div>
                    <Select
                      value={release.status}
                      onValueChange={(value) =>
                        updateRelease.mutate({ id: release.id, data: { status: value as SoftwareReleaseStatus } })
                      }
                    >
                      <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RELEASE_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {releases.length === 0 && <p className="text-sm text-muted-foreground">Sin salidas registradas.</p>}
              </div>
            )}
          </TabsContent>

          <TabsContent value="posventa" className="space-y-4">
            <div className="rounded-md border p-3 space-y-3">
              <p className="font-medium">Registrar ajuste posventa</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <Label>Título</Label>
                  <Input value={postsaleTitle} onChange={(e) => setPostsaleTitle(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Detalle</Label>
                  <Textarea rows={3} value={postsaleDetail} onChange={(e) => setPostsaleDetail(e.target.value)} />
                </div>
                <div>
                  <Label>Prioridad</Label>
                  <Select value={postsalePriority} onValueChange={setPostsalePriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <LoadingButton
                type="button"
                loading={createPostsale.isPending}
                loadingText="Guardando..."
                onClick={async () => {
                  if (!postsaleTitle.trim()) return
                  await createPostsale.mutateAsync({
                    application_id: applicationId,
                    title: postsaleTitle.trim(),
                    detail: postsaleDetail || null,
                    priority: postsalePriority as any,
                    status: 'pendiente',
                    created_by: profile?.id || null,
                  })
                  setPostsaleTitle('')
                  setPostsaleDetail('')
                }}
              >
                Guardar ajuste
              </LoadingButton>
            </div>

            {loadingPostsale ? (
              <div className="text-sm text-muted-foreground">Cargando posventa...</div>
            ) : (
              <div className="space-y-2">
                {postsale.map((item) => (
                  <div key={item.id} className="rounded-md border p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.priority} • {formatDate(item.requested_at)}</p>
                    </div>
                    <Select
                      value={item.status}
                      onValueChange={(value) =>
                        updatePostsale.mutate({ id: item.id, data: { status: value as SoftwarePostsaleStatus } })
                      }
                    >
                      <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {POSTSALE_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {postsale.length === 0 && <p className="text-sm text-muted-foreground">Sin ajustes posventa registrados.</p>}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
