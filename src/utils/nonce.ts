/**
 * Generates an 8-character hex nonce for challenge uniqueness.
 * Prevents pre-computation attacks by making each challenge unique.
 */
export function generateNonce(): string {
	const bytes = new Uint8Array(4);
	crypto.getRandomValues(bytes);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}
