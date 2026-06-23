import React, { useState } from 'react';
import './SubmitCounterProposalPage.css';

function SubmitCounterProposalPage() {
    const [rationaleText, setRationaleText] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        alert('Counter-proposal submitted successfully.');
        setRationaleText('');
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
                    <div className="cpMapPlaceholder">
                        <span className="cpMapTitle">Interactive Mapping Tool</span>
                        <span className="cpMapText">Click blocks on the map to reassign them between ridings.</span>
                    </div>
                </section>
                
                <section className="cpPanelSection">
                    <div className="cpStatsPanel">
                        <h2>Population Balance</h2>
                        
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
                            <button type="submit" className="cpSubmitButton">
                                Submit Counter-Proposal
                            </button>
                        </form>
                    </div>

                </section>
            </div>
        </main>
    );
}

export default SubmitCounterProposalPage;