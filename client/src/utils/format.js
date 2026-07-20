// returns short user id
export function shortUser(userId) {
	return userId ? `User ${String(userId).slice(0, 8)}` : 'Anonymous'
}

// returns formatted date
export function formatDate(iso) {
	if (!iso) return ''
	const date = new Date(iso)
	return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString()
}
