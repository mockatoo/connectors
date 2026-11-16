import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
	vi.unstubAllEnvs();
	vi.resetModules();
});

for (const override of [undefined, "", "http://localhost:3210"]) {
	test(`both public connectors resolve the URL with override ${JSON.stringify(override)}`, async () => {
		vi.stubEnv("MOCKATOO_URL", override);
		vi.resetModules();
		const authjs = await import("./index");
		const betterAuth = await import("../../connect-better-auth/src/index");
		const expected = override || "https://app.mockatoo.globalunderdog.com";
		expect(authjs.MOCKATOO_URL).toBe(expected);
		expect(betterAuth.MOCKATOO_URL).toBe(expected);
		expect(authjs.MockatooProvider().token).toBe(`${expected}/oauth/token`);
	});
}
