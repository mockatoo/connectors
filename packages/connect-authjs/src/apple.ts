import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";
import Apple, { type AppleProfile } from "next-auth/providers/apple";
import { MOCK_CLIENT, mockBase } from "./shared";

export type MockAppleOptions = Partial<OAuthUserConfig<AppleProfile>> & {
	/** Override only for a local or self-hosted provider. */
	origin?: string;
};

/**
 * Auth.js's own Apple provider, pointed at the mock's Apple issuer. Discovery,
 * form_post callbacks, and the first-sign-in `user` field run unchanged.
 */
export function MockApple(
	options: MockAppleOptions = {},
): OAuthConfig<AppleProfile> {
	const { origin, ...rest } = options;
	return Apple({
		...rest,
		...MOCK_CLIENT,
		issuer: mockBase(origin, "apple"),
	});
}
