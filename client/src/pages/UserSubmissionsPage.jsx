import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import SearchBar from '../components/SearchBar';
import ProposalPreview from '../components/ProposalPreview';
import Map from '../components/Map';
import './UserSubmissionsPage.css';

const fakeSubmissions = [
    {
        id: 1,
        referenceNumber: 'CRMP-2026-001',
        type: 'comment',
        status: 'Received',
        date: '06/20/2026',
        riding: 'Scarborough North, Ontario',
        content: 'I believe the boundary should not split the community center from the residential area. The proposed changes would divide our neighborhood in two.'
    },
    {
        id: 2,
        referenceNumber: 'CRMP-2026-002',
        type: 'objection',
        status: 'Under Review',
        date: '06/19/2026',
        riding: 'Toronto Centre, Ontario',
        content: 'Move the boundary to follow Yonge Street instead of Bay Street. This better reflects the historical divide and aligns with municipal wards.',
        previewURL: 'https://placehold.co/500x280/87bd93/1e5d2d?text=Objection+Map',
        postRating: 85,
        postVotes: 120,
        postComments: 14
    },
    {
        id: 4,
        referenceNumber: 'CRMP-2026-004',
        type: 'comment',
        status: 'Received',
        date: '06/17/2026',
        riding: 'Mississauga East, Ontario',
        content: 'The current proposal looks fine overall, but the transit lines need to be considered. Commuters from the east end share interests with the downtown core.'
    },
    {
        id: 5,
        referenceNumber: 'CRMP-2026-005',
        type: 'objection',
        status: 'Addressed',
        date: '06/15/2026',
        riding: 'Hamilton Mountain, Ontario',
        content: 'Keep the escarpment as the hard southern boundary for the lower city ridings.',
        previewURL: 'https://placehold.co/500x280/87bd93/1e5d2d?text=Escarpment+Boundary',
        postRating: 92,
        postVotes: 200,
        postComments: 30
    }
];

function UserSubmissionsPage() {
    const authToken = localStorage.getItem('sb_token');
    const [activeTab, setActiveTab] = useState('comment');
    const [counterProposals, setCounterProposals] = useState([]);
    const [isLoadingCounterProposals, setIsLoadingCounterProposals] = useState(Boolean(authToken));
    const [counterProposalError, setCounterProposalError] = useState(
        authToken ? '' : 'Log in to view your saved counter-proposals.'
    );
    const navigate = useNavigate();

    useEffect(() => {
        if (!authToken) return;

        fetch('/api/counter-proposals/mine', {
            headers: { Authorization: `Bearer ${authToken}` },
        })
            .then(async (response) => {
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Failed to load counter-proposals');
                return result;
            })
            .then(setCounterProposals)
            .catch((error) => setCounterProposalError(error.message))
            .finally(() => setIsLoadingCounterProposals(false));
    }, [authToken]);

    const savedCounterProposals = counterProposals.map((counterProposal) => ({
        id: counterProposal.id,
        referenceNumber: `CRMP-${String(counterProposal.id).padStart(4, '0')}`,
        type: 'counterproposal',
        status: counterProposal.status.charAt(0).toUpperCase() + counterProposal.status.slice(1),
        date: new Date(counterProposal.createdAt).toLocaleDateString(),
        riding: `Counter to proposal ${counterProposal.sourceProposalId}`,
        content: counterProposal.rationale,
        boundaryGeometry: counterProposal.boundaryGeometry,
        postRating: 0,
        postLikes: 0,
        postComments: 0,
    }));

    const filteredSubmissions = activeTab === 'counterproposal'
        ? savedCounterProposals
        : fakeSubmissions.filter(sub => sub.type === activeTab);

    return (
        <main className="subsPage">
            <header className="subsPageHeader">
                <div className="subsPageHeaderTop">
                    <h1>My Submissions</h1>
                    <div className="subsPageActions">
                        <button 
                            className="subsActionButton" 
                            onClick={() => navigate('/submit-objection')}
                        >+ Submit Objection</button>
                        <button 
                            className="subsActionButton" 
                            onClick={() => navigate('/submit-counter-proposal')}
                        >+ Submit Counter-Proposal</button>
                    </div>
                </div>
            </header>
            
            <SearchBar />

            <nav className="subsToggleNav">
                <button 
                    className={`subsToggleButton ${activeTab === 'comment' ? 'active' : ''}`}
                    onClick={() => setActiveTab('comment')}
                >Written Comments</button>
                <button 
                    className={`subsToggleButton ${activeTab === 'objection' ? 'active' : ''}`}
                    onClick={() => setActiveTab('objection')}
                >Boundary Objections</button>
                <button 
                    className={`subsToggleButton ${activeTab === 'counterproposal' ? 'active' : ''}`}
                    onClick={() => setActiveTab('counterproposal')}
                >Counter-proposals</button>
            </nav>

            <section className="userSubmissionsContainer">
                <div className="userSubmissionsList">
                    {activeTab === 'counterproposal' && isLoadingCounterProposals ? (
                        <p className="noSubmissionsMessage">Loading counter-proposals...</p>
                    ) : activeTab === 'counterproposal' && counterProposalError ? (
                        <p className="noSubmissionsMessage">{counterProposalError}</p>
                    ) : filteredSubmissions.length > 0 ? (
                        filteredSubmissions.map(sub => (
                            <article className="userSubmissionCard" key={sub.id}>
                                <div className="userSubmissionHeader">
                                    <span className="userSubmissionRef">{sub.referenceNumber}</span>
                                    <div className="userSubmissionBadges">
                                        <span className={`userSubmissionStatus status-${sub.status.replace(/\s+/g, '')}`}>
                                            {sub.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="userSubmissionBody">
                                    <p className="userSubmissionRiding"><strong>Riding:</strong> {sub.riding}</p>
                                    <p className="userSubmissionContent">{sub.content}</p>

                                    {(sub.type === 'objection' || sub.type === 'counterproposal') && (
                                        <div className="userSubmissionPreviewWrapper">
                                            <ProposalPreview
                                                proposalId={sub.id}
                                                postUser="Me"
                                                postDate={sub.date}
                                                previewURL={sub.previewURL}
                                                postRating={sub.postRating}
                                                postLikes={sub.postLikes ?? sub.postVotes}
                                                postComments={sub.postComments}
                                            >
                                                <Map mode="view" geometry={sub.boundaryGeometry} />
                                            </ProposalPreview>
                                        </div>
                                    )}
                                </div>
                                <div className="userSubmissionFooter">
                                    <span className="userSubmissionDate">Submitted on: {sub.date}</span>
                                    <button className="userSubmissionAction">View Details</button>
                                </div>
                            </article>
                        ))
                    ) : (
                        <p className="noSubmissionsMessage">No submissions of this type found.</p>
                    )}
                </div>
            </section>
        </main>
    );
}
  
export default UserSubmissionsPage;
