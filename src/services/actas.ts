import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

function dataUrlToBlob(dataUrl: string) {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

async function dataUrlToJpegBlob(dataUrl: string, quality = 0.9) {
  // convierte dataURL (png/whatever) a JPEG Blob usando canvas
  return await new Promise<Blob>((resolve, reject) => {
    try {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('No canvas context'))
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Conversion failed'))
          resolve(blob)
        }, 'image/jpeg', quality)
      }
      img.onerror = (e) => reject(new Error('Image load error'))
      img.src = dataUrl
    } catch (e) {
      reject(e)
    }
  })
}

export const ActasService = {
  async createActa({ hardware_asset_id, generador_nombre, generador_cedula, generador_firma_dataurl, generador_firma_url }: any) {
    const token = (globalThis?.crypto && (globalThis.crypto as any).randomUUID)
      ? (globalThis.crypto as any).randomUUID()
      : Math.random().toString(36).slice(2)

    // Crear registro sin urls
    const { data, error } = await supabase
      .from('hardware_actas')
      .insert([
        {
          hardware_asset_id,
          generador_nombre,
          generador_cedula,
          generador_firma_url: generador_firma_url || null,
          link_temporal: token,
          estado_firma: 'falta_cliente',
        },
      ])
      .select()
      .single()

    if (error) throw new Error(error.message)
    const acta = data

    // Subir firma generador si viene
    if (generador_firma_dataurl) {
      const blob = dataUrlToBlob(generador_firma_dataurl)
      // No incluir el nombre del bucket en el path: Supabase lo añade automáticamente
        const path = `private/${acta.id}/generador.png`
      const upload = await supabase.storage.from('actas').upload(path, blob, { upsert: true })
      if (upload.error) {
        console.error('Error uploading generador firma:', upload.error)
        throw new Error(upload.error.message)
      }

      const publicUrl = supabase.storage.from('actas').getPublicUrl(path).data?.publicUrl || null

      // actualizar registro
      const { error: updateError } = await supabase
        .from('hardware_actas')
        .update({ generador_firma_url: publicUrl, actualizado_en: new Date().toISOString() })
        .eq('id', acta.id)

      if (updateError) throw new Error(updateError.message)

      return { ...acta, generador_firma_url: publicUrl, link_temporal: token }
    }

    return { ...acta, link_temporal: token, generador_firma_url: generador_firma_url || acta.generador_firma_url }
  },

  async getByToken(token: string) {
    const { data, error } = await supabase
      .from('hardware_actas')
      .select('*')
      .eq('link_temporal', token)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data
  },

  async getByHardwareAssetId(hardware_asset_id: string) {
    const { data, error } = await supabase
      .from('hardware_actas')
      .select('*')
      .eq('hardware_asset_id', hardware_asset_id)
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data
  },

  async signByClient({ token, cliente_nombre, cliente_cedula, cliente_firma_dataurl }: any) {
    const acta = await this.getByToken(token)
    if (!acta) throw new Error('No se encontró acta para ese link')

    // Subir firma cliente
    if (cliente_firma_dataurl) {
        const blob = await dataUrlToJpegBlob(cliente_firma_dataurl, 0.9)
        const path = `public/${acta.id}/cliente.jpg`
      const upload = await supabase.storage.from('actas').upload(path, blob, { upsert: true })
      if (upload.error) {
        console.error('Error uploading cliente firma:', upload.error)
        throw new Error(upload.error.message)
      }

      const publicUrl = supabase.storage.from('actas').getPublicUrl(path).data?.publicUrl || null

      const { error } = await supabase
        .from('hardware_actas')
        .update({ cliente_nombre, cliente_cedula, cliente_firma_url: publicUrl, estado_firma: 'completo', actualizado_en: new Date().toISOString() })
        .eq('id', acta.id)

      if (error) throw new Error(error.message)

      return { ...acta, cliente_nombre, cliente_cedula, cliente_firma_url: publicUrl, estado_firma: 'completo' }
    }

    // Si no hay firma image, solo actualizar campos
    const { error } = await supabase
      .from('hardware_actas')
      .update({ cliente_nombre, cliente_cedula, actualizado_en: new Date().toISOString() })
      .eq('id', acta.id)

    if (error) throw new Error(error.message)
    return { ...acta, cliente_nombre, cliente_cedula }
  },
}

export default ActasService
