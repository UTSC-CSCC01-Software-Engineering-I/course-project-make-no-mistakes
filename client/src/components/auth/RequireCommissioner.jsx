import { Navigate } from 'react-router'
import { useRoleContext } from '/src/utils/RoleProvider'

// UX guard: renders children only for commissioners
//
// TODO: add server-side check before any commissioner-only data fetch.
export default function RequireCommissioner({ children }) {

	const { role } = useRoleContext();

	if (role !== 'commissioner') return <Navigate to="/" replace />;

	return children;
}
