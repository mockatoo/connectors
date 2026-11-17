import { validateAuthorizationCode } from "better-auth/oauth2";
import {
	type GithubOptions,
	type GithubProfile,
	github,
} from "better-auth/social-providers";
import {
	authorizationURL,
	type CodeRequest,
	type MockOptions,
	mockBase,
	mockSocialPlugin,
	type OAuth2Tokens,
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
	const base = mockBase("github");
	const tokenEndpoint = `${base}/login/oauth/access_token`;
	const api = `${base}/api/v3`;
	const config = withMockClient(options);
	const upstream = github(config);
	const provider: Record<string, unknown> = {
		...upstream,
		createAuthorizationURL: authorizationURL(
			upstream,
			base,
			"/login/oauth/authorize",
		),
		// GitHub reports most token errors with HTTP 200 and an error field.
		validateAuthorizationCode: async ({
			code,
			codeVerifier,
			redirectURI,
		}: CodeRequest) => {
			try {
				const tokens = await validateAuthorizationCode({
					code,
					codeVerifier,
					redirectURI,
					options: config,
					tokenEndpoint,
				});
				if (tokens.raw?.error) return null;
				return tokens;
			} catch {
				return null;
			}
		},
		refreshAccessToken:
			config.refreshAccessToken ??
			((refreshToken: string) =>
				refreshMockAccessToken(refreshToken, config, tokenEndpoint, true)),
		async getUserInfo(token: OAuth2Tokens) {
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
					// 1.4.x takes the account id from user.id; 1.7.x derives it from
					// accountSubject and overwrites this.
					...("accountSubject" in upstream ? {} : { id: profile.id }),
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
		"mockatoo-github",
		config.disableImplicitSignUp,
	);
}
