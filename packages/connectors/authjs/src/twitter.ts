import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";
import Twitter, { type TwitterProfile } from "next-auth/providers/twitter";
import { MOCK_CLIENT, mockBase } from "./shared";

export type MockTwitterOptions = Partial<OAuthUserConfig<TwitterProfile>> & {
	/** Override only for a local or self-hosted provider. */
	origin?: string;
};

/** An endpoint's URL at the mock, keeping its query (the scope or `user.fields`). */
function moved(
	endpoint: string | { url?: string | URL } | undefined,
	fallback: string,
	url: string,
) {
	const given =
		typeof endpoint === "string" ? endpoint : (endpoint?.url ?? fallback);
	const target = new URL(url);
	target.search = new URL(given).search;
	return target;
}

/**
 * Auth.js's own Twitter provider with its three URLs pointed at the mock's X
 * endpoints. The provider's defaults keep their query strings (the scope and
 * `user.fields=profile_image_url`), and so do an app's own URLs, so its
 * profile mapping runs unchanged.
 */
export function MockTwitter(
	options: MockTwitterOptions = {},
): OAuthConfig<TwitterProfile> {
	const { origin, authorization, userinfo, ...rest } = options;
	const root = mockBase(origin, "x");
	// Auth.js puts the default scope in the authorization URL's query.
	const defaults = Twitter({});
	const authorize = moved(
		authorization,
		String(defaults.authorization),
		`${root}/i/oauth2/authorize`,
	);
	return Twitter({
		...rest,
		...MOCK_CLIENT,
		authorization: {
			url: `${root}/i/oauth2/authorize`,
			params: {
				...Object.fromEntries(authorize.searchParams),
				...(typeof authorization === "object" ? authorization.params : {}),
			},
		},
		token: `${root}/2/oauth2/token`,
		userinfo: {
			...(typeof userinfo === "object" ? userinfo : {}),
			url: moved(
				userinfo,
				String(defaults.userinfo),
				`${root}/2/users/me`,
			).toString(),
		},
	});
}
