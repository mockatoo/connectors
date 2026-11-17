import { afterEach, expect, it, vi } from "vitest";
import {
	mockDiscord,
	mockGitHub,
	mockLinkedIn,
	mockMicrosoft,
	mockTwitter,
} from "./index";
import { decodeJwtClaims } from "./shared";

type Provider = {
	id: string;
	getUserInfo(token: never): Promise<{ user: { id?: string } }>;
};
type Plugin = ReturnType<typeof mockGitHub>;

type ProfileIds = {
	data?: { id?: string };
	sub?: string;
	id?: string;
};

const token = (idToken: string) =>
	({ accessToken: "access-token", idToken }) as never;
const providerOf = (plugin: Plugin) => {
	const result = plugin.init!({
		socialProviders: [],
	} as unknown as Parameters<NonNullable<Plugin["init"]>>[0]) as {
		context: { socialProviders: Provider[] };
	};
	return result.context.socialProviders[0];
};

function jwt(payload: Record<string, unknown>) {
	const encoded = btoa(JSON.stringify(payload))
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replaceAll("=", "");
	return `header.${encoded}.signature`;
}

afterEach(() => vi.unstubAllGlobals());

it("decodes Microsoft claims and maps them without a Graph photo request", async () => {
	const claims = {
		sub: "microsoft-user",
		name: "Microsoft User",
		email: "user@example.test",
		verified_primary_email: ["user@example.test"],
		picture: "https://mock.test/photo",
	};
	const idToken = jwt(claims);
	expect(decodeJwtClaims(idToken)).toEqual(claims);
	const fetchMock = vi.fn();
	vi.stubGlobal("fetch", fetchMock);

	const result = await providerOf(mockMicrosoft()).getUserInfo(token(idToken));

	expect(result.user).toMatchObject({
		id: "microsoft-user",
		name: "Microsoft User",
		email: "user@example.test",
		emailVerified: true,
		image: "https://mock.test/photo",
	});
	expect(fetchMock).not.toHaveBeenCalled();
});

it.each([
	["GitHub", () => mockGitHub(), { id: "github-user", login: "github" }],
	[
		"Discord",
		() => mockDiscord(),
		{
			id: "123456789012345678",
			username: "discord",
			verified: true,
			avatar: null,
			discriminator: "0",
		},
	],
	[
		"LinkedIn",
		() => mockLinkedIn(),
		{ sub: "linkedin-user", name: "LinkedIn" },
	],
	[
		"Twitter",
		() => mockTwitter(),
		{ data: { id: "twitter-user", name: "Twitter" } },
	],
] as const)(
	"shapes %s user IDs for the installed Better Auth version",
	async (_name, create, profile) => {
		vi.stubGlobal(
			"fetch",
			vi.fn((url: string) =>
				Promise.resolve(
					new Response(
						JSON.stringify(url.includes("/user/emails") ? [] : profile),
					),
				),
			),
		);
		const provider = providerOf(create());
		const result = await provider.getUserInfo(token("unused"));
		const profileRecord = profile as unknown as ProfileIds;
		const expectedId =
			"accountSubject" in provider
				? undefined
				: (profileRecord.data?.id ?? profileRecord.sub ?? profileRecord.id);
		expect(result.user.id).toBe(expectedId);
	},
);
