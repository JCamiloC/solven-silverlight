import ActaSigningClient from '@/components/actas/ActaSigningClient'

export default function Page(props: any) {
  const token = props?.params?.token
  return <ActaSigningClient token={token} />
}
