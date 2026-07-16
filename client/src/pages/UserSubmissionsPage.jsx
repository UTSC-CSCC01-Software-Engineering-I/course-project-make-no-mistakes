import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import SearchBar from '../components/SearchBar';
import ProposalPreview from '../components/ProposalPreview';
import Map from '../components/Map';
import { apiService } from '../apiService';
import './UserSubmissionsPage.css';

function UserSubmissionsPage() {
    const [activeTab, setActiveTab] = useState('comment');
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;
        const token = localStorage.getItem('sb_token');

        if (!token) {
            setLoading(false);
            setError('Please log in to view your submissions.');
            setSubmissions([]);
            return;
        }

        setLoading(true);
        setError(null);

        apiService
            .getUserSubmissions()
            .then((data) => {
                if (cancelled) return;
                setSubmissions(Array.isArray(data) ? data : []);
            })
            .catch((err) => {
                if (cancelled) return;
                console.error('[UserSubmissionsPage]', err);
                if (err.status === 401) {
                    setError('Please log in to view your submissions.');
                } else {
                    setError(err.message || 'Failed to load submissions');
                }
                setSubmissions([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const filteredSubmissions = submissions.filter((sub) => sub.type === activeTab);

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
                {loading && <p>Loading your submissions…</p>}
                {error && <p role="alert">{error}</p>}

                {!loading && !error && (
                <div className="userSubmissionsList">
                    {filteredSubmissions.length > 0 ? (
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
                                                proposalId={sub.proposalId || sub.id}
                                                postUser="Me"
                                                postDate={sub.date}
                                                previewURL={sub.previewURL}
                                                postRating={sub.postRating}
                                                postLikes={sub.postVotes}
                                                postComments={sub.postComments}
                                            >
                                                <Map mode="view" />
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
                )}
            </section>
        </main>
    );
}
  
export default UserSubmissionsPage;
