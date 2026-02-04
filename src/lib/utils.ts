import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Devuelve el nombre legible de un campo de software incluso si está serializado en JSON.
 */
export function getSoftwareDisplayName(field: unknown, fallback = 'No especificado'): string {
  const candidate = extractSoftwareName(field)
  return candidate || fallback
}

function extractSoftwareName(field: unknown): string | null {
  if (field === null || field === undefined) {
    return null
  }

  if (typeof field === 'string') {
    const trimmed = field.trim()
    if (!trimmed) return null

    const parsed = tryParseJson(trimmed)
    if (parsed !== null) {
      const resolved = resolveFromValue(parsed)
      if (resolved) return resolved
      // Si el JSON no tiene un nombre válido, retornar null en lugar del JSON crudo
      return null
    }

    return trimmed
  }

  return resolveFromValue(field)
}

function resolveFromValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = resolveFromValue(item)
      if (candidate) return candidate
    }
    return null
  }

  if (typeof value === 'object') {
    return extractNameFromObject(value)
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }

  return null
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function extractNameFromObject(value: unknown): string | null {
  if (value === null || typeof value !== 'object') {
    return null
  }

  const obj = value as Record<string, unknown>
  const candidates = ['nombre', 'name', 'version']

  for (const key of candidates) {
    const candidate = obj[key]
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim()
      if (trimmed) return trimmed
    }
  }

  return null
}
