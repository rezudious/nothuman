import { SignJWT, jwtVerify, errors } from 'jose';

export interface VerificationTokenPayload {
	sub: 'ai_verification';
	iat: number;
	exp: number;
	challenge_id: string;
	challenge_type: string;
	solve_time_ms: number;
	issuer: 'nothuman.dev';
}

export interface ChallengeData {
	challengeId: string;
	challengeType: string;
	solveTimeMs: number;
}

export async function generateVerificationToken(challengeData: ChallengeData, secret: string): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	const expiresIn = 60 * 60; // 1 hour

	const secretKey = new TextEncoder().encode(secret);

	const token = await new SignJWT({
		sub: 'ai_verification',
		challenge_id: challengeData.challengeId,
		challenge_type: challengeData.challengeType,
		solve_time_ms: challengeData.solveTimeMs,
		issuer: 'nothuman.dev',
	})
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt(now)
		.setExpirationTime(now + expiresIn)
		.sign(secretKey);

	return token;
}

export interface TokenValidationSuccess {
	valid: true;
	payload: VerificationTokenPayload;
}

export interface TokenValidationFailure {
	valid: false;
	error: string;
}

export type TokenValidationResult = TokenValidationSuccess | TokenValidationFailure;

export async function validateVerificationToken(token: string, secret: string): Promise<TokenValidationResult> {
	try {
		const secretKey = new TextEncoder().encode(secret);

		const { payload } = await jwtVerify(token, secretKey, {
			algorithms: ['HS256'],
		});

		// Validate required fields
		if (payload.sub !== 'ai_verification') {
			return { valid: false, error: 'Invalid token subject' };
		}

		if (payload.issuer !== 'nothuman.dev') {
			return { valid: false, error: 'Invalid token issuer' };
		}

		return {
			valid: true,
			payload: {
				sub: payload.sub as 'ai_verification',
				iat: payload.iat as number,
				exp: payload.exp as number,
				challenge_id: payload.challenge_id as string,
				challenge_type: payload.challenge_type as string,
				solve_time_ms: payload.solve_time_ms as number,
				issuer: payload.issuer as 'nothuman.dev',
			},
		};
	} catch (err) {
		if (err instanceof errors.JWTExpired) {
			return { valid: false, error: 'Token expired' };
		}
		if (err instanceof errors.JWSSignatureVerificationFailed) {
			return { valid: false, error: 'Invalid signature' };
		}
		if (err instanceof errors.JWSInvalid) {
			return { valid: false, error: 'Invalid token format' };
		}
		return { valid: false, error: 'Token validation failed' };
	}
}
