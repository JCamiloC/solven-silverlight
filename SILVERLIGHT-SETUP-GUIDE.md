# 🚀 GUÍA COMPLETA: CONFIGURACIÓN SUPABASE PARA SOLVEN
## Silverlight Colombia - Reemplazo de PC Health

### 📋 PASO 1: CREAR PROYECTO EN SUPABASE

1. **Acceder a Supabase Dashboard**
   - Ir a: https://supabase.com/dashboard
   - Iniciar sesión o crear cuenta

2. **Crear Nuevo Proyecto**
   - Clic en "New Project"
   - **Organization**: Seleccionar o crear "Silverlight Colombia"
   - **Name**: `solven-silverlight`
   - **Database Password**: Generar contraseña segura (guardar en lugar seguro)
   - **Region**: `South America (São Paulo)` (mejor latencia para Colombia)
   - **Pricing Plan**: 
     - `Free` para desarrollo/testing
     - `Pro` para producción (recomendado)

3. **Esperar Creación del Proyecto** (2-3 minutos)

---

### 🔑 PASO 2: OBTENER CLAVES DE CONFIGURACIÓN

1. **Ir a Project Settings**
   - Dashboard → Proyecto `solven-silverlight` → Settings → API

2. **Copiar Información Importante**:
   ```
   Project URL: https://[PROJECT_ID].supabase.co
   anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (🚨 CONFIDENCIAL)
   ```

---

### 🗃️ PASO 3: CONFIGURAR BASE DE DATOS

1. **Ir a SQL Editor**
   - Dashboard → SQL Editor

2. **Ejecutar Scripts de Creación** (en orden):

#### 3.1 Crear Extensiones y Configuración Inicial
```sql
-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Habilitar RLS globalmente
ALTER DATABASE postgres SET row_security = on;
```

#### 3.2 Ejecutar Script de Creación de Usuarios Administrador
- Ir a la carpeta `/database/` del proyecto
- Abrir `create-admin-user.sql`
- Copiar y ejecutar en SQL Editor

#### 3.3 Ejecutar Función de Creación de Usuarios
- Abrir `create_users_function.sql`
- Copiar y ejecutar en SQL Editor

#### 3.4 Insertar Datos de Prueba (Opcional)
- Abrir `tickets-sample-data.sql`
- Copiar y ejecutar en SQL Editor

---

### 📁 PASO 4: CONFIGURAR STORAGE

1. **Ir a Storage**
   - Dashboard → Storage

2. **Crear Bucket Principal**
   - Clic "New bucket"
   - **Name**: `solven-files`
   - **Public**: ✅ Enabled
   - Clic "Create bucket"

3. **Configurar Políticas de Storage**
```sql
-- En SQL Editor, ejecutar:

-- Política para lectura pública de archivos
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'solven-files');

-- Política para que usuarios autenticados puedan subir archivos
CREATE POLICY "Authenticated users can upload" ON storage.objects 
FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'solven-files');

-- Política para que usuarios puedan actualizar sus propios archivos
CREATE POLICY "Users can update own files" ON storage.objects 
FOR UPDATE USING (auth.uid()::text = (storage.foldername(name))[1] AND bucket_id = 'solven-files');
```

---

### 🔐 PASO 5: CONFIGURAR AUTENTICACIÓN

1. **Ir a Authentication Settings**
   - Dashboard → Authentication → Settings

2. **Configurar Opciones Básicas**:
   - **Enable email confirmations**: ✅
   - **Enable phone confirmations**: ❌ (por ahora)
   - **Double confirm email changes**: ✅
   - **Enable email change confirmations**: ✅

3. **Configurar Email Templates** (Opcional):
   - Dashboard → Authentication → Email Templates
   - Personalizar con branding de Silverlight

4. **Configurar URL Settings**:
   - **Site URL**: `http://localhost:3000` (desarrollo)
   - **Redirect URLs**: `http://localhost:3000/auth/callback`

---

### ⚙️ PASO 6: CONFIGURAR VARIABLES DE ENTORNO

1. **Crear archivo `.env.local`** en la raíz del proyecto:

