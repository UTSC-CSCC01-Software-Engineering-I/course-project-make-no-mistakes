import { Navigate } from 'react-router'
import { useRoleContext } from '/src/utils/RoleProvider'

// UX guard: renders children only for indicated role
// redirects to home page if role isn't appropriate
//
// TODO: add server-side check for any role sensitive data fetch.
export default function RequireRole({ role = null, children }) {

	const { role: actualRole } = useRoleContext();

	if (role !== actualRole ) return <Navigate to="/" replace />;

	return children;
}
