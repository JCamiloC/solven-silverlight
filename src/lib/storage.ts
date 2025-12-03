import { createClient } from '@/lib/supabase/client'

const BUCKET_NAME = 'seguimientos-fotos'

/**
 * Sube una foto al bucket de Supabase Storage
 * @param file - El archivo a subir
 * @param hardwareId - ID del hardware para organizar las fotos
 * @returns La URL pública de la foto subida
 */
export async function uploadSeguimientoFoto(
  file: File,
  hardwareId: string
): Promise<string> {
  const supabase = createClient()
  
  // Generar nombre único para el archivo
  const timestamp = Date.now()
  const fileExt = file.name.split('.').pop()
  const fileName = `${hardwareId}/${timestamp}.${fileExt}`

  // Subir el archivo
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Error uploading file:', error)
    throw new Error(`Error al subir la foto: ${error.message}`)
  }

  // Obtener la URL pública
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

/**
 * Elimina una foto del bucket de Supabase Storage
 * @param filePath - Ruta del archivo en el bucket (ej: "hardware-id/timestamp.jpg")
 */
export async function deleteSeguimientoFoto(filePath: string): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath])

  if (error) {
    console.error('Error deleting file:', error)
    throw new Error(`Error al eliminar la foto: ${error.message}`)
  }
}
