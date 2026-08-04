const express = require("express");

const supabaseAdmin = require("../lib/supabaseAdmin");
const {
    requireAuth,
} = require("../middleware/requireRole");

const objectionsRouter = express.Router();

const OBJECTION = "objection";
const DEFAULT_STATUS = "received";

/**
 * Converts an array or JSON-encoded array into
 * a JavaScript array.
 */
function parseArrayValue(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (
        value == null ||
        value === ""
    ) {
        return [];
    }

    if (typeof value !== "string") {
        return [];
    }

    const trimmedValue = value.trim();

    if (!trimmedValue) {
        return [];
    }

    try {
        const parsed =
            JSON.parse(trimmedValue);

        return Array.isArray(parsed)
            ? parsed
            : [];
    } catch {
        /*
         * Support one riding name supplied as
         * a plain string.
         */
        return [trimmedValue];
    }
}

/**
 * Extract numeric federal riding codes from
 * the normalized riding-detail objects.
 *
 * The Supabase related_ridings column is an
 * integer array, so names must not be stored there.
 */
function normalizeRelatedRidingCodes(
    relatedRidingDetails
) {
    const codes =
        relatedRidingDetails
            .map((riding) =>
                Number(
                    riding
                        .federalDistrictCode
                )
            )
            .filter(
                (code) =>
                    Number.isInteger(code) &&
                    code > 0
            );

    return [...new Set(codes)];
}

/**
 * Converts riding names or riding-detail objects
 * into a clean, duplicate-free array of names.
 */
function normalizeRelatedRidings(value) {
    const ridingNames =
        parseArrayValue(value)
            .map((riding) => {
                if (
                    typeof riding ===
                    "string"
                ) {
                    return riding.trim();
                }

                if (
                    riding &&
                    typeof riding ===
                        "object"
                ) {
                    return String(
                        riding
                            .federalDistrictName ??
                            riding
                                .federal_district_name ??
                            riding.name ??
                            ""
                    ).trim();
                }

                return "";
            })
            .filter(Boolean);

    return [...new Set(ridingNames)];
}

/**
 * Converts the riding-detail payload into a
 * consistent structure for Supabase JSONB storage.
 */
function normalizeRelatedRidingDetails(
    value
) {
    const normalizedDetails =
        parseArrayValue(value)
            .map((riding) => {
                if (
                    !riding ||
                    typeof riding !==
                        "object"
                ) {
                    return null;
                }

                const federalDistrictCode =
                    riding
                        .federalDistrictCode ??
                    riding
                        .federal_district_code ??
                    riding.identifier ??
                    "";

                const federalDistrictName =
                    riding
                        .federalDistrictName ??
                    riding
                        .federal_district_name ??
                    riding.name ??
                    "";

                const normalizedName =
                    String(
                        federalDistrictName
                    ).trim();

                if (!normalizedName) {
                    return null;
                }

                return {
                    federalDistrictCode:
                        String(
                            federalDistrictCode
                        ).trim(),

                    federalDistrictName:
                        normalizedName,

                    province:
                        String(
                            riding.province ??
                                riding
                                    .provinceLabel ??
                                riding
                                    .province_label ??
                                ""
                        ).trim(),

                    boundaryVersion:
                        String(
                            riding
                                .boundaryVersion ??
                                riding
                                    .boundary_version ??
                                riding.regionType ??
                                ""
                        ).trim(),
                };
            })
            .filter(Boolean);

    /*
     * Deduplicate details by federal riding code
     * when available, otherwise by riding name.
     */
    const uniqueDetails =
        new Map();

    normalizedDetails.forEach(
        (riding) => {
            const key =
                riding.federalDistrictCode ||
                riding.federalDistrictName;

            if (!uniqueDetails.has(key)) {
                uniqueDetails.set(
                    key,
                    riding
                );
            }
        }
    );

    return [
        ...uniqueDetails.values(),
    ];
}

/**
 * Validates and normalizes an optional map point.
 */
function normalizeSelectedPoint(value) {
    if (
        !value ||
        typeof value !== "object"
    ) {
        return null;
    }

    const lng = Number(value.lng);
    const lat = Number(value.lat);

    if (
        !Number.isFinite(lng) ||
        !Number.isFinite(lat)
    ) {
        return null;
    }

    if (
        lng < -180 ||
        lng > 180 ||
        lat < -90 ||
        lat > 90
    ) {
        return null;
    }

    return {
        lng,
        lat,
    };
}

/**
 * GET /api/objections
 *
 * Public route. Lists all objections,
 * newest first.
 */
objectionsRouter.get(
    "/",
    async (req, res) => {
        try {
            const { data, error } =
                await supabaseAdmin
                    .from("submissions")
                    .select("*")
                    .eq(
                        "submission_type",
                        OBJECTION
                    )
                    .order(
                        "created_at",
                        {
                            ascending: false,
                        }
                    );

            if (error) {
                console.error(
                    "[GET OBJECTIONS ERROR]",
                    error
                );

                return res
                    .status(500)
                    .json({
                        error:
                            "Failed to fetch objections.",

                        code:
                            "OBJECTIONS_FETCH_FAILED",
                    });
            }

            return res
                .status(200)
                .json(data ?? []);
        } catch (error) {
            console.error(
                "[GET OBJECTIONS UNEXPECTED ERROR]",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        "Failed to fetch objections.",

                    code:
                        "OBJECTIONS_FETCH_FAILED",
                });
        }
    }
);

/**
 * GET /api/objections/mine
 *
 * Protected route. Lists objections submitted
 * by the authenticated user.
 *
 * This route must appear before /:id.
 */
