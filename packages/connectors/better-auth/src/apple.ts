import {
	refreshAccessToken,
	validateAuthorizationCode,
} from "better-auth/oauth2";
import { type AppleOptions, apple } from "better-auth/social-providers";
import {
	authorizationURL,
	type MockOptions,
	mockBase,
	mockJwks,
	mockSocialPlugin,
	withMockClient,
} from "./shared";

export type MockAppleOptions = MockOptions<AppleOptions>;

/**
 * Replaces Better Auth's `apple` social provider with the mock's Apple
 * endpoints. The upstream adapter still builds the authorization URL and reads
 * the ID token and first-sign-in `user` field.
 */
export function mockApple(options: MockAppleOptions = {}) {
	const { origin: configured, ...rest } = options;
	const origin = new URL(configured ?? "https://oauth-mock.com").origin;
	const base = mockBase(origin, "apple");
	const tokenEndpoint = `${base}/auth/token`;
	const config = withMockClient(rest);
	const upstream = apple(config);
	const provider: typeof upstream = {
		...upstream,
		createAuthorizationURL: authorizationURL(upstream, base, "/auth/authorize"),
		validateAuthorizationCode: ({ code, codeVerifier, redirectURI }) =>
			validateAuthorizationCode({
				code,
				codeVerifier,
				redirectURI,
				options: config,
				tokenEndpoint,
			}),
		refreshAccessToken:
			config.refreshAccessToken ??
			((refreshToken) =>
				refreshAccessToken({ refreshToken, options: config, tokenEndpoint })),
		idToken: {
			...upstream.idToken,
			issuer: base,
			// The mock signs for its shared client, not a production bundle identifier.
			audience: config.clientId,
			jwks: mockJwks(`${base}/auth/keys`),
		},
	};
	return mockSocialPlugin(
		provider,
		"apple",
		"oauth-mock-apple",
		config.disableImplicitSignUp,
		{
			options: {
				// Apple's form_post comes from another site, so the browser sends no
				// cookies and Better Auth skips its origin check. A mock on the same
				// site (localhost) gets cookies, so its origin must be trusted.
				trustedOrigins: [origin],
			},
		},
	);
}
