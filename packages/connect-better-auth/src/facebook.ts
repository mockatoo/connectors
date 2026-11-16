import { validateAuthorizationCode } from "better-auth/oauth2";
import {
	type FacebookGraphProfile,
	type FacebookOptions,
	facebook,
} from "better-auth/social-providers";
import {
	type MockOptions,
	mockBase,
	mockSocialPlugin,
	refreshMockAccessToken,
	withMockClient,
} from "./shared";

export type MockFacebookOptions = MockOptions<FacebookOptions>;

/**
 * Replaces Better Auth's `facebook` social provider with the mock's Facebook
 * endpoints. Better Auth hardcodes www.facebook.com and graph.facebook.com,
 * so the profile lookup below, with its `debug_token` check, is upstream's
 * with only the URLs changed. Upstream builds the authorization URL,
 * including its Graph API version.
 */
export function mockFacebook(options: MockFacebookOptions = {}) {
	const { origin: configured, ...rest } = options;
	const base = mockBase(configured, "facebook");
	const graph = `${base}/graph`;
	const tokenEndpoint = `${graph}/v24.0/oauth/access_token`;
	const config = withMockClient(rest);
	const upstream = facebook(config);
	const provider: typeof upstream = {
		...upstream,
		async createAuthorizationURL(data) {
			const url = await upstream.createAuthorizationURL(data);
			return new URL(`${base}${url.pathname}${url.search}`);
		},
		// Like upstream, without PKCE: Better Auth's Facebook provider doesn't send a challenge.
		validateAuthorizationCode: ({ code, redirectURI }) =>
			validateAuthorizationCode({
				code,
				redirectURI,
				options: config,
				tokenEndpoint,
			}),
		// Facebook issues no refresh tokens, but the call stays at the mock.
		refreshAccessToken:
			config.refreshAccessToken ??
			((refreshToken) =>
				refreshMockAccessToken(refreshToken, config, tokenEndpoint, true)),
		// Copied from upstream's getUserInfo and verifyFacebookAccessToken,
		// with the mock's Graph URLs. The mock never issues ID tokens, so
		// upstream's Limited Login branch is left out.
		async getUserInfo(token) {
			if (config.getUserInfo) return config.getUserInfo(token);
			if (!token.accessToken) return null;
			const debug = new URL(`${graph}/debug_token`);
			debug.searchParams.set("input_token", token.accessToken);
			debug.searchParams.set(
				"access_token",
				`${config.clientId}|${config.clientSecret}`,
			);
			const inspected = await fetch(debug);
			if (!inspected.ok) return null;
			const data = (
				(await inspected.json()) as {
					data?: { is_valid?: boolean; app_id?: string; user_id?: string };
				}
			).data;
			if (
				data?.is_valid !== true ||
				data.app_id !== config.clientId ||
				!data.user_id
			)
				return null;
			const response = await fetch(
				`${graph}/me?fields=${["id", "name", "email", "picture", ...(config.fields ?? [])].join(",")}`,
				{ headers: { authorization: `Bearer ${token.accessToken}` } },
			);
			if (!response.ok) return null;
			const profile = (await response.json()) as FacebookGraphProfile;
			if (profile.id !== data.user_id) return null;
			const userMap = await config.mapProfileToUser?.(profile);
			return {
				user: {
					name: profile.name,
					email: profile.email,
					image: profile.picture.data.url,
					emailVerified: profile.email_verified ?? false,
					...userMap,
				},
				data: profile,
			};
		},
	};
	return mockSocialPlugin(
		provider,
		"facebook",
		"mockatoo-facebook",
		config.disableImplicitSignUp,
	);
}
