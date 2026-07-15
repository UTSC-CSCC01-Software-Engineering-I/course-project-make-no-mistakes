import { createContext, useContext } from 'react'
import useRole from '/src/utils/useRole'

// Runs the role lookup once for the whole app and records the result
//
// Rendering of the subtree is delayed until the lookup finishes,
// so role-based UI (e.g. Dashboard link) is rendered at the same time
// as the rest of the app.

const RoleContext = createContext({ role: null, loading: false });

export default function RoleProvider({ children }) {

	const { role, loading } = useRole();

	if (loading) return null;

	return (
		<RoleContext.Provider value={{ role, loading }}>
			{children}
		</RoleContext.Provider>
	);
}

// consumers read the shared 'role' instead of fetching again
export function useRoleContext() {
	return useContext(RoleContext);
}
