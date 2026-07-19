import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { getToken, isTokenValid } from '/src/utils/authToken'

// Fetches the logged-in user's role (publicuser/commissioner) from the backend.
// role is null while loading, when logged out, or if the lookup fails
//
// AI-assisted (claude)
export default function useRole() {

	const [role, setRole] = useState(null);
	const [loading, setLoading] = useState(true);

	const refreshRole = useCallback(async () => {

		const token = getToken();

		if (!isTokenValid(token)) {
			setRole(null);
			setLoading(false);
			return;
		}

		try {
			const response = await axios.get('http://localhost:8080/role/me', {
				headers: { Authorization: `Bearer ${token}` }
			});
			setRole(response.data.role);
		} catch {
			setRole(null);
		} finally {
			setLoading(false);
		}

	}, []);

	useEffect(() => {
		refreshRole();
	}, [refreshRole]);

	return { role, loading, refreshRole };
}
