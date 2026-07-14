// Helpers for reading the stored Supabase JWT and checking whether it is still valid.

export function getToken() {
	return localStorage.getItem('sb_token');
}

// decode the JWT payload (base64url) and check its expiry claim; a malformed
// or expired token counts as logged out
export function isTokenValid(token = getToken()) {
	if (!token) return false;

	try {
		const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
		const payload = JSON.parse(atob(base64));

		return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
	} catch {
		return false;
	}
}
