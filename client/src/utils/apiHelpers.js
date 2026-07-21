// shared helpers for the axios-based API modules
// AI-assisted (claude)

// Bearer-header config for authenticated requests; empty when no token.
export function authConfig(token) {
	return token ? { headers: { Authorization: `Bearer ${token}` } } : {}
}

// Normalize an axios error into a plain Error carrying the server's message and
// HTTP status, so callers can branch on error.status (e.g. 404, 401).
function normalize(error) {
	const normalized = new Error(
		error.response?.data?.error || error.message || 'Request failed.'
	)
	normalized.status = error.response?.status
	return normalized
}

// Await an axios request, returning its data or throwing a normalized error.
export async function run(request) {
	try {
		const { data } = await request
		return data
	} catch (error) {
		throw normalize(error)
	}
}
