import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import Map from '../components/Map';
import { createObjection } from '../utils/objectionsApi';
import './SubmitObjectionPage.css';

function SubmitObjectionPage() {
    const navigate = useNavigate();

    const [objectionText, setObjectionText] = useState('');
    const [selectedRiding, setSelectedRiding] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (submitting) {
            return;
        }

        if (!selectedRiding) {
            alert('Please select a federal riding on the map.');
            return;
        }

        const federalDistrictCode =
            selectedRiding.federalDistrictCode ??
            selectedRiding.identifier;

        if (!federalDistrictCode) {
            alert('The selected riding does not have a valid riding code.');
            return;
        }

        setSubmitting(true);

        try {
            await createObjection({
                body: objectionText.trim(),

                // Stable connection to the map feature
                federalDistrictCode: String(federalDistrictCode),

                // Useful display information
                federalDistrictName: selectedRiding.name,
                province: selectedRiding.provinceLabel,

                // Your Map.jsx currently identifies these boundaries
                // as belonging to the 2013 Representation Order.
                boundaryVersion: selectedRiding.regionType,
            });

            setObjectionText('');
            setSelectedRiding(null);

            alert('Your boundary objection has been submitted for review.');
            navigate('/', { replace: true });
        } catch (err) {
            if (err.status === 401) {
                navigate('/login');
                return;
            }

            alert(err.message || 'Failed to submit objection.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="submitPage">
            <header className="submitPageHeader">
                <h1>Submit Boundary Objection</h1>

                <p className="submitPageSubtitle">
                    Select a federal riding on the map and explain your objection.
                </p>
            </header>

            <div className="submitContainer">
                <section className="mapSection">
                    <Map
                        mode="objection"
                        province="on"
                        boundaryLayer="federalDistricts"
                        onRegionSelect={setSelectedRiding}
                    />
                </section>

                <section className="formSection">
                    <div className="formCard">
                        <h2>Objection Details</h2>

                        <form
                            className="submissionForm"
                            onSubmit={handleSubmit}
                        >
                            <div className="formGroup">
                                <label htmlFor="selectedRiding">
                                    Selected Federal Riding
                                </label>

                                <input
                                    id="selectedRiding"
                                    type="text"
                                    value={
                                        selectedRiding
                                            ? selectedRiding.name
                                            : 'No federal riding selected'
                                    }
                                    disabled
                                />
                            </div>

                            <div className="formGroup">
                                <label htmlFor="selectedRidingCode">
                                    Federal Riding Code
                                </label>

                                <input
                                    id="selectedRidingCode"
                                    type="text"
                                    value={
                                        selectedRiding
                                            ? selectedRiding.federalDistrictCode ??
                                              selectedRiding.identifier ??
                                              ''
                                            : ''
                                    }
                                    disabled
                                />
                            </div>

                            <div className="formGroup">
                                <label htmlFor="selectedProvince">
                                    Province
                                </label>

                                <input
                                    id="selectedProvince"
                                    type="text"
                                    value={
                                        selectedRiding?.provinceLabel ?? ''
                                    }
                                    disabled
                                />
                            </div>

                            <div className="formGroup">
                                <label htmlFor="objectionReason">
                                    Reason for Objection
                                </label>

                                <textarea
                                    id="objectionReason"
                                    rows="6"
                                    placeholder="Explain why you object to the boundaries of this federal riding. What communities of interest are divided?"
                                    value={objectionText}
                                    onChange={(e) =>
                                        setObjectionText(e.target.value)
                                    }
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="submitActionButton"
                                disabled={
                                    submitting ||
                                    !selectedRiding ||
                                    !objectionText.trim()
                                }
                            >
                                {submitting
                                    ? 'Submitting…'
                                    : 'Submit Objection'}
                            </button>
                        </form>
                    </div>
                </section>
            </div>
        </main>
    );
}

export default SubmitObjectionPage;