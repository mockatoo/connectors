import GitHub, { type GitHubProfile } from "@auth/core/providers/github";
import type { OAuthConfig, OAuthUserConfig } from "@auth/core/providers/oauth";
import { MOCK_CLIENT, mockBase } from "./shared";

export type MockGitHubOptions = Partial<OAuthUserConfig<GitHubProfile>>;

/**
 * Auth.js's own GitHub provider, pointed at the mock with `enterprise.baseUrl`.
 * This setting puts login and API endpoints on one server, with the API under
 * `/api/v3`; it does not require an Enterprise account or model Enterprise features.
 * Its profile and email lookups run unchanged.
 */
export function MockGitHub(
	options: MockGitHubOptions = {},
): OAuthConfig<GitHubProfile> {
	return GitHub({
		...options,
		...MOCK_CLIENT,
		enterprise: {
			baseUrl: mockBase("github"),
		},
	});
}
