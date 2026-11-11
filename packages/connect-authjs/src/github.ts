import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";
import GitHub, { type GitHubProfile } from "next-auth/providers/github";
import { MOCK_CLIENT, mockBase } from "./shared";

export type MockGitHubOptions = Partial<OAuthUserConfig<GitHubProfile>> & {
	/** Override only for a local or self-hosted provider. */
	origin?: string;
};

/**
 * Auth.js's own GitHub provider, pointed at the mock with `enterprise.baseUrl`.
 * This setting puts login and API endpoints on one server, with the API under
 * `/api/v3`; it does not require an Enterprise account or model Enterprise features.
 * Its profile and email lookups run unchanged.
 */
export function MockGitHub(
	options: MockGitHubOptions = {},
): OAuthConfig<GitHubProfile> {
	const { origin, ...rest } = options;
	return GitHub({
		...rest,
		...MOCK_CLIENT,
		enterprise: {
			baseUrl: mockBase(origin, "github"),
		},
	});
}
