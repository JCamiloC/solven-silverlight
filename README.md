# 🚀 Solven - Sistema de Gestión Integral
## Silverlight Colombia (Reemplazo de PC Health)

Sistema integral desarrollado específicamente para Silverlight Colombia, que reemplaza PC Health con tecnologías modernas y diseño siguiendo principios ISO 27001.

## 🚀 Características.

### Funcionalidades Principales..
- **Dashboard Moderno**: Interfaz responsiva con diseño profesional
- **Gestión de Hardware**: CRUD completo para inventario de equipos
- **Gestión de Software**: Seguimiento de licencias y renovaciones
- **Control de Accesos**: Gestión segura de credenciales
- **Sistema de Tickets**: Flujo completo de soporte técnico
- **Reportes**: Dashboards visuales por cliente
- **Autenticación**: Sistema de roles (Cliente, Agente, Líder, Administrador)

### Tecnologías Utilizadas
- **Framework**: Next.js 15 con App Router
- **Lenguaje**: TypeScript
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Estilos**: TailwindCSS + shadcn/ui + Radix UI
- **Iconos**: Lucide React
- **Estado**: React Query/SWR
- **Generación PDF**: jsPDF + html2canvas
- **Formularios**: React Hook Form + Zod

## 📁 Estructura del Proyecto

```
src/
├── app/                    # App Router (Next.js 15)
│   ├── dashboard/         # Páginas del dashboard
│   │   ├── hardware/      # Gestión de hardware
│   │   ├── software/      # Gestión de software
│   │   ├── accesos/       # Control de accesos
│   │   ├── reportes/      # Reportes y dashboards
│   │   └── tickets/       # Sistema de tickets
│   ├── auth/              # Autenticación
│   └── api/               # API Routes
├── components/            # Componentes reutilizables
│   ├── ui/               # Componentes base (shadcn/ui)
│   ├── dashboard/        # Componentes del dashboard
│   └── providers/        # Providers de contexto
├── lib/                  # Utilidades y configuraciones
│   └── supabase/        # Cliente de Supabase
├── services/             # Servicios de API
├── types/                # Definiciones de TypeScript
└── hooks/                # Custom hooks
```

## 🛠️ Configuración

### Prerrequisitos
- Node.js 18.17 o superior
- npm o yarn
- Cuenta de Supabase