```bash
# Copiar desde .env.local.template y completar con tus datos:

# SUPABASE CONFIGURATION (desde Step 2)
NEXT_PUBLIC_SUPABASE_URL=https://[TU_PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[TU_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[TU_SERVICE_ROLE_KEY]

# CONFIGURACIÓN DE AMBIENTE
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CLIENT_NAME="Silverlight Colombia"
NEXT_PUBLIC_DEFAULT_THEME=silverlight

# CONFIGURACIÓN DE ALMACENAMIENTO
NEXT_PUBLIC_STORAGE_BUCKET=solven-files
NEXT_PUBLIC_MAX_FILE_SIZE=10

# CONFIGURACIÓN DE SEGURIDAD
NEXTAUTH_SECRET=tu-super-secret-jwt-key-aqui
NEXTAUTH_URL=http://localhost:3000

# CONFIGURACIÓN ESPECÍFICA DE SILVERLIGHT
DB_TABLE_PREFIX=silverlight_
TIMEZONE=America/Bogota
LOCALE=es-CO
CURRENCY=COP
```

---

### 👤 PASO 7: CREAR USUARIO ADMINISTRADOR INICIAL

1. **Ir a SQL Editor** y ejecutar:

```sql
-- Crear usuario administrador para Silverlight
SELECT create_admin_user(
  'admin@silverlight.com.co',
  'Admin123!',
  'Administrador',
  'Silverlight',
  'Administrador del Sistema Solven'
);
```

---

### 🧪 PASO 8: VERIFICAR INSTALACIÓN

1. **Instalar dependencias**:
```bash
npm install
```

2. **Ejecutar en modo desarrollo**:
```bash
npm run dev
```

3. **Verificar funcionalidad**:
   - Ir a: http://localhost:3000
   - Probar login con: `admin@silverlight.com.co` / `Admin123!`
   - Verificar que carguen todos los módulos
   - Probar crear un ticket de prueba

---

### 🔧 PASO 9: CONFIGURACIÓN ADICIONAL (OPCIONAL)

#### 9.1 Configurar Dominio Personalizado (Producción)
1. Dashboard → Settings → Custom Domains
2. Agregar dominio: `solven.silverlight.com.co`
3. Configurar DNS según instrucciones

#### 9.2 Configurar Email SMTP (Producción)
1. Dashboard → Settings → Auth
2. SMTP Settings → Configure with company email

#### 9.3 Configurar Backups Automáticos
1. Dashboard → Settings → Database
2. Point-in-time Recovery → Enable

---

### 📊 PASO 10: MONITOREO Y MANTENIMIENTO

1. **Dashboard de Métricas**:
   - Revisar Usage & Billing regularmente
   - Configurar alertas de límites

2. **Logs y Debugging**:
   - Dashboard → Logs (consultar errores)
   - Dashboard → Database → Logs

3. **Performance Monitoring**:
   - Revisar Query Performance
   - Optimizar consultas lentas

---

### 🚨 PASO 11: SEGURIDAD EN PRODUCCIÓN

1. **Variables de Entorno Producción**:
```bash
# NO exponer service_role_key en frontend
# Usar variables de servidor seguras
# Configurar CORS adecuadamente
```

2. **RLS (Row Level Security)**:
   - Verificar que todas las tablas tengan RLS habilitado
   - Probar políticas de seguridad

3. **Backup y Recuperación**:
   - Programar backups regulares
   - Probar procedimientos de recuperación

---

### 📞 SOPORTE Y RECURSOS

- **Documentación Supabase**: https://supabase.com/docs
- **Dashboard**: https://supabase.com/dashboard
- **Suporte Técnico**: https://supabase.com/support
- **Comunidad**: https://github.com/supabase/supabase/discussions

---

### ✅ CHECKLIST DE VERIFICACIÓN

- [x] Proyecto Supabase creado
- [x] Variables de entorno configuradas  
- [ ] **PENDIENTE: Base de datos inicializada con scripts**
- [ ] **PENDIENTE: Storage bucket creado y configurado**
- [ ] **PENDIENTE: Usuario administrador creado**
- [ ] Autenticación configurada
- [ ] Aplicación ejecutándose en desarrollo
- [ ] Login funcional
- [ ] Módulos principales cargando
- [ ] Creación de tickets funcionando

## 🚨 SOLUCIÓN RÁPIDA AL ERROR ACTUAL

**Error**: `infinite recursion detected in policy for relation "profiles"`

**Solución**:
1. Ir a SQL Editor en Supabase Dashboard
2. Ejecutar el script: `database/setup-silverlight.sql`
3. Crear usuario admin manualmente en Authentication > Users
4. Crear bucket de Storage

---

## 🎉 ¡CONFIGURACIÓN COMPLETADA!

Una vez completados todos los pasos, Solven estará listo para Silverlight Colombia con:
- ✅ Branding personalizado (#24add6)
- ✅ Base de datos completamente configurada
- ✅ Sistema de autenticación funcional
- ✅ Almacenamiento de archivos
- ✅ Todos los módulos habilitados
- ✅ Listo para desarrollo y producción