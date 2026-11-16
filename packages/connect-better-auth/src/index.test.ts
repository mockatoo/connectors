import { describe, expect, it } from "vitest";
import { createMockatooPlugin, mockatoo } from "./index";

const defaultURLs = {
	authorizationUrl: "https://app.mockatoo.globalunderdog.com/oauth/authorize",
	tokenUrl: "https://app.mockatoo.globalunderdog.com/oauth/token",
	userInfoUrl: "https://app.mockatoo.globalunderdog.com/oauth/userinfo",
};

describe("mockatoo generic OAuth helper", () => {
	it("returns the hosted provider configuration", () => {
		expect(mockatoo()).toMatchObject({
			providerId: "mockatoo",
			...defaultURLs,
			clientId: "mockatoo",
			clientSecret: "mockatoo-secret",
			scopes: ["openid", "profile", "email"],
			pkce: true,
		});
		expect(mockatoo()).not.toHaveProperty("redirectURI");
	});

	it("passes through redirect URI", () => {
		expect(
			mockatoo({
				redirectURI: "https://example.test/callback",
			}),
		).toMatchObject({
			authorizationUrl: defaultURLs.authorizationUrl,
			tokenUrl: defaultURLs.tokenUrl,
			userInfoUrl: defaultURLs.userInfoUrl,
			redirectURI: "https://example.test/callback",
		});
	});

	it("embeds the helper configuration in the plugin", () => {
		expect(JSON.stringify(createMockatooPlugin().options)).toContain(
			'"providerId":"mockatoo"',
		);
	});
});
