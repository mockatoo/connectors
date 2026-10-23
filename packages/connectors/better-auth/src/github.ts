import { authorizationCodeRequest, getOAuth2Tokens } from "better-auth/oauth2";
import {
	type GithubOptions,
	type GithubProfile,
	github,
} from "better-auth/social-providers";
import {
	authorizationURL,
	type MockOptions,
	mockBase,
	mockSocialPlugin,
	refreshMockAccessToken,
	withMockClient,
} from "./shared";

export type MockGitHubOptions = MockOptions<GithubOptions>;

/**
 * Replaces Better Auth's `github` social provider with the mock's GitHub
 * endpoints. Better Auth hardcodes github.com and api.github.com, so the
 * token request and profile lookup below are upstream's with only the URLs changed.
 */
export function mockGitHub(options: MockGitHubOptions = {}) {
	const { origin: configured, ...rest } = options;
	const base = mockBase(configured, "github");
	const tokenEndpoint = `${base}/login/oauth/access_token`;
	const api = `${base}/api/v3`;
	const config = withMockClient(rest);
	const upstream = github(config);
	const provider: typeof upstream = {
		...upstream,
		createAuthorizationURL: authorizationURL(
			upstream,
			base,
			"/login/oauth/authorize",
		),
		async validateAuthorizationCode({ code, codeVerifier, redirectURI }) {
			const { body, headers } = await authorizationCodeRequest({
				code,
				codeVerifier,
				redirectURI,
				options: config,
			});
			const response = await fetch(tokenEndpoint, {
				method: "POST",
				body,
				headers,
			});
			if (!response.ok) return null;
			const data = await response.json();
			// GitHub reports most token errors with HTTP 200 and an error field.
			if ("error" in data) return null;
			return getOAuth2Tokens(data);
		},
		refreshAccessToken:
			config.refreshAccessToken ??
			((refreshToken) =>
				refreshMockAccessToken(refreshToken, config, tokenEndpoint, true)),
		async getUserInfo(token) {
			if (config.getUserInfo) return config.getUserInfo(token);
			const headers = {
				"User-Agent": "better-auth",
				authorization: `Bearer ${token.accessToken}`,
			};
			const profileResponse = await fetch(`${api}/user`, { headers });
			if (!profileResponse.ok) return null;
			const profile = (await profileResponse.json()) as GithubProfile;
			const emailsResponse = await fetch(`${api}/user/emails`, { headers });
			const emails = emailsResponse.ok
				? ((await emailsResponse.json()) as {
						email: string;
						primary: boolean;
						verified: boolean;
					}[])
				: undefined;
			if (!profile.email && emails)
				profile.email = (emails.find((e) => e.primary) ?? emails[0])?.email;
			const emailVerified =
				emails?.find((e) => e.email === profile.email)?.verified ?? false;
			const userMap = await config.mapProfileToUser?.(profile);
			return {
				user: {
					name: profile.name || profile.login || "",
					email: profile.email,
					image: profile.avatar_url,
					emailVerified,
					...userMap,
				},
				data: profile,
			};
		},
	};
	return mockSocialPlugin(
		provider,
		"github",
		"oauth-mock-github",
		config.disableImplicitSignUp,
	);
}
