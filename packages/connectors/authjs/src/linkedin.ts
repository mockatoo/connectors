import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";
import LinkedIn, { type LinkedInProfile } from "next-auth/providers/linkedin";
import { MOCK_CLIENT, mockBase } from "./shared";

export type MockLinkedInOptions = Partial<OAuthUserConfig<LinkedInProfile>> & {
	/** Override only for a local or self-hosted provider. */
	origin?: string;
};

/**
 * Auth.js's own LinkedIn provider, pointed at the mock's LinkedIn issuer.
 * Discovery, JWKS, and ID token validation run unchanged against the mock.
 */
export function MockLinkedIn(
	options: MockLinkedInOptions = {},
): OAuthConfig<LinkedInProfile> {
	const { origin, ...rest } = options;
	return LinkedIn({
		...rest,
		...MOCK_CLIENT,
		issuer: `${mockBase(origin, "linkedin")}/oauth`,
	});
}
