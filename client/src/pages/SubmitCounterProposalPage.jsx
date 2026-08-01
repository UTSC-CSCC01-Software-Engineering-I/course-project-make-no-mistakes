import { useState } from 'react';
import { useParams } from 'react-router';
import Map from '../components/Map';
import { apiService } from '../apiService';
import './SubmitCounterProposalPage.css';

function SubmitCounterProposalPage() {
    const { proposalId } = useParams();
    const [rationaleText, setRationaleText] = useState('');
    const [sourceProposalId, setSourceProposalId] = useState(proposalId || '');
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [mapData, setMapData] = useState({ type: 'FeatureCollection', features: [] });
    const [submitting, setSubmitting] = useState(false);
    const [mapVersion, setMapVersion] = useState(0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!localStorage.getItem('sb_token')) {
            alert('Please log in before submitting a map.');
            return;
        }
        if (mapData.features.length === 0) {
            alert('Draw at least one boundary before submitting.');
            return;
        }

        setSubmitting(true);
        try {
            const submission = await apiService.createSubmission({
                type: 'counterproposal',
                content: rationaleText.trim(),
                riding: 'Toronto Centre / Spadina—Fort York',
                mapData,
                proposalId: sourceProposalId,
            });
            alert(`Counter-proposal ${submission.referenceNumber} submitted successfully.`);
            setRationaleText('');
            setMapData({ type: 'FeatureCollection', features: [] });
            setMapVersion((current) => current + 1);
        } catch (error) {
            alert(error.message || 'Counter-proposal submission failed.');
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
                    <Map
                        key={mapVersion}
                        mode="counterproposal"
                        onMapClick={setSelectedPoint}
                        onDrawChange={setMapData}
                    />
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
                                <label htmlFor="sourceProposal">Original Proposal ID</label>
                                <input
                                    id="sourceProposal"
                                    type="text"
                                    value={sourceProposalId}
                                    onChange={(event) => setSourceProposalId(event.target.value)}
                                    placeholder="Enter the proposal being countered"
                                    required
                                />
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
                            <button type="submit" className="cpSubmitButton" disabled={submitting}>
                                {submitting ? 'Submitting...' : 'Submit Counter-Proposal'}
                            </button>
                        </form>
                    </div>

                </section>
            </div>
        </main>
    );
}

export default SubmitCounterProposalPage;
