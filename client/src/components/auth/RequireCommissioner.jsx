import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import axios from 'axios'

// Route guard: only renders children for logged-in commissioners.
// This is a UX guard, not a security boundary
//
// TODO: add server-side check before any commissioner-only data fetch.
export default function RequireCommissioner({ children }) {

	const [status, setStatus] = useState('loading'); // 'loading' | 'allowed' | 'denied'

	useEffect(() => {

		const token = localStorage.getItem('sb_token');

		if (!token) {
			setStatus('denied');
			return;
		}

		axios.get('http://localhost:8080/role/me', {
			headers: { Authorization: `Bearer ${token}` }
		})
			.then((response) => {
				setStatus(response.data.role === 'commissioner' ? 'allowed' : 'denied');
			})
			.catch(() => {
				setStatus('denied');
			});

	}, []);

	if (status === 'loading') return null;
	if (status === 'denied') return <Navigate to="/" replace />;

	return children;
}
