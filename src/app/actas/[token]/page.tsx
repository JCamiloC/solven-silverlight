import ActaSigningClient from '@/components/actas/ActaSigningClient'

type PageProps = {
  params: Promise<{ token: string }>
}

export default async function Page({ params }: PageProps) {
  const { token } = await params
  return <ActaSigningClient token={token} />
}
