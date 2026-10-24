import { Auth, skipCSRFCheck } from "@auth/core";
import { afterEach, expect, it, vi } from "vitest";
import {
	MockApple,
	MockatooProvider,
	MockDiscord,
	MockFacebook,
	MockGitHub,
	MockGoogle,
	MockLinkedIn,
	MockMicrosoftEntraID,
	MockTwitter,
} from "./index";

afterEach(() => vi.unstubAllEnvs());

type Options = { issuer?: string; enterprise?: { baseUrl?: string } };
const options = (provider: { options?: unknown }) =>
	provider.options as Options;

it("points every provider at the hosted mock by default", () => {
	expect(options(MockGoogle()).issuer).toBe("https://mockatoo.com/google");
	expect(options(MockApple()).issuer).toBe("https://mockatoo.com/apple");
	expect(options(MockGitHub()).enterprise?.baseUrl).toBe(
		"https://mockatoo.com/github",
	);
	expect(options(MockMicrosoftEntraID()).issuer).toBe(
		"https://mockatoo.com/login.microsoftonline.com/common/v2.0",
	);
	expect(MockatooProvider().authorization).toMatchObject({
		url: "https://mockatoo.com/oauth/authorize",
	});
});

it("points Auth.js's Discord provider's three URLs at the mock, keeping its scope", () => {
	const provider = MockDiscord({
		origin: "http://mock.test",
		authorization: { params: { prompt: "consent" } },
	});
	expect(provider.options).toMatchObject({
		authorization: {
			url: "http://mock.test/discord/api/oauth2/authorize",
			params: { prompt: "consent" },
		},
		token: "http://mock.test/discord/api/oauth2/token",
		userinfo: "http://mock.test/discord/api/users/@me",
	});
	expect(provider.options).not.toHaveProperty("issuer");
	// The app's workaround for Discord's iss names the real issuer; the mock's replaces it.
	expect(
		MockDiscord({ origin: "http://mock.test", issuer: "https://discord.com" })
			.options?.issuer,
	).toBe("http://mock.test/discord");
	expect(MockDiscord().options?.token).toBe(
		"https://mockatoo.com/discord/api/oauth2/token",
	);
	expect(MockDiscord({ authorization: "x" }).options?.authorization).toEqual({
		url: "https://mockatoo.com/discord/api/oauth2/authorize",
	});
});

it("points Auth.js's LinkedIn provider at the mock's LinkedIn issuer", () => {
	const provider = MockLinkedIn({ origin: "http://mock.test/ignored" });
	expect(provider.options).toMatchObject({
		issuer: "http://mock.test/linkedin/oauth",
		clientId: "mockatoo",
		clientSecret: "mockatoo-secret",
	});
	expect(provider.type).toBe("oidc");
	expect(MockLinkedIn().options?.issuer).toBe(
		"https://mockatoo.com/linkedin/oauth",
	);
});

it("points Auth.js's Twitter provider at the mock's X endpoints, keeping its query strings", () => {
	expect(
		MockTwitter({ origin: "http://mock.test/ignored" }).options,
	).toMatchObject({
		clientId: "mockatoo",
		clientSecret: "mockatoo-secret",
		authorization: {
			url: "http://mock.test/x/i/oauth2/authorize",
			params: { scope: "users.read tweet.read offline.access" },
		},
		token: "http://mock.test/x/2/oauth2/token",
		userinfo: {
			url: "http://mock.test/x/2/users/me?user.fields=profile_image_url",
		},
	});
	// An app's own scope and user.fields carry over, by URL or by params.
	const custom = MockTwitter({
		authorization:
			"https://x.com/i/oauth2/authorize?scope=users.read%20tweet.read%20users.email",
		userinfo:
			"https://api.x.com/2/users/me?user.fields=profile_image_url,confirmed_email",
	}).options;
	expect(custom?.authorization).toEqual({
		url: "https://mockatoo.com/x/i/oauth2/authorize",
		params: { scope: "users.read tweet.read users.email" },
	});
	expect(custom?.userinfo).toEqual({
		url: "https://mockatoo.com/x/2/users/me?user.fields=profile_image_url,confirmed_email",
	});
	expect(
		MockTwitter({ authorization: { params: { scope: "users.read" } } }).options
			?.authorization,
	).toEqual({
		url: "https://mockatoo.com/x/i/oauth2/authorize",
		params: { scope: "users.read" },
	});
});

