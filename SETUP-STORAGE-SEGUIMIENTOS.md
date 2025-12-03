# Configuración de Supabase Storage para Seguimientos

## Paso a Paso para Configurar el Storage

### 1. Ejecutar la Migración SQL

Primero, ejecuta la migración para actualizar la tabla `hardware_seguimientos`:

```sql
-- En Supabase SQL Editor, ejecutar el archivo:
-- database/update-hardware-seguimientos-table.sql
```

Esta migración:
- ✅ Crea el ENUM `tipo_seguimiento` con 4 valores fijos
- ✅ Convierte la columna `tipo` de texto a ENUM
- ✅ Agrega columna `actividades` (jsonb)
- ✅ Agrega columna `foto_url` (text)
- ✅ Migra datos existentes al nuevo formato

### 2. Crear el Bucket de Storage en Supabase

1. Ve a tu proyecto en Supabase Dashboard
2. En el menú lateral, selecciona **Storage**
3. Click en **"New bucket"**
4. Configura el bucket con estos valores:
   - **Name**: `seguimientos-fotos`
   - **Public bucket**: ✅ Activado (para que las fotos sean accesibles públicamente)
   - **File size limit**: 5 MB (opcional, recomendado)
   - **Allowed MIME types**: `image/*` (solo imágenes)

5. Click en **"Create bucket"**

### 3. Configurar Políticas de Seguridad (RLS)

Después de crear el bucket, configura las políticas de acceso:

#### Política 1: Permitir Upload (INSERT)
```sql
-- Permite a usuarios autenticados subir archivos
CREATE POLICY "Usuarios autenticados pueden subir fotos de seguimientos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'seguimientos-fotos'
);
```

#### Política 2: Permitir Lectura (SELECT)
```sql
-- Permite lectura pública de las fotos
CREATE POLICY "Las fotos de seguimientos son públicas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'seguimientos-fotos');
```

#### Política 3: Permitir Eliminación (DELETE)
```sql
-- Permite a usuarios autenticados eliminar sus propias fotos
CREATE POLICY "Usuarios autenticados pueden eliminar fotos de seguimientos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'seguimientos-fotos');
```

### 4. Verificar la Configuración

Para verificar que todo está configurado correctamente:

1. Ve a **Storage** > **seguimientos-fotos** en Supabase Dashboard
2. Verifica que el bucket existe y es público
3. Ve a **Storage** > **Policies**
4. Confirma que las 3 políticas están activas

### 5. Probar el Formulario

1. Ejecuta el proyecto: `npm run dev`
2. Navega a: `/dashboard/clientes/[id]/hardware/[hardwareId]/seguimientos`
3. Completa el formulario:
   - Selecciona un **tipo de seguimiento**
   - Marca algunas **actividades**
   - Escribe el **detalle**
   - **Adjunta una foto** (opcional)
4. Click en **"Guardar Seguimiento"**

### 6. Verificar que Funcionó

Después de guardar:
- ✅ Deberías ver un toast verde: "Seguimiento guardado exitosamente"
- ✅ El seguimiento aparece en la tabla de historial
- ✅ Si adjuntaste foto, verás la URL en `foto_url` en la base de datos
- ✅ La foto está almacenada en Supabase Storage

### 7. Ver los Seguimientos Antiguos

Para ver los seguimientos que creaste antes:

**Opción A: Migrar datos existentes (Recomendado)**

Si tus seguimientos anteriores tienen `tipo` como texto libre, la migración SQL los mapeará automáticamente:
- Textos con "programado" → `mantenimiento_programado`
- Textos con "no programado" → `mantenimiento_no_programado`
- Textos con "remoto" → `soporte_remoto`
- Textos con "sitio" → `soporte_en_sitio`
- Otros → `soporte_remoto` (por defecto)

**Opción B: Verificar manualmente**

Si quieres verificar que los datos migraron correctamente:

```sql
-- Ver todos los seguimientos con sus nuevos valores
SELECT 
  id, 
  hardware_id, 
  tipo, 
  detalle, 
  actividades, 
  foto_url, 
  fecha_registro
FROM hardware_seguimientos
ORDER BY fecha_registro DESC;
```

### 8. Estructura Final de la Base de Datos

Después de la migración, la tabla `hardware_seguimientos` tendrá:

```sql
CREATE TABLE hardware_seguimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hardware_id uuid REFERENCES hardware_assets(id) ON DELETE CASCADE,
  tipo tipo_seguimiento NOT NULL,
  detalle text NOT NULL,
  actividades jsonb DEFAULT '[]'::jsonb,
  foto_url text,
  fecha_registro timestamp with time zone DEFAULT now(),
  creado_por uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

## Troubleshooting

### Los seguimientos no aparecen
- Verifica que ejecutaste la migración SQL
- Revisa que el campo `hardware_id` en la tabla coincide con el ID del hardware
- Verifica en Supabase SQL Editor: `SELECT * FROM hardware_seguimientos;`

### Error al subir foto
- Confirma que el bucket `seguimientos-fotos` existe
- Verifica que es un bucket público
- Revisa las políticas RLS del bucket
- Verifica que el archivo es una imagen válida (<5MB)

### Los seguimientos antiguos no aparecen
- Verifica que la migración SQL se ejecutó correctamente
- Revisa los valores del campo `tipo` con: `SELECT DISTINCT tipo FROM hardware_seguimientos;`
- Deberías ver solo los 4 valores del ENUM, no texto libre

## Archivos Modificados

- ✅ `src/lib/storage.ts` - Funciones helper para Storage
- ✅ `src/components/hardware/seguimientos-view.tsx` - Formulario con upload
- ✅ `src/services/hardware.ts` - Servicio actualizado
- ✅ `src/types/index.ts` - Tipos TypeScript
- ✅ `database/update-hardware-seguimientos-table.sql` - Migración SQL
