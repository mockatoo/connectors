import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";
import Google, { type GoogleProfile } from "next-auth/providers/google";
import { MOCK_CLIENT, mockBase } from "./shared";

export type MockGoogleOptions = Partial<OAuthUserConfig<GoogleProfile>> & {
	/** Override only for a local or self-hosted provider. */
	origin?: string;
};

/**
 * Auth.js's own Google provider, pointed at the mock's Google issuer. Discovery,
 * JWKS, and ID token validation run unchanged against the mock.
 */
export function MockGoogle(
	options: MockGoogleOptions = {},
): OAuthConfig<GoogleProfile> {
	const { origin, ...rest } = options;
	return Google({
		...rest,
		...MOCK_CLIENT,
		issuer: mockBase(origin, "google"),
	});
}
