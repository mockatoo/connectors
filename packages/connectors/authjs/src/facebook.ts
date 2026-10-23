import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";
import Facebook, { type FacebookProfile } from "next-auth/providers/facebook";
import { MOCK_CLIENT, mockBase } from "./shared";

export type MockFacebookOptions = Partial<OAuthUserConfig<FacebookProfile>> & {
	/** Override only for a local or self-hosted provider. */
	origin?: string;
};

/**
 * Auth.js's own Facebook provider with its three URLs moved to the mock,
 * keeping their paths and Graph API versions: www.facebook.com becomes
 * `<mock>/facebook` and graph.facebook.com `<mock>/facebook/graph`. Its
 * scopes, `/me` request and profile mapping run unchanged.
 */
export function MockFacebook(
	options: MockFacebookOptions = {},
): OAuthConfig<FacebookProfile> {
	const { origin, authorization, token, userinfo, ...rest } = options;
	const root = mockBase(origin, "facebook");
	const provider = Facebook({
		...rest,
		...MOCK_CLIENT,
	});
	const move = (url: string, graph = false) => {
		const { pathname, search } = new URL(url);
		return `${root}${graph ? "/graph" : ""}${pathname}${search}`;
	};
	const defaults = provider as {
		authorization: { url: string; params: Record<string, string> };
		token: string;
		userinfo: { url: string };
	};
	const authorizationUrl =
		typeof authorization === "string"
			? authorization
			: (authorization?.url ?? defaults.authorization.url);
	const movedAuthorization = {
		...defaults.authorization,
		...(typeof authorization === "object" ? authorization : {}),
		url: move(authorizationUrl),
		params: {
			...defaults.authorization.params,
			...Object.fromEntries(new URL(authorizationUrl).searchParams),
			...(typeof authorization === "object" ? authorization.params : {}),
		},
	};
	const movedToken =
		typeof token === "object"
			? { ...token, url: move(token.url ?? defaults.token, true) }
			: move(token ?? defaults.token, true);
	const movedUserinfo = {
		...defaults.userinfo,
		...(typeof userinfo === "object" ? userinfo : {}),
		url: move(
			typeof userinfo === "string"
				? userinfo
				: (userinfo?.url ?? defaults.userinfo.url),
			true,
		),
	};
	return {
		...provider,
		authorization: movedAuthorization,
		token: movedToken,
		userinfo: movedUserinfo,
		// Auth.js merges options over the provider defaults during normalization.
		options: {
			...provider.options,
			authorization: movedAuthorization,
			token: movedToken,
			userinfo: movedUserinfo,
		},
	};
}
