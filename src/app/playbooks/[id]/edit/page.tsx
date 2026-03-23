import { notFound } from 'next/navigation'
import { getPlaybookById } from '@/app/actions/playbooks'
import EditPlaybookForm from './EditPlaybookForm'

export default async function EditPlaybookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const playbook = await getPlaybookById(id)
  if (!playbook) notFound()

  return <EditPlaybookForm playbook={playbook} playbookId={id} />
}
