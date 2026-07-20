// for interacting with proposals
// AI-assisted (claude)

import axios from 'axios'
import { getToken } from './authToken'

const api = axios.create({ baseURL: '/api/proposals' })

function authConfig(token) {
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

async function run(request) {
	try {
		const { data } = await request
		return data
	} catch (error) {
		throw normalize(error)
	}
}

// fetch all counter-proposals
export function fetchProposals() {
	return run(api.get('/'))
}

// fetch a single counter-proposal by UUID
export function fetchProposal(id) {
	return run(api.get(`/${encodeURIComponent(id)}`))
}

// fetch the authenticated user's counter-proposals
export function fetchMyProposals(token = getToken()) {
	return run(api.get('/mine', authConfig(token)))
}

// create a counter-proposal
export function createProposal(payload, token = getToken()) {
	return run(api.post('/', payload, authConfig(token)))
}
