import { validateAuthorizationCode } from "better-auth/oauth2";
import { type GoogleOptions, google } from "better-auth/social-providers";
import {
	authorizationURL,
	type CodeRequest,
	type MockOptions,
	mockBase,
	mockJwks,
	mockSocialPlugin,
	refreshMockAccessToken,
	withMockClient,
} from "./shared";

export type MockGoogleOptions = MockOptions<GoogleOptions>;

/**
 * Replaces Better Auth's `google` social provider with the mock's Google
 * endpoints. The upstream adapter still builds the authorization URL and maps
 * the ID token, so app code keeps using `signIn.social({ provider: "google" })`.
 */
export function mockGoogle(options: MockGoogleOptions = {}) {
	const base = mockBase("google");
	const tokenEndpoint = `${base}/token`;
	const config = withMockClient(options);
	const upstream = google(config);
	const provider: Record<string, unknown> = {
		...upstream,
		createAuthorizationURL: authorizationURL(
			upstream,
			base,
			"/o/oauth2/v2/auth",
		),
		validateAuthorizationCode: ({
			code,
			codeVerifier,
			redirectURI,
		}: CodeRequest) =>
			validateAuthorizationCode({
				code,
				codeVerifier,
				redirectURI,
				options: config,
				tokenEndpoint,
			}),
		refreshAccessToken:
			config.refreshAccessToken ??
			((refreshToken: string) =>
				refreshMockAccessToken(refreshToken, config, tokenEndpoint)),
		idToken: {
			...(upstream as unknown as { idToken: Record<string, unknown> }).idToken,
			issuer: [base],
			jwks: mockJwks(`${base}/oauth2/v3/certs`),
		},
	};
	return mockSocialPlugin(
		provider,
		"google",
		"mockatoo-google",
		config.disableImplicitSignUp,
	);
}
