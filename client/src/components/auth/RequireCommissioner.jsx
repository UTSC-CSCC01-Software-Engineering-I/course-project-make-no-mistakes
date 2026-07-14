import { Navigate } from 'react-router'
import useRole from '/src/utils/useRole'

// Route guard: only renders children for logged-in commissioners.
// This is a UX guard, not a security boundary
//
// TODO: add server-side check before any commissioner-only data fetch.
export default function RequireCommissioner({ children }) {

	const { role, loading } = useRole();

	// don't redirect while the role lookup is still in progress
	if (loading) return null;
	if (role !== 'commissioner') return <Navigate to="/" replace />;

	return children;
}
