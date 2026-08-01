import { useState } from 'react';
import { useParams } from 'react-router';
import Map from '../components/Map';
import proposals from '../data/proposals.json';
import './SubmitCounterProposalPage.css';

function createDrawingGeometry(boundaries) {
    const features = Object.entries(boundaries).flatMap(([riding, points]) => {
        if (points.length === 0) return [];

        let geometry;
        if (points.length === 1) {
            geometry = { type: 'Point', coordinates: points[0] };
        } else if (points.length === 2) {
            geometry = { type: 'LineString', coordinates: points };
        } else {
            geometry = { type: 'Polygon', coordinates: [[...points, points[0]]] };
        }

        return [{ type: 'Feature', properties: { riding }, geometry }];
    });

    return { type: 'FeatureCollection', features };
}

function createSubmissionGeometry(boundaries) {
    return {
        type: 'FeatureCollection',
        features: Object.entries(boundaries)
            .filter(([, points]) => points.length >= 3)
            .map(([riding, points]) => ({
                type: 'Feature',
                properties: { riding },
                geometry: { type: 'Polygon', coordinates: [[...points, points[0]]] },
            })),
    };
}

function SubmitCounterProposalPage() {
    const { proposalId } = useParams();
    const [rationaleText, setRationaleText] = useState('');
    const [sourceProposalId, setSourceProposalId] = useState(proposalId || String(proposals[0]?.id || ''));
    const [activeRiding, setActiveRiding] = useState('A');
    const [boundaries, setBoundaries] = useState({ A: [], B: [] });
    const [history, setHistory] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    const drawingGeometry = createDrawingGeometry(boundaries);

    const handleMapClick = ({ lng, lat }) => {
        setBoundaries((current) => ({
            ...current,
            [activeRiding]: [...current[activeRiding], [lng, lat]],
        }));
        setHistory((current) => [...current, activeRiding]);
        setMessage('');
    };

    const handleUndo = () => {
        const lastRiding = history[history.length - 1];
        if (!lastRiding) return;

        setBoundaries((current) => ({
            ...current,
            [lastRiding]: current[lastRiding].slice(0, -1),
        }));
        setHistory((current) => current.slice(0, -1));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('sb_token');
        const boundaryGeometry = createSubmissionGeometry(boundaries);

        if (!token) {
            setMessage('Please log in before submitting a counter-proposal.');
            return;
        }
        if (boundaryGeometry.features.length === 0) {
            setMessage('Draw at least three points for one riding to create a closed boundary.');
            return;
        }

        setIsSubmitting(true);
        setMessage('');

        try {
            const response = await fetch('/api/counter-proposals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    sourceProposalId,
                    rationale: rationaleText,
                    boundaryGeometry,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Submission failed');

            setRationaleText('');
            setBoundaries({ A: [], B: [] });
            setHistory([]);
            setMessage(`Counter-proposal CRMP-${String(result.id).padStart(4, '0')} was saved.`);
        } catch (error) {
            setMessage(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="cpPage">
            <header className="cpPageHeader">
                <h1>Submit Counter-Proposal</h1>
                <p className="cpPageSubtitle">
                    Reassign geographic building blocks to redraw electoral boundaries. 
                </p>
            </header>
            
            <div className="cpContainer">
                <section className="cpMapSection">
                    <div className="cpMapToolbar">
                        <button type="button" className={`cpToolButton assignA ${activeRiding === 'A' ? 'active' : ''}`} onClick={() => setActiveRiding('A')}>Draw Riding A</button>
                        <button type="button" className={`cpToolButton assignB ${activeRiding === 'B' ? 'active' : ''}`} onClick={() => setActiveRiding('B')}>Draw Riding B</button>
                        <button type="button" className="cpToolButton cpUndo" onClick={handleUndo} disabled={history.length === 0}>Undo Last Point</button>
                    </div>
                    <Map mode="counterproposal" onMapClick={handleMapClick} geometry={drawingGeometry} />
                </section>
                
                <section className="cpPanelSection">
                    <div className="cpStatsPanel">
                        <h2>Population Balance</h2>
                        <div className="cpSelectedPoint">
                            Drawing Riding {activeRiding}. Click at least three boundary points.
                        </div>
                        
                        <div className="cpStatCard">
                            <div className="cpStatHeader">
                                <h3>Riding A</h3>
                                <span className="cpDeviationBadge valid">{boundaries.A.length} points</span>
                            </div>
                            <div className="cpStatValues">
                                <span>{boundaries.A.length >= 3 ? 'Closed boundary ready' : 'Boundary incomplete'}</span>
                            </div>
                        </div>
                        
                        <div className="cpStatCard">
                            <div className="cpStatHeader">
                                <h3>Riding B</h3>
                                <span className="cpDeviationBadge valid">{boundaries.B.length} points</span>
                            </div>
                            <div className="cpStatValues">
                                <span>{boundaries.B.length >= 3 ? 'Closed boundary ready' : 'Boundary incomplete'}</span>
                            </div>
                        </div>

                        <div className="cpContiguityCheck valid">
                            Boundaries are saved as GeoJSON polygons.
                        </div>
                    </div>

                    <div className="cpFormPanel">
                        <h2>Proposal Details</h2>
                        
                        <form className="cpForm" onSubmit={handleSubmit}>
                            <div className="cpFormGroup">
                                <label htmlFor="sourceProposal">Original Proposal</label>
                                <select id="sourceProposal" value={sourceProposalId} onChange={(event) => setSourceProposalId(event.target.value)} required>
                                    {proposals.map((proposal) => (
                                        <option key={proposal.id} value={proposal.id}>Proposal {proposal.id} by {proposal.postUser}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="cpFormGroup">
                                <label htmlFor="proposalRationale">Proposal Rationale</label>
                                <textarea 
                                    id="proposalRationale"
                                    rows="5" 
                                    placeholder="Explain your proposed boundary changes. Why does this configuration better serve the communities involved?"
                                    value={rationaleText}
                                    onChange={(e) => setRationaleText(e.target.value)}
                                    required
                                ></textarea>
                            </div>
                            {message && <p className="cpFormMessage" role="status">{message}</p>}
                            <button type="submit" className="cpSubmitButton" disabled={isSubmitting}>
                                {isSubmitting ? 'Submitting...' : 'Submit Counter-Proposal'}
                            </button>
                        </form>
                    </div>

                </section>
            </div>
        </main>
    );
}

export default SubmitCounterProposalPage;
