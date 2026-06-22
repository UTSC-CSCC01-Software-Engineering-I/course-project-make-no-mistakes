import { useParams } from 'react-router'

function ViewProposalPage() {
  const { proposalId } = useParams()

  return (
    <main>
      <h1>Proposal {proposalId}</h1>
    </main>
  )
}

export default ViewProposalPage