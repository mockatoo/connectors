import { type MicrosoftOptions, microsoft } from "better-auth/social-providers";
import {
	decodeJwtClaims,
	type MockOptions,
	mockBase,
	mockSocialPlugin,
	type OAuth2Tokens,
	withMockClient,
} from "./shared";

export type MockMicrosoftOptions = MockOptions<MicrosoftOptions>;

/**
 * Better Auth's own `microsoft` social provider with its `authority` pointed at
 * the mock. Nothing else is replaced: the mock serves the same
 * `/{tenant}/oauth2/v2.0/...` paths as login.microsoftonline.com.
 */
export function mockMicrosoft(options: MockMicrosoftOptions = {}) {
	// A production client assertion would sign for Microsoft; the mock uses its
	// shared secret. 1.7.x rejects a client assertion combined with the mock's
	// clientSecret, and 1.4.x has no such option, so strip it either way.
	const { clientAssertion: _, ...rest } = options as MockMicrosoftOptions & {
		clientAssertion?: unknown;
	};
	const config = withMockClient(rest);
	const upstream = microsoft({
		...config,
		authority: mockBase("login.microsoftonline.com"),
		// The photo is fetched from graph.microsoft.com, which cannot be redirected.
		disableProfilePhoto: true,
	});
	const provider: Record<string, unknown> = {
		...upstream,
		// 1.4.x fetches graph.microsoft.com even with disableProfilePhoto.
		async getUserInfo(token: OAuth2Tokens) {
			if (config.getUserInfo) return config.getUserInfo(token);
			if (!token.idToken) return null;
			const user = decodeJwtClaims(token.idToken) as {
				sub?: string;
				name?: string;
				email?: string;
				picture?: string;
				email_verified?: boolean;
				verified_primary_email?: string[];
				verified_secondary_email?: string[];
			};
			const userMap = await config.mapProfileToUser?.(
				user as Parameters<NonNullable<typeof config.mapProfileToUser>>[0],
			);
			const emailVerified =
				user.email_verified !== undefined
					? user.email_verified
					: Boolean(
							user.email &&
								(user.verified_primary_email?.includes(user.email) ||
									user.verified_secondary_email?.includes(user.email)),
						);
			return {
				user: {
					id: user.sub,
					name: user.name,
					email: user.email,
					image: user.picture,
					emailVerified,
					...userMap,
				},
				data: user,
			};
		},
	};
	return mockSocialPlugin(
		provider,
		"microsoft",
		"mockatoo-microsoft",
		rest.disableImplicitSignUp,
	);
}