it("moves Auth.js's Facebook URLs to the mock, keeping their paths and versions", () => {
	const provider = MockFacebook({
		origin: "http://mock.test/ignored",
		authorization: { params: { scope: "email,user_birthday" } },
	});
	expect(provider).toMatchObject({
		id: "facebook",
		authorization: { url: "http://mock.test/facebook/v19.0/dialog/oauth" },
		token: "http://mock.test/facebook/graph/oauth/access_token",
		userinfo: {
			url: "http://mock.test/facebook/graph/me?fields=id,name,email,picture",
			request: expect.any(Function),
		},
	});
	expect(provider.options).toMatchObject({
		clientId: "mockatoo",
		clientSecret: "mockatoo-secret",
		authorization: { params: { scope: "email,user_birthday" } },
	});
	expect(MockFacebook().token).toBe(
		"https://mockatoo.com/facebook/graph/oauth/access_token",
	);
});

it.each([false, true])(
	"keeps custom Facebook URLs at the mock after Auth.js merges options (objects: %s)",
	async (objects) => {
		const authorization =
			"https://www.facebook.com/v24.0/dialog/oauth?scope=email,user_birthday";
		const token = "https://graph.facebook.com/v24.0/oauth/access_token";
		const userinfo =
			"https://graph.facebook.com/v24.0/me?fields=id,name,email,picture.type(large)";
		const profile = vi.fn();
		const provider = MockFacebook({
			origin: "http://mock.test",
			clientId: "real-app",
			clientSecret: "real-secret",
			profile,
			authorization: objects
				? { url: authorization, params: { auth_type: "rerequest" } }
				: authorization,
			token: objects ? { url: token, params: { custom: "value" } } : token,
			userinfo: objects ? { url: userinfo } : userinfo,
		});
		expect(provider.options).toMatchObject({
			clientId: "mockatoo",
			clientSecret: "mockatoo-secret",
			profile,
			authorization: {
				url: "http://mock.test/facebook/v24.0/dialog/oauth?scope=email,user_birthday",
				params: {
					scope: "email,user_birthday",
					...(objects ? { auth_type: "rerequest" } : {}),
				},
			},
			userinfo: {
				url: "http://mock.test/facebook/graph/v24.0/me?fields=id,name,email,picture.type(large)",
				request: expect.any(Function),
			},
		});
		expect(provider.options?.token).toEqual(
			objects
				? {
						url: "http://mock.test/facebook/graph/v24.0/oauth/access_token",
						params: { custom: "value" },
					}
				: "http://mock.test/facebook/graph/v24.0/oauth/access_token",
		);
		const response = await Auth(
			new Request("http://app.test/api/auth/signin/facebook", {
				method: "POST",
			}),
			{
				providers: [provider],
				secret: "facebook-test-secret-at-least-thirty-two-characters",
				basePath: "/api/auth",
				trustHost: true,
				skipCSRFCheck,
			},
		);
		const target = new URL(response.headers.get("location") ?? "");
		expect(target.origin).toBe("http://mock.test");
		expect(target.pathname).toBe("/facebook/v24.0/dialog/oauth");
		expect(target.searchParams.get("scope")).toBe("email,user_birthday");
		if (objects) expect(target.searchParams.get("auth_type")).toBe("rerequest");
	},
);

it("takes Microsoft's tenant from the Auth.js issuer environment variable", () => {
	vi.stubEnv(
		"AUTH_MICROSOFT_ENTRA_ID_ISSUER",
		"https://login.microsoftonline.com/organizations/v2.0",
	);
	expect(options(MockMicrosoftEntraID()).issuer).toBe(
		"https://mockatoo.com/login.microsoftonline.com/organizations/v2.0",
	);
});

it("keeps a custom Microsoft profile mapping", () => {
	const profile = vi.fn();
	const provider = MockMicrosoftEntraID({ profile });
	expect((provider.options as { profile?: unknown }).profile).toBe(profile);
});

it("maps the generic profile with and without a picture", () => {
	const provider = MockatooProvider();
	const base = { sub: "1", name: "A", email: "a@x.test", email_verified: true };
	expect(provider.profile?.({ ...base, picture: "p" }, {} as never)).toEqual({
		id: "1",
		name: "A",
		email: "a@x.test",
		image: "p",
	});
	expect(provider.profile?.(base, {} as never)).toMatchObject({ image: null });
});
