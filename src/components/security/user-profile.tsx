'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { User, Phone, Mail, Building2, Calendar, Shield } from 'lucide-react'

export function UserProfile() {
  const { profile, user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
  })

  const supabase = createClient()

  useEffect(() => {
    if (profile && user) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        email: user.email || '',
      })
    }
  }, [profile, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !user) return

    setLoading(true)
    try {
      // Actualizar perfil en la tabla profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', profile.user_id)

      if (profileError) throw profileError

      // Actualizar email en auth.users si ha cambiado
      if (formData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email
        })
        
        if (emailError) {
          // Si falla la actualización de email, mostramos advertencia pero no error total
          toast.warning('Perfil actualizado, pero no se pudo cambiar el email. Verifica el nuevo email.')
        } else {
          toast.success('Perfil actualizado correctamente. Verifica tu nuevo email para confirmar el cambio.')
        }
      } else {
        toast.success('Perfil actualizado correctamente')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Error al actualizar el perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const getUserInitials = () => {
    if (!profile) return 'U'
    return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
  }

  const getRoleDisplay = () => {
    if (!profile) return 'Usuario'
    const roleMap = {
      administrador: 'Administrador',
      lider_soporte: 'Líder de Soporte',
      agente_soporte: 'Agente de Soporte',
      cliente: 'Cliente',
    }
    return roleMap[profile.role] || profile.role
  }

  if (!profile || !user) {
    return <div>Cargando...</div>
  }

  return (
    <div className="space-y-6">
      {/* User Info Section */}
      <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-lg border">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-lg bg-blue-100 text-blue-700">
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h3 className="text-lg font-medium">
            {profile.first_name} {profile.last_name}
          </h3>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {getRoleDisplay()}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            Miembro desde {new Date(profile.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* User Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor="first_name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Nombre
            </Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              placeholder="Ingresa tu nombre"
              required
            />
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label htmlFor="last_name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Apellido
            </Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              placeholder="Ingresa tu apellido"
              required
            />
          </div>

          {/* Email (Editable) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Correo Electrónico
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="tu@empresa.com"
              required
            />
            <p className="text-xs text-muted-foreground">
              Si cambias el email, deberás verificar la nueva dirección
            </p>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Teléfono
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Ingresa tu teléfono"
              type="tel"
            />
          </div>

          {/* Rol (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="role" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Rol
            </Label>
            <Input
              id="role"
              value={getRoleDisplay()}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              El rol solo puede ser modificado por un administrador
            </p>
          </div>
        </div>

        {/* Additional Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
          <div className="space-y-1">
            <Label className="text-sm font-medium text-muted-foreground">
              ID de Usuario
            </Label>
            <p className="text-sm font-mono bg-white px-2 py-1 rounded border">
              {profile.user_id}
            </p>
          </div>
          
          <div className="space-y-1">
            <Label className="text-sm font-medium text-muted-foreground">
              Última Actualización
            </Label>
            <p className="text-sm">
              {new Date(profile.updated_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </div>
  )
}