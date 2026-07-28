// for interacting with the commissioner submissions feed
// AI-assisted (claude)

import axios from 'axios'
import { getToken } from './authToken'
import { authConfig, run } from './apiHelpers'

const api = axios.create({ baseURL: '/api/submissions' })

// fetch every submission (commissioner-only, needs a bearer token)
export function fetchSubmissions(token = getToken()) {
	return run(api.get('/', authConfig(token)))
}
