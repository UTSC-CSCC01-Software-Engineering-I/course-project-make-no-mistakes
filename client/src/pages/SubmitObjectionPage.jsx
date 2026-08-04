import React, {
    useRef,
    useState,
} from 'react';
import { useNavigate } from 'react-router';

import Map from '../components/Map';
import { PROVINCE_MAP_DATA } from '../config/mapData';
import { createObjection } from '../utils/objectionsApi';

import './SubmitObjectionPage.css';

const MAX_OBJECTION_LENGTH = 2000;

function getRegionKey(region) {
    return [
        region?.sourceId || 'region',
        region?.id ??
            region?.identifier ??
            region?.federalDistrictCode ??
            'unknown',
    ].join(':');
}

function SubmitObjectionPage() {
    const navigate = useNavigate();
    const mapComponentRef = useRef(null);

    const [objectionText, setObjectionText] =
        useState('');

    const [province, setProvince] =
        useState('on');

    const [
        selectedRegions,
        setSelectedRegions,
    ] = useState([]);

    const [
        selectedPoint,
        setSelectedPoint,
    ] = useState(null);

    const [
        submitting,
        setSubmitting,
    ] = useState(false);

    const [
        submissionError,
        setSubmissionError,
    ] = useState('');

    const selectedProvinceData =
        PROVINCE_MAP_DATA[province];

    /*
     * Convert Map region objects into the smaller,
     * consistent structure sent to the server.
     */
    const selectedFederalRidings =
        selectedRegions
            .map((region) => {
                const federalDistrictCode =
                    region?.federalDistrictCode ??
                    region?.identifier;

                if (!federalDistrictCode) {
                    return null;
                }

                return {
                    federalDistrictCode:
                        String(
                            federalDistrictCode
                        ),

                    federalDistrictName:
                        region?.name ||
                        'Unknown federal riding',

                    province:
                        region?.provinceLabel ||
                        selectedProvinceData
                            ?.label ||
                        '',

                    boundaryVersion:
                        region?.regionType ||
                        '',
                };
            })
            .filter(Boolean);

    const selectedRidingNames =
        selectedFederalRidings.map(
            (riding) =>
                riding.federalDistrictName
        );

    function handleRegionSelect(selection) {
        setSelectedRegions(
            Array.isArray(selection)
                ? selection
                : selection
                  ? [selection]
                  : []
        );

        setSubmissionError('');
    }

    function handleProvinceChange(event) {
        const nextProvince =
            event.target.value;

        setProvince(nextProvince);
        setSelectedRegions([]);
        setSelectedPoint(null);
        setSubmissionError('');

        mapComponentRef.current
            ?.clearSelectedRegion?.();
    }

    function handleRemoveRegion(region) {
        /*
         * The updated Map component exposes this
         * method and will send the revised selection
         * back through onRegionSelect.
         */
        if (
            mapComponentRef.current
                ?.deselectRegion
        ) {
            mapComponentRef.current
                .deselectRegion(region);

            return;
        }

        /*
         * Fallback for an older Map implementation.
         */
        const regionKey =
            getRegionKey(region);

        setSelectedRegions(
            (currentRegions) =>
                currentRegions.filter(
                    (currentRegion) =>
                        getRegionKey(
                            currentRegion
                        ) !== regionKey
                )
        );
    }

    function handleClearRegions() {
        setSelectedRegions([]);
        setSelectedPoint(null);
        setSubmissionError('');

        mapComponentRef.current
            ?.clearSelectedRegion?.();
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (submitting) {
            return;
        }

        const trimmedBody =
            objectionText.trim();

        if (
            selectedFederalRidings.length ===
            0
        ) {
            setSubmissionError(
                'Select at least one federal riding before submitting your objection.'
            );

            return;
        }

        if (!trimmedBody) {
            setSubmissionError(
                'Explain the reason for your objection.'
            );

            return;
        }

        setSubmitting(true);
        setSubmissionError('');

        try {
            /*
             * createObjection must forward this entire
             * object to the objections endpoint.
             */
            await createObjection({
                body: trimmedBody,
            
                relatedRidings:
                    selectedFederalRidings.map(
                        (riding) =>
                            riding.federalDistrictName
                    ),
            
                relatedRidingDetails:
                    selectedFederalRidings,
            
                selectedPoint:
                    selectedPoint
                        ? {
                              lng: selectedPoint.lng,
                              lat: selectedPoint.lat,
                          }
                        : null,
            });

            setObjectionText('');
            setSelectedRegions([]);
            setSelectedPoint(null);

            mapComponentRef.current
                ?.clearSelectedRegion?.();

            alert(
                'Your boundary objection has been submitted for review.'
            );

            navigate('/', {
                replace: true,
            });
        } catch (error) {
            if (error.status === 401) {
                navigate('/login');
                return;
            }

            setSubmissionError(
                error.message ||
                    'Failed to submit objection.'
            );
        } finally {
            setSubmitting(false);
        }
    }

    const submitDisabled =
        submitting ||
        !objectionText.trim() ||
        selectedFederalRidings.length ===
            0;

    return (
        <main className="submitPage">
            <header className="submitPageHeader">
                <h1>
                    Submit Boundary Objection
                </h1>

                <p className="submitPageSubtitle">
                    Select one or more federal
                    ridings on the map and explain
                    your objection.
                </p>
            </header>

            <div className="submitContainer">
                <section className="mapSection">
                    <div className="mapSelectionToolbar">
                        <div className="provinceControl">
                            <label htmlFor="objection-province">
                                Province or territory
                            </label>

                            <select
                                id="objection-province"
                                value={province}
                                onChange={
                                    handleProvinceChange
                                }
                            >
                                {Object.entries(
                                    PROVINCE_MAP_DATA
                                ).map(
                                    ([
                                        provinceCode,
                                        provinceData,
                                    ]) => (
                                        <option
                                            key={
                                                provinceCode
                                            }
                                            value={
                                                provinceCode
                                            }
                                            disabled={
                                                !provinceData
                                                    ?.federalDistricts
                                            }
                                        >
                                            {
                                                provinceData.label
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        {selectedRegions.length >
                            0 && (
                            <div className="selectionSummary">
                                <span>
                                    {
                                        selectedRegions.length
                                    }{' '}
                                    {selectedRegions.length ===
                                    1
                                        ? 'federal riding selected'
                                        : 'federal ridings selected'}
                                </span>

                                <button
                                    type="button"
                                    className="clearSelectionButton"
                                    onClick={
                                        handleClearRegions
                                    }
                                >
                                    Clear all
                                </button>
                            </div>
                        )}
                    </div>

                    <Map
                        ref={mapComponentRef}
                        mode="objection"
                        province={province}
                        boundaryLayer="federalDistricts"
                        onRegionSelect={
                            handleRegionSelect
                        }
                        multiSelectRegions
                        initialDrawMode="select"
                        onMapClick={
                            setSelectedPoint
                        }
                    />

                    {selectedRegions.length >
                        0 && (
                        <div
                            className="selectedRidingList"
                            aria-label="Selected federal ridings"
                        >
                            {selectedRegions.map(
                                (region) => (
                                    <article
                                        className="selectedRidingItem"
                                        key={getRegionKey(
                                            region
                                        )}
                                    >
                                        <div>
                                            <strong>
                                                Objection
                                                to:{' '}
                                                {region.name ||
                                                    'Unknown federal riding'}
                                            </strong>

                                            <span>
                                                {region.provinceLabel ||
                                                    selectedProvinceData
                                                        ?.label ||
                                                    ''}
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            className="removeRidingButton"
                                            onClick={() =>
                                                handleRemoveRegion(
                                                    region
                                                )
                                            }
                                            aria-label={`Remove ${
                                                region.name ||
                                                'selected riding'
                                            }`}
                                        >
                                            ×
                                        </button>
                                    </article>
                                )
                            )}
                        </div>
                    )}
                </section>

                <section className="formSection">
                    <div className="formCard">
                        <h2>
                            Objection Details
                        </h2>

                        <form
                            className="submissionForm"
                            onSubmit={
                                handleSubmit
                            }
                        >
                            <div className="formGroup">
                                <label>
                                    Target Riding(s)
                                </label>

                                {selectedFederalRidings.length >
                                0 ? (
                                    <div className="targetRidingHeaders">
                                        {selectedFederalRidings.map(
                                            (
                                                riding
                                            ) => (
                                                <div
                                                    className="targetRidingHeader"
                                                    key={
                                                        riding.federalDistrictCode
                                                    }
                                                >
                                                    Objection
                                                    to:{' '}
                                                    {
                                                        riding.federalDistrictName
                                                    }
                                                </div>
                                            )
                                        )}
                                    </div>
                                ) : (
                                    <p className="emptySelectionMessage">
                                        No federal
                                        riding selected.
                                        Select one or
                                        more ridings on
                                        the map.
                                    </p>
                                )}
                            </div>

                            <div className="formGroup">
                                <label>
                                    Selected Map
                                    Location
                                </label>

                                <input
                                    type="text"
                                    value={
                                        selectedPoint
                                            ? `${selectedPoint.lng}, ${selectedPoint.lat}`
                                            : 'No map location selected'
                                    }
                                    disabled
                                    aria-label="Map location automatically selected from map"
                                />
                            </div>

                            <div className="formGroup">
                                <label htmlFor="objectionReason">
                                    Reason for
                                    Objection
                                </label>

                                <textarea
                                    id="objectionReason"
                                    rows="8"
                                    maxLength={
                                        MAX_OBJECTION_LENGTH
                                    }
                                    placeholder="Explain why these federal riding boundaries should be reconsidered. What communities of interest are divided?"
                                    value={
                                        objectionText
                                    }
                                    onChange={(
                                        event
                                    ) => {
                                        setObjectionText(
                                            event
                                                .target
                                                .value
                                        );

                                        setSubmissionError(
                                            ''
                                        );
                                    }}
                                    required
                                />

                                <span className="objectionCharacterCount">
                                    {
                                        objectionText.length
                                    }
                                    /
                                    {
                                        MAX_OBJECTION_LENGTH
                                    }
                                </span>
                            </div>

                            {submissionError && (
                                <p
                                    className="submissionError"
                                    role="alert"
                                >
                                    {
                                        submissionError
                                    }
                                </p>
                            )}

                            <button
                                type="submit"
                                className="submitActionButton"
                                disabled={
                                    submitDisabled
                                }
                            >
                                {submitting
                                    ? 'Submitting…'
                                    : `Submit Objection${
                                          selectedFederalRidings.length >
                                          0
                                              ? ` (${selectedFederalRidings.length})`
                                              : ''
                                      }`}
                            </button>
                        </form>
                    </div>
                </section>
            </div>
        </main>
    );
}

export default SubmitObjectionPage;