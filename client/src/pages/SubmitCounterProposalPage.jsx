import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import Map from '../components/Map';
import { createProposal } from '../utils/proposalsApi';
import { RIDING_OPTIONS } from '../utils/ridings';
import './SubmitCounterProposalPage.css';

function SubmitCounterProposalPage() {
    const navigate = useNavigate();
    const [rationaleText, setRationaleText] = useState('');
    const [selectedRidingId, setSelectedRidingId] = useState(String(RIDING_OPTIONS[0].id));
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        setError('');
        setSubmitting(true);

        try {
            const proposal = await createProposal({
                body: rationaleText.trim(),
                relatedRidings: [Number(selectedRidingId)],
            });
            setRationaleText('');
            navigate(`/view/${proposal.id}`);
        } catch (err) {
            if (err.status === 401) {
                navigate('/login');
                return;
            }
            setError(err.message || 'Failed to submit counter-proposal.');
        } finally {
            setSubmitting(false);
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
                        <button className="cpToolButton active">Select Subdivisions</button>
                        <button className="cpToolButton assignA">Assign to Riding A</button>
                        <button className="cpToolButton assignB">Assign to Riding B</button>
                        <button className="cpToolButton cpUndo">Undo</button>
                    </div>
                    <Map mode="counterproposal" onMapClick={setSelectedPoint} />
                </section>
                
                <section className="cpPanelSection">
                    <div className="cpStatsPanel">
                        <h2>Population Balance</h2>
                        {selectedPoint && (
                            <div className="cpSelectedPoint">
                                Selected point: {selectedPoint.lng}, {selectedPoint.lat}
                            </div>
                        )}
                        
                        <div className="cpStatCard">
                            <div className="cpStatHeader">
                                <h3>Riding A: Toronto Centre</h3>
                                <span className="cpDeviationBadge valid">-0.5% Dev</span>
                            </div>
                            <div className="cpStatValues">
                                <span>Current: 115,000</span>
                                <span><strong>Proposed: 110,500</strong></span>
                            </div>
                        </div>
                        
                        <div className="cpStatCard">
                            <div className="cpStatHeader">
                                <h3>Riding B: Spadina—Fort York</h3>
                                <span className="cpDeviationBadge valid">+1.2% Dev</span>
                            </div>
                            <div className="cpStatValues">
                                <span>Current: 105,000</span>
                                <span><strong>Proposed: 109,500</strong></span>
                            </div>
                        </div>

                        <div className="cpContiguityCheck valid">
                            <span className="checkIcon">✓</span> Contiguity Requirements Met
                        </div>
                    </div>

                    <div className="cpFormPanel">
                        <h2>Proposal Details</h2>
                        
                        <form className="cpForm" onSubmit={handleSubmit}>
                            <div className="cpFormGroup">
                                <label htmlFor="proposalRiding">Affected Riding</label>
                                <select
                                    id="proposalRiding"
                                    value={selectedRidingId}
                                    onChange={(e) => setSelectedRidingId(e.target.value)}
                                >
                                    {RIDING_OPTIONS.map((riding) => (
                                        <option key={riding.id} value={riding.id}>
                                            {riding.name}
                                        </option>
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
                            {error && <p className="CounterProposalFormError">{error}</p>}
                            <button type="submit" className="cpSubmitButton" disabled={submitting}>
                                {submitting ? 'Submitting…' : 'Submit Counter-Proposal'}
                            </button>
                        </form>
                    </div>

                </section>
            </div>
        </main>
    );
}

export default SubmitCounterProposalPage;
