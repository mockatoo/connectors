import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";
import LinkedIn, { type LinkedInProfile } from "next-auth/providers/linkedin";
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
