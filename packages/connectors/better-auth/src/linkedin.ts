import { validateAuthorizationCode } from "better-auth/oauth2";
import {
	type LinkedInOptions,
	type LinkedInProfile,
	linkedin,
} from "better-auth/social-providers";
import {
	authorizationURL,
	type MockOptions,
	mockBase,
	mockSocialPlugin,
	refreshMockAccessToken,
	withMockClient,
} from "./shared";

export type MockLinkedInOptions = MockOptions<LinkedInOptions>;

/**
 * Replaces Better Auth's `linkedin` social provider with the mock's LinkedIn
 * endpoints. Better Auth hardcodes www.linkedin.com and api.linkedin.com, so
 * the profile lookup below is upstream's with only the URL changed. Upstream
 * builds the authorization URL and its scopes.
 */
export function mockLinkedIn(options: MockLinkedInOptions = {}) {
	const { origin: configured, ...rest } = options;
	const base = mockBase(configured, "linkedin");
	const tokenEndpoint = `${base}/oauth/v2/accessToken`;
	const config = withMockClient(rest);
	const upstream = linkedin(config);
	const provider: typeof upstream = {
		...upstream,
		createAuthorizationURL: authorizationURL(
			upstream,
			base,
			"/oauth/v2/authorization",
		),
		// Like upstream, without PKCE: Better Auth's LinkedIn provider doesn't send a challenge.
		validateAuthorizationCode: ({ code, redirectURI }) =>
			validateAuthorizationCode({
				code,
				redirectURI,
				options: config,
				tokenEndpoint,
			}),
		refreshAccessToken:
			config.refreshAccessToken ??
			((refreshToken) =>
				refreshMockAccessToken(refreshToken, config, tokenEndpoint, true)),
		// Copied from upstream's getUserInfo, with the mock's userinfo URL.
		async getUserInfo(token) {
			if (config.getUserInfo) return config.getUserInfo(token);
			const response = await fetch(`${base}/v2/userinfo`, {
				headers: { authorization: `Bearer ${token.accessToken}` },
			});
			if (!response.ok) return null;
			const profile = (await response.json()) as LinkedInProfile;
			const userMap = await config.mapProfileToUser?.(profile);
			return {
				user: {
					name: profile.name,
					email: profile.email,
					emailVerified: profile.email_verified ?? false,
					image: profile.picture,
					...userMap,
				},
				data: profile,
			};
		},
	};
	return mockSocialPlugin(
		provider,
		"linkedin",
		"oauth-mock-linkedin",
		config.disableImplicitSignUp,
	);
}
