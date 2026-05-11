const REPORT_LOGO_PATH = '/Logo-Silverlight-Colombia.webp'

type PreparedLogo = {
  dataUrl: string
  bytes: Uint8Array
  width: number
  height: number
}

let cachedPreparedLogo: Promise<PreparedLogo | null> | null = null

const toPngBlob = async (image: HTMLImageElement): Promise<Blob | null> => {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.drawImage(image, 0, 0)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), 'image/png')
  })

  return blob
}

const loadPreparedLogo = async (): Promise<PreparedLogo | null> => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null
  }

  const image = new Image()
  image.crossOrigin = 'anonymous'

  const loadedImage = await new Promise<HTMLImageElement | null>((resolve) => {
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = REPORT_LOGO_PATH
  })

  if (!loadedImage) {
    return null
  }

  const pngBlob = await toPngBlob(loadedImage)
  if (!pngBlob) {
    return null
  }

  const buffer = await pngBlob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve((reader.result as string) || '')
    reader.readAsDataURL(pngBlob)
  })

  if (!dataUrl) {
    return null
  }

  return {
    dataUrl,
    bytes,
    width: loadedImage.naturalWidth || loadedImage.width,
    height: loadedImage.naturalHeight || loadedImage.height,
  }
}

const getPreparedLogo = async () => {
  if (!cachedPreparedLogo) {
    cachedPreparedLogo = loadPreparedLogo()
  }

  return cachedPreparedLogo
}

export const getReportLogoForPdf = async (targetWidth: number) => {
  const prepared = await getPreparedLogo()
  if (!prepared) return null

  const ratio = prepared.height / prepared.width
  return {
    dataUrl: prepared.dataUrl,
    width: targetWidth,
    height: Math.round(targetWidth * ratio),
  }
}

export const getReportLogoForWord = async (targetWidth: number) => {
  const prepared = await getPreparedLogo()
  if (!prepared) return null

  const ratio = prepared.height / prepared.width
  return {
    bytes: prepared.bytes,
    width: targetWidth,
    height: Math.round(targetWidth * ratio),
  }
}