objectionsRouter.get(
    "/mine",
    requireAuth,
    async (req, res) => {
        try {
            const { data, error } =
                await supabaseAdmin
                    .from("submissions")
                    .select("*")
                    .eq(
                        "submission_type",
                        OBJECTION
                    )
                    .eq(
                        "user_id",
                        req.user.id
                    )
                    .order(
                        "created_at",
                        {
                            ascending: false,
                        }
                    );

            if (error) {
                console.error(
                    "[GET USER OBJECTIONS ERROR]",
                    error
                );

                return res
                    .status(500)
                    .json({
                        error:
                            "Failed to fetch your objections.",

                        code:
                            "MY_OBJECTIONS_FETCH_FAILED",
                    });
            }

            return res
                .status(200)
                .json(data ?? []);
        } catch (error) {
            console.error(
                "[GET USER OBJECTIONS UNEXPECTED ERROR]",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        "Failed to fetch your objections.",

                    code:
                        "MY_OBJECTIONS_FETCH_FAILED",
                });
        }
    }
);

/**
 * GET /api/objections/:id
 *
 * Public route. Fetches one objection by UUID.
 */
objectionsRouter.get(
    "/:id",
    async (req, res) => {
        try {
            const { data, error } =
                await supabaseAdmin
                    .from("submissions")
                    .select("*")
                    .eq(
                        "id",
                        req.params.id
                    )
                    .eq(
                        "submission_type",
                        OBJECTION
                    )
                    .maybeSingle();

            if (error) {
                console.error(
                    "[GET OBJECTION ERROR]",
                    error
                );

                return res
                    .status(500)
                    .json({
                        error:
                            "Failed to fetch objection.",

                        code:
                            "OBJECTION_FETCH_FAILED",
                    });
            }

            if (!data) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Objection not found.",

                        code:
                            "OBJECTION_NOT_FOUND",
                    });
            }

            return res
                .status(200)
                .json(data);
        } catch (error) {
            console.error(
                "[GET OBJECTION UNEXPECTED ERROR]",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        "Failed to fetch objection.",

                    code:
                        "OBJECTION_FETCH_FAILED",
                });
        }
    }
);

/**
 * POST /api/objections
 *
 * Protected route. Creates a boundary objection.
 */
objectionsRouter.post(
    "/",
    requireAuth,
    async (req, res) => {
        const body =
            typeof req.body?.body ===
            "string"
                ? req.body.body.trim()
                : "";

        const relatedRidingDetails =
            normalizeRelatedRidingDetails(
                req.body
                    ?.relatedRidingDetails ??
                    req.body
                        ?.related_riding_details
            );

        const directRidingNames =
            normalizeRelatedRidings(
                req.body
                    ?.relatedRidings ??
                    req.body
                        ?.related_ridings
            );

        /*
         * The names derived from the detail objects
         * are used for validation and display.
         */
        const detailRidingNames =
            normalizeRelatedRidings(
                relatedRidingDetails
            );

        const relatedRidingNames = [
            ...new Set([
                ...directRidingNames,
                ...detailRidingNames,
            ]),
        ];

        /*
         * The existing Supabase related_ridings
         * column stores integer federal riding codes.
         */
        const relatedRidingCodes =
            normalizeRelatedRidingCodes(
                relatedRidingDetails
            );

        const selectedPoint =
            normalizeSelectedPoint(
                req.body?.selectedPoint ??
                    req.body
                        ?.selected_point
            );

        if (!body) {
            return res
                .status(400)
                .json({
                    error:
                        "Objection reason is required.",

                    code:
                        "OBJECTION_BODY_REQUIRED",
                });
        }

        if (
            relatedRidingNames.length ===
            0
        ) {
            return res
                .status(400)
                .json({
                    error:
                        "Select at least one federal riding.",

                    code:
                        "OBJECTION_RIDING_REQUIRED",
                });
        }

        if (
            relatedRidingCodes.length ===
            0
        ) {
            return res
                .status(400)
                .json({
                    error:
                        "The selected ridings do not have valid federal district codes.",

                    code:
                        "OBJECTION_RIDING_CODE_REQUIRED",
                });
        }

        /*
         * Keep only detail records that match
         * one of the selected riding names.
         */
        const selectedRidingNames =
            new Set(
                relatedRidingNames
            );

        const matchingRidingDetails =
            relatedRidingDetails.filter(
                (riding) =>
                    selectedRidingNames.has(
                        riding
                            .federalDistrictName
                    )
            );

        try {
            const { data, error } =
                await supabaseAdmin
                    .from("submissions")
                    .insert({
                        user_id:
                            req.user.id,

                        submission_type:
                            OBJECTION,

                        status:
                            DEFAULT_STATUS,

                        body,

                        /*
                         * Integer array:
                         * [35005, 35084, 35113]
                         */
                        related_ridings:
                            relatedRidingCodes,

                        /*
                         * JSONB array containing
                         * codes, names, province,
                         * and boundary version.
                         */
                        related_riding_details:
                            matchingRidingDetails,

                        selected_point:
                            selectedPoint,
                    })
                    .select("*")
                    .single();

            if (error) {
                console.error(
                    "[CREATE OBJECTION ERROR]",
                    error
                );

                return res
                    .status(500)
                    .json({
                        error:
                            "Failed to create objection.",

                        code:
                            "OBJECTION_CREATE_FAILED",
                    });
            }

            return res
                .status(201)
                .json(data);
        } catch (error) {
            console.error(
                "[CREATE OBJECTION UNEXPECTED ERROR]",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        "Failed to create objection.",

                    code:
                        "OBJECTION_CREATE_FAILED",
                });
        }
    }
);

module.exports = objectionsRouter;