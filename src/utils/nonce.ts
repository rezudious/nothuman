/**
 * Generates a 32-character hex nonce (128 bits of entropy) for challenge uniqueness.
 * Prevents pre-computation attacks by making each challenge unique.
 *
 * 128 bits provides ~3.4×10^38 possible values, making pre-computation attacks
 * computationally infeasible.
 */
export function generateNonce(): string {
	const bytes = new Uint8Array(16); // 16 bytes = 128 bits
	crypto.getRandomValues(bytes);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}
