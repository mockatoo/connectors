import {
	refreshAccessToken,
	validateAuthorizationCode,
} from "better-auth/oauth2";
import {
	type TwitterOption,
	type TwitterProfile,
	twitter,
} from "better-auth/social-providers";
import {
	authorizationURL,
	type CodeRequest,
	type MockOptions,
	mockBase,
	mockSocialPlugin,
	type OAuth2Tokens,
	withMockClient,
} from "./shared";

export type MockTwitterOptions = MockOptions<TwitterOption>;

/** Better Auth's placeholder for an account without an email (RFC 6761). */
const placeholderEmail = (id: string) => `${id}@twitter.placeholder.invalid`;

/**
 * Replaces Better Auth's `twitter` social provider with the mock's X
 * endpoints. Better Auth hardcodes x.com and api.x.com, so the profile lookup
 * below is upstream's with only the URLs changed. Upstream builds the
 * authorization URL; the token and refresh calls use Better Auth's helpers
 * with X's Basic client authentication.
 */
export function mockTwitter(options: MockTwitterOptions = {}) {
	const base = mockBase("x");
	const tokenEndpoint = `${base}/2/oauth2/token`;
	const config = withMockClient(options);
	const upstream = twitter(config);
	const provider: Record<string, unknown> = {
		...upstream,
		createAuthorizationURL: authorizationURL(
			upstream,
			base,
			"/i/oauth2/authorize",
		),
		validateAuthorizationCode: ({
			code,
			codeVerifier,
			redirectURI,
		}: CodeRequest) =>
			validateAuthorizationCode({
				code,
				codeVerifier,
				authentication: "basic",
				redirectURI,
				options: config,
				tokenEndpoint,
			}),
		refreshAccessToken:
			config.refreshAccessToken ??
			((refreshToken: string) =>
				refreshAccessToken({
					refreshToken,
					options: {
						clientId: config.clientId,
						clientKey: config.clientKey,
						clientSecret: config.clientSecret,
					},
					authentication: "basic",
					tokenEndpoint,
				})),
		async getUserInfo(token: OAuth2Tokens) {
			if (config.getUserInfo) return config.getUserInfo(token);
			const headers = { authorization: `Bearer ${token.accessToken}` };
			const profileResponse = await fetch(
				`${base}/2/users/me?user.fields=profile_image_url`,
				{ headers },
			);
			if (!profileResponse.ok) return null;
			const profile = (await profileResponse.json()) as TwitterProfile;
			const emailResponse = await fetch(
				`${base}/2/users/me?user.fields=confirmed_email`,
				{ headers },
			);
			const emailData = emailResponse.ok
				? ((await emailResponse.json()) as {
						data?: { confirmed_email?: string };
					})
				: undefined;
			let emailVerified = false;
			if (emailData?.data?.confirmed_email) {
				profile.data.email = emailData.data.confirmed_email;
				emailVerified = true;
			}
			const userMap = await config.mapProfileToUser?.(profile);
			return {
				user: {
					// 1.4.x takes the account id from user.id; 1.7.x derives it from
					// accountSubject and overwrites this.
					...("accountSubject" in upstream ? {} : { id: profile.data.id }),
					name: profile.data.name,
					email: profile.data.email || placeholderEmail(profile.data.id),
					image: profile.data.profile_image_url,
					emailVerified,
					...userMap,
				},
				data: profile,
			};
		},
	};
	return mockSocialPlugin(
		provider,
		"twitter",
		"mockatoo-twitter",
		config.disableImplicitSignUp,
	);
}
