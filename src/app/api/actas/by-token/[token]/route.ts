import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Endpoint público: obtiene datos mínimos del acta por token de link.
 * Usa service role porque el firmante no tiene sesión y RLS solo permite staff.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token: rawToken } = await context.params
    const token = rawToken?.trim()
    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: acta, error } = await admin
      .from('hardware_actas')
      .select(
        `
        id,
        hardware_asset_id,
        generador_nombre,
        cliente_nombre,
        cliente_cedula,
        estado_firma,
        link_temporal,
        creado_en,
        actualizado_en,
        firmado_en,
        hardware_assets (
          id,
          name,
          serial_number,
          brand,
          model,
          persona_responsable,
          correo_responsable
        )
      `
      )
      .eq('link_temporal', token)
      .maybeSingle()

    if (error) {
      console.error('[actas/by-token]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!acta) {
      return NextResponse.json({ error: 'Acta no encontrada o link inválido' }, { status: 404 })
    }

    // No exponer urls de firmas privadas ni emails internos innecesarios
    return NextResponse.json({
      id: acta.id,
      hardware_asset_id: acta.hardware_asset_id,
      generador_nombre: acta.generador_nombre,
      cliente_nombre: acta.cliente_nombre,
      cliente_cedula: acta.cliente_cedula,
      estado_firma: acta.estado_firma,
      link_temporal: acta.link_temporal,
      creado_en: acta.creado_en,
      actualizado_en: acta.actualizado_en,
      firmado_en: acta.firmado_en,
      hardware: Array.isArray(acta.hardware_assets)
        ? acta.hardware_assets[0] || null
        : acta.hardware_assets || null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    )
  }
}
