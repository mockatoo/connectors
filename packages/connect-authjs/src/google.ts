import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";
import Google, { type GoogleProfile } from "next-auth/providers/google";
import { MOCK_CLIENT, mockBase } from "./shared";

export type MockGoogleOptions = Partial<OAuthUserConfig<GoogleProfile>>;

/**
 * Auth.js's own Google provider, pointed at the mock's Google issuer. Discovery,
 * JWKS, and ID token validation run unchanged against the mock.
 */
export function MockGoogle(
	options: MockGoogleOptions = {},
): OAuthConfig<GoogleProfile> {
	return Google({
		...options,
		...MOCK_CLIENT,
		issuer: mockBase("google"),
	});
}
