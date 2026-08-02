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

// turns a snake_case enum value into Title Case for display
export function toTitleCase(value) {
	if (!value) return ''
	return String(value)
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}
