import { useEffect, useState } from 'react'
import axios from 'axios'
import { getToken, isTokenValid } from '/src/utils/authToken'

// Fetches the logged-in user's role (publicuser/commissioner) from the backend.
// role is null while loading, when logged out, or if the lookup fails
//
// AI-assisted code
export default function useRole() {

	const [role, setRole] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {

		const token = getToken();

		if (!isTokenValid(token)) {
			setLoading(false);
			return;
		}

		// ignore the response if the component unmounts before it arrives
		let cancelled = false;

		axios.get('http://localhost:8080/role/me', {
			headers: { Authorization: `Bearer ${token}` }
		})
			.then((response) => {
				if (!cancelled) setRole(response.data.role);
			})
			.catch(() => {
				// role stays null
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => { cancelled = true; };

	}, []);

	return { role, loading };
}
