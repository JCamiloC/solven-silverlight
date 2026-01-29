import React, { forwardRef, useImperativeHandle, useRef } from 'react'
import SignatureCanvas from 'react-signature-canvas'

type Props = {
  width?: number
  height?: number
  penColor?: string
}

export type SignaturePadHandle = {
  clear: () => void
  getDataURL: () => string | null
}

const SignaturePad = forwardRef<SignaturePadHandle, Props>(({ width = 400, height = 150, penColor = '#000' }, ref) => {
  const sigRef = useRef<any>(null)

  useImperativeHandle(ref, () => ({
    clear: () => sigRef.current?.clear(),
    getDataURL: () => sigRef.current?.isEmpty() ? null : sigRef.current?.getTrimmedCanvas().toDataURL('image/png'),
  }))

  return (
    <div style={{ border: '1px solid #ddd', display: 'inline-block' }}>
      <SignatureCanvas penColor={penColor} canvasProps={{ width, height, style: { display: 'block' } }} ref={sigRef} />
    </div>
  )
})

export default SignaturePad
