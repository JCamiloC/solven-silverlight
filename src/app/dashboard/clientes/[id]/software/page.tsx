"use client";
import { useParams, useRouter } from 'next/navigation';
import { CustomAppTable, CustomAppStats, CustomAppForm } from '@/components/custom-apps';
import { SoftwareLicenseTable, SoftwareLicenseStats, SoftwareLicenseForm } from '@/components/software';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useCustomApplicationsByClient } from '@/hooks/use-custom-applications';
import { useClient } from '@/hooks/use-clients';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Package, Key } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loading } from '@/components/ui/loading';

export default function ClienteSoftwarePage() {
  const { id } = useParams();
  const router = useRouter();
  const clientId = typeof id === 'string' ? id : '';
  const [activeTab, setActiveTab] = useState('applications');
  const [showAppDialog, setShowAppDialog] = useState(false);
  const [showLicenseDialog, setShowLicenseDialog] = useState(false);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [editingLicenseId, setEditingLicenseId] = useState<string | null>(null);
  const { data: applications, isLoading, error } = useCustomApplicationsByClient(clientId);
  const { data: client, isLoading: isLoadingClient } = useClient(clientId);

  const editingApp = editingAppId 
    ? applications?.find(app => app.id === editingAppId)
    : undefined;

  const handleEditApp = (id: string) => {
    setEditingAppId(id);
    setShowAppDialog(true);
  };

  const handleCloseAppDialog = () => {
    setShowAppDialog(false);
    setEditingAppId(null);
  };

  const handleEditLicense = (id: string) => {
    setEditingLicenseId(id);
    setShowLicenseDialog(true);
  };

  const handleCloseLicenseDialog = () => {
    setShowLicenseDialog(false);
    setEditingLicenseId(null);
  };

  if (error) {
    return (
      <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
        <div className="container mx-auto py-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-destructive">Error al cargar los datos</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {error.message || 'Ocurrió un error inesperado'}
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (isLoadingClient) {
    return (
      <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading size="lg" text="Cargando información del cliente..." />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/clientes/${clientId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Software de {client?.name || 'Cliente'}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gestión de aplicaciones y licencias del cliente
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList>
              <TabsTrigger value="applications" className="gap-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Aplicaciones</span>
                <span className="sm:hidden">Apps</span>
              </TabsTrigger>
              <TabsTrigger value="licenses" className="gap-2">
                <Key className="h-4 w-4" />
                <span className="hidden sm:inline">Licencias</span>
              </TabsTrigger>
            </TabsList>

            <Button
              onClick={() => {
                if (activeTab === 'applications') {
                  setShowAppDialog(true);
                } else {
                  setShowLicenseDialog(true);
                }
              }}
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              {activeTab === 'applications' ? 'Nueva Aplicación' : 'Nueva Licencia'}
            </Button>
          </div>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-4">
            <CustomAppStats clientId={clientId} />
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Aplicaciones Personalizadas</h2>
              </div>
              <CustomAppTable clientId={clientId} onEdit={handleEditApp} />
            </div>
          </TabsContent>

          {/* Licenses Tab */}
          <TabsContent value="licenses" className="space-y-4">
            <SoftwareLicenseStats clientId={clientId} />
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Licencias Comerciales</h2>
              </div>
              <SoftwareLicenseTable clientId={clientId} onEdit={handleEditLicense} />
            </div>
          </TabsContent>
        </Tabs>

        {/* Application Dialog */}
        <Dialog open={showAppDialog} onOpenChange={handleCloseAppDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAppId ? 'Editar Aplicación' : 'Agregar Nueva Aplicación'}
              </DialogTitle>
              <DialogDescription>
                {editingAppId
                  ? 'Actualiza la información de la aplicación'
                  : 'Complete los datos de la aplicación personalizada.'}
              </DialogDescription>
            </DialogHeader>
            <CustomAppForm 
              application={editingApp}
              onSuccess={handleCloseAppDialog}
              onCancel={handleCloseAppDialog}
              clientId={clientId}
            />
          </DialogContent>
        </Dialog>

        {/* License Dialog */}
        <Dialog open={showLicenseDialog} onOpenChange={handleCloseLicenseDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingLicenseId ? 'Editar Licencia' : 'Agregar Nueva Licencia'}
              </DialogTitle>
              <DialogDescription>
                {editingLicenseId
                  ? 'Actualiza la información de la licencia'
                  : 'Complete los datos de la licencia comercial.'}
              </DialogDescription>
            </DialogHeader>
            <SoftwareLicenseForm 
              licenseId={editingLicenseId || undefined}
              onSuccess={handleCloseLicenseDialog}
              onCancel={handleCloseLicenseDialog}
              clientId={clientId}
            />
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}