### Instalación

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**
   ```bash
   cp .env.example .env.local
   ```
   
   Completar las variables en `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Configurar base de datos en Supabase**
   
   Ejecutar el siguiente SQL en el Supabase SQL Editor:

   ```sql
   -- Habilitar extensiones necesarias
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

   -- Tabla de perfiles de usuario
   CREATE TABLE profiles (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     first_name TEXT NOT NULL,
     last_name TEXT NOT NULL,
     phone TEXT,
     department TEXT,
     role TEXT NOT NULL CHECK (role IN ('cliente', 'agente_soporte', 'lider_soporte', 'administrador')),
     avatar_url TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Tabla de clientes
   CREATE TABLE clients (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name TEXT NOT NULL,
     email TEXT NOT NULL,
     phone TEXT,
     address TEXT,
     contact_person TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Tabla de activos de hardware
   CREATE TABLE hardware_assets (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     client_id UUID REFERENCES clients(id),
     name TEXT NOT NULL,
     type TEXT NOT NULL,
     brand TEXT NOT NULL,
     model TEXT NOT NULL,
     serial_number TEXT UNIQUE NOT NULL,
     specifications JSONB,
     purchase_date DATE NOT NULL,
     warranty_expiry DATE,
     status TEXT NOT NULL CHECK (status IN ('active', 'maintenance', 'retired')),
     location TEXT NOT NULL,
     assigned_to TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Tabla de logs de mantenimiento
   CREATE TABLE maintenance_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     asset_id UUID REFERENCES hardware_assets(id) ON DELETE CASCADE,
     type TEXT NOT NULL CHECK (type IN ('preventive', 'corrective', 'inspection')),
     description TEXT NOT NULL,
     performed_by UUID REFERENCES profiles(id),
     performed_at TIMESTAMP WITH TIME ZONE NOT NULL,
     cost DECIMAL(10,2),
     notes TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Tabla de licencias de software
   CREATE TABLE software_licenses (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     client_id UUID REFERENCES clients(id),
     name TEXT NOT NULL,
     vendor TEXT NOT NULL,
     version TEXT NOT NULL,
     license_key TEXT NOT NULL,
     license_type TEXT NOT NULL CHECK (license_type IN ('perpetual', 'subscription', 'oem')),
     seats INTEGER NOT NULL,
     purchase_date DATE NOT NULL,
     expiry_date DATE,
     cost DECIMAL(10,2) NOT NULL,
     status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Tabla de credenciales de acceso
   CREATE TABLE access_credentials (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     client_id UUID REFERENCES clients(id),
     system_name TEXT NOT NULL,
     username TEXT NOT NULL,
     password_hash TEXT NOT NULL,
     url TEXT,
     notes TEXT,
     created_by UUID REFERENCES profiles(id) NOT NULL,
     last_accessed TIMESTAMP WITH TIME ZONE,
     status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Tabla de logs de acceso
   CREATE TABLE access_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     credential_id UUID REFERENCES access_credentials(id) ON DELETE CASCADE,
     accessed_by UUID REFERENCES profiles(id) NOT NULL,
     accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     purpose TEXT NOT NULL,
     ip_address INET
   );

   -- Tabla de tickets
   CREATE TABLE tickets (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     client_id UUID REFERENCES clients(id),
     title TEXT NOT NULL,
     description TEXT NOT NULL,
     priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
     status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'pending', 'resolved', 'closed')),
     category TEXT NOT NULL CHECK (category IN ('hardware', 'software', 'network', 'access', 'other')),
     assigned_to UUID REFERENCES profiles(id),
     created_by UUID REFERENCES profiles(id) NOT NULL,
     resolved_at TIMESTAMP WITH TIME ZONE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Tabla de comentarios de tickets
   CREATE TABLE ticket_comments (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
     comment TEXT NOT NULL,
     created_by UUID REFERENCES profiles(id) NOT NULL,
     is_internal BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Tabla de reportes
   CREATE TABLE reports (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     client_id UUID REFERENCES clients(id),
     type TEXT NOT NULL CHECK (type IN ('hardware_summary', 'software_inventory', 'ticket_summary', 'maintenance_schedule')),
     title TEXT NOT NULL,
     description TEXT,
     data JSONB NOT NULL,
     generated_by UUID REFERENCES profiles(id) NOT NULL,
     generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Habilitar Row Level Security (RLS)
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
   ALTER TABLE hardware_assets ENABLE ROW LEVEL SECURITY;
   ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
   ALTER TABLE software_licenses ENABLE ROW LEVEL SECURITY;
   ALTER TABLE access_credentials ENABLE ROW LEVEL SECURITY;
   ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
   ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
   ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
   ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

   -- Políticas RLS para profiles
   CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
   CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
   CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
     EXISTS (
       SELECT 1 FROM profiles 
       WHERE user_id = auth.uid() 
       AND role IN ('administrador', 'lider_soporte')
     )
   );

   -- Políticas RLS para clientes (solo admins y líderes)
   CREATE POLICY "Admins can manage clients" ON clients FOR ALL USING (
     EXISTS (
       SELECT 1 FROM profiles 
       WHERE user_id = auth.uid() 
       AND role IN ('administrador', 'lider_soporte')
     )
   );

   -- Políticas RLS para hardware_assets
   CREATE POLICY "Support can view hardware" ON hardware_assets FOR SELECT USING (
     EXISTS (
       SELECT 1 FROM profiles 
       WHERE user_id = auth.uid() 
       AND role IN ('administrador', 'lider_soporte', 'agente_soporte')
     )
   );

   CREATE POLICY "Support can manage hardware" ON hardware_assets FOR ALL USING (
     EXISTS (
       SELECT 1 FROM profiles 
       WHERE user_id = auth.uid() 
       AND role IN ('administrador', 'lider_soporte', 'agente_soporte')
     )
   );

   -- Políticas RLS para tickets
   CREATE POLICY "Users can view own tickets" ON tickets FOR SELECT USING (
     created_by = auth.uid() OR 
     assigned_to = auth.uid() OR
     EXISTS (
       SELECT 1 FROM profiles 
       WHERE user_id = auth.uid() 
       AND role IN ('administrador', 'lider_soporte', 'agente_soporte')
     )
   );

   CREATE POLICY "Users can create tickets" ON tickets FOR INSERT WITH CHECK (
     created_by = auth.uid()
   );

   CREATE POLICY "Support can manage tickets" ON tickets FOR ALL USING (
     EXISTS (
       SELECT 1 FROM profiles 
       WHERE user_id = auth.uid() 
       AND role IN ('administrador', 'lider_soporte', 'agente_soporte')
     )
   );

   -- Políticas RLS para software_licenses
   CREATE POLICY "Support can manage software" ON software_licenses FOR ALL USING (
     EXISTS (
       SELECT 1 FROM profiles 
       WHERE user_id = auth.uid() 
       AND role IN ('administrador', 'lider_soporte', 'agente_soporte')
     )
   );

   -- Políticas RLS para access_credentials (solo admins)
   CREATE POLICY "Admins can manage credentials" ON access_credentials FOR ALL USING (
     EXISTS (
       SELECT 1 FROM profiles 
       WHERE user_id = auth.uid() 
       AND role = 'administrador'
     )
   );

   -- Función para actualizar updated_at automáticamente
   CREATE OR REPLACE FUNCTION update_updated_at_column()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = NOW();
     RETURN NEW;
   END;
   $$ language 'plpgsql';

   -- Triggers para updated_at
   CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
   CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
   CREATE TRIGGER update_hardware_assets_updated_at BEFORE UPDATE ON hardware_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
   CREATE TRIGGER update_software_licenses_updated_at BEFORE UPDATE ON software_licenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
   CREATE TRIGGER update_access_credentials_updated_at BEFORE UPDATE ON access_credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
   CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

   -- Función para crear perfil automáticamente al registrarse
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS TRIGGER AS $$
   BEGIN
     INSERT INTO public.profiles (user_id, first_name, last_name, role)
     VALUES (
       NEW.id,
       COALESCE(NEW.raw_user_meta_data->>'first_name', 'Usuario'),
       COALESCE(NEW.raw_user_meta_data->>'last_name', 'Nuevo'),
       COALESCE(NEW.raw_user_meta_data->>'role', 'cliente')
     );
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   -- Trigger para crear perfil automáticamente
   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

   -- Datos de ejemplo (opcional)
   INSERT INTO clients (name, email, contact_person) VALUES
   ('Empresa ABC S.A.', 'contacto@empresaabc.com', 'Juan Pérez'),
   ('Corporación XYZ', 'info@corpxyz.com', 'María González'),
   ('Startup DEF', 'admin@startupdef.com', 'Carlos López');
   ```

4. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```

   La aplicación estará disponible en `http://localhost:3000`

## 🔐 Sistema de Roles

### Cliente
- Crear y ver propios tickets
- Ver estado de equipos asignados

### Agente de Soporte
- Gestión completa de tickets
- CRUD de hardware y software

### Líder de Soporte
- Gestión de equipos de soporte
- Acceso a reportes avanzados

### Administrador
- Acceso completo al sistema
- Gestión de usuarios y roles

## 📊 Módulos Implementados

### 1. Dashboard Principal
- Métricas generales del sistema
- Resumen de tickets recientes
- Estado de módulos

### 2. Hardware
- Inventario completo de equipos
- Estados: Activo, Mantenimiento, Retirado
- Filtros y búsqueda avanzada

### 3. Tickets
- Sistema completo de tickets
- Prioridades: Baja, Media, Alta, Crítica
- Estados: Abierto, En Progreso, Pendiente, Resuelto, Cerrado

### 4. Autenticación
- Login/registro con Supabase
- Control de acceso por roles

## 🛡️ Seguridad (ISO 27001)

- **Autenticación robusta** con Supabase Auth
- **Row Level Security (RLS)** en base de datos
- **Control de acceso** basado en roles
- **Middleware** de autenticación

## 🚀 Scripts Disponibles

```bash
npm run dev          # Desarrollo
npm run build        # Construcción para producción
npm run start        # Inicio en producción
npm run lint         # Análisis de código
```

---

**Desarrollado con ❤️ para una gestión eficiente de mesa de ayuda**
