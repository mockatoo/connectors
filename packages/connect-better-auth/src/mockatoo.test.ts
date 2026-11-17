import { describe, expect, it } from "vitest";
import { mockatoo } from "./mockatoo";

describe("mockatoo generic OAuth helper", () => {
	it("discovers the hosted Google mock with the shared client", () => {
		expect(mockatoo()).toEqual({
			providerId: "mockatoo",
			discoveryUrl:
				"https://app.mockatoo.globalunderdog.com/google/.well-known/openid-configuration",
			clientId: "mockatoo",
			clientSecret: "mockatoo-secret",
			scopes: ["openid", "profile", "email"],
			pkce: true,
		});
	});

	it("passes through redirect URI", () => {
		expect(
			mockatoo({ redirectURI: "https://example.test/callback" }).redirectURI,
		).toBe("https://example.test/callback");
	});
});
