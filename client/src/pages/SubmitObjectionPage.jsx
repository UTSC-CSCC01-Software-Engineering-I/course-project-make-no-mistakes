import React, { useState } from 'react';
import Map from '../components/Map';
import { apiService } from '../apiService';
import './SubmitObjectionPage.css';

function SubmitObjectionPage() {
    const [objectionText, setObjectionText] = useState('');
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [mapData, setMapData] = useState({ type: 'FeatureCollection', features: [] });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!localStorage.getItem('sb_token')) {
            alert('Please log in before submitting a map.');
            return;
        }

        setSubmitting(true);
        try {
            const submission = await apiService.createSubmission({
                type: 'objection',
                content: objectionText.trim(),
                riding: 'Toronto Centre / Spadina—Fort York',
                mapData,
            });
            alert(`Objection ${submission.referenceNumber} submitted successfully.`);
            setObjectionText('');
            setMapData({ type: 'FeatureCollection', features: [] });
        } catch (error) {
            alert(error.message || 'Objection submission failed.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="submitPage">
            <header className="submitPageHeader">
                <h1>Submit Boundary Objection</h1>
                <p className="submitPageSubtitle">
                    Select a specific boundary edge on the map and explain your objection.
                </p>
            </header>
            
            <div className="submitContainer">
                <section className="mapSection">
                    <Map
                        mode="objection"
                        onMapClick={setSelectedPoint}
                        onDrawChange={setMapData}
                    />
                </section>
                
                <section className="formSection">
                    <div className="formCard">
                        <h2>Objection Details</h2>
                        <form className="submissionForm" onSubmit={handleSubmit}>

                            <div className="formGroup">
                                <label>Target Riding(s)</label>
                                <input 
                                    type="text" 
                                    value="Toronto Centre / Spadina—Fort York" 
                                    disabled 
                                    aria-label="Target ridings automatically selected from map"
                                />
                            </div>

                            <div className="formGroup">
                                <label>Selected Boundary Segment</label>
                                <input 
                                    type="text" 
                                    value={selectedPoint ? `${selectedPoint.lng}, ${selectedPoint.lat}` : 'No boundary selected'}
                                    disabled 
                                    aria-label="Boundary segment automatically selected from map"
                                />
                            </div>

                            <div className="formGroup">
                                <label htmlFor="objectionReason">Reason for Objection</label>
                                <textarea 
                                    id="objectionReason"
                                    rows="6" 
                                    placeholder="Explain why this boundary should not be placed here. What communities of interest are divided?"
                                    value={objectionText}
                                    onChange={(e) => setObjectionText(e.target.value)}
                                    required
                                ></textarea>
                            </div>
                            
                            <button type="submit" className="submitActionButton" disabled={submitting}>
                                {submitting ? 'Submitting...' : 'Submit Objection'}
                            </button>
                        </form>
                    </div>
                </section>
            </div>
        </main>
    );
}

export default SubmitObjectionPage;
