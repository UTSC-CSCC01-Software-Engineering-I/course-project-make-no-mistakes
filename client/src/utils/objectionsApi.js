// for interacting with objections
// AI-assisted (claude)

import axios from 'axios'
import { getToken } from './authToken'
import { authConfig, run } from './apiHelpers'

const api = axios.create({ baseURL: '/api/objections' })

// fetch all objections
export function fetchObjections() {
	return run(api.get('/'))
}

// fetch a single objection by UUID
export function fetchObjection(id) {
	return run(api.get(`/${encodeURIComponent(id)}`))
}

// fetch the authenticated user's objections
export function fetchMyObjections(token = getToken()) {
	return run(api.get('/mine', authConfig(token)))
}

// create an objection
export function createObjection(payload, token = getToken()) {
	return run(api.post('/', payload, authConfig(token)))
}
