declare module 'react-signature-canvas' {
  import * as React from 'react'

  export interface SignaturePadProps extends React.HTMLAttributes<HTMLCanvasElement> {
    penColor?: string
    canvasProps?: any
    clearOnResize?: boolean
    minWidth?: number
    maxWidth?: number
    velocityFilterWeight?: number
  }

  export interface SignaturePadInstance {
    toDataURL(type?: string, encoderOptions?: any): string
    getTrimmedCanvas(): HTMLCanvasElement
    clear(): void
    fromDataURL(dataURL: string): void
  }

  const SignatureCanvas: React.ForwardRefExoticComponent<SignaturePadProps & React.RefAttributes<SignaturePadInstance>>
  export default SignatureCanvas
}
