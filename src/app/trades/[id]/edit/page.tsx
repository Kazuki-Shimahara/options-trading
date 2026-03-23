import { notFound } from 'next/navigation'
import { getTradeById } from '@/app/actions/trades'
import EditTradeForm from './EditTradeForm'

export default async function EditTradePage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const isSettle = resolvedSearchParams.settle === 'true'

  const trade = await getTradeById(id)
  if (!trade) notFound()

  return <EditTradeForm trade={trade} tradeId={id} isSettle={isSettle} />
}
