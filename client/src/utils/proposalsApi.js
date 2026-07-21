// for interacting with proposals
// AI-assisted (claude)

import axios from 'axios'
import { getToken } from './authToken'
import { authConfig, run } from './apiHelpers'

const api = axios.create({ baseURL: '/api/proposals' })

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
