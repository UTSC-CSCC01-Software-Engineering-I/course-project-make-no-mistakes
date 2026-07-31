// commissioner-only submission metadata (notes + tags)
// AI-assisted (claude)

import axios from 'axios'
import { getToken } from './authToken'
import { authConfig, run } from './apiHelpers'

const api = axios.create({ baseURL: '/api/submissions' })

// fetch a submission's commissioner tags -> { submission_id, tags }
export function fetchTags(id, token = getToken()) {
	return run(api.get(`/${encodeURIComponent(id)}/tags`, authConfig(token)))
}

// replace a submission's commissioner tag set
export function updateTags(id, tags, token = getToken()) {
	return run(api.put(`/${encodeURIComponent(id)}/tags`, { tags }, authConfig(token)))
}

// fetch a submission's commissioner notes, newest first
export function fetchNotes(id, token = getToken()) {
	return run(api.get(`/${encodeURIComponent(id)}/notes`, authConfig(token)))
}

// append a commissioner note to a submission
export function createNote(id, note, token = getToken()) {
	return run(api.post(`/${encodeURIComponent(id)}/notes`, { note }, authConfig(token)))
}
