import LinkedIn, { type LinkedInProfile } from "@auth/core/providers/linkedin";
import type { OAuthConfig, OAuthUserConfig } from "@auth/core/providers/oauth";
import { MOCK_CLIENT, mockBase } from "./shared";

export type MockLinkedInOptions = Partial<OAuthUserConfig<LinkedInProfile>>;

/**
 * Auth.js's own LinkedIn provider, pointed at the mock's LinkedIn issuer.
 * Discovery, JWKS, and ID token validation run unchanged against the mock.
 */
export function MockLinkedIn(
	options: MockLinkedInOptions = {},
): OAuthConfig<LinkedInProfile> {
	return LinkedIn({
		...options,
		...MOCK_CLIENT,
		issuer: `${mockBase("linkedin")}/oauth`,
	});
}
