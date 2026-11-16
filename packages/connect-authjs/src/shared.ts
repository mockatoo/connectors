export const MOCK_ORIGIN = "https://app.mockatoo.globalunderdog.com";
/** Hosted by default; the environment override is for Mockatoo development. */
export const MOCKATOO_URL =
	(typeof process !== "undefined" && process.env.MOCKATOO_URL) || MOCK_ORIGIN;
export const MOCK_CLIENT = {
	clientId: "mockatoo",
	clientSecret: "mockatoo-secret",
} as const;

export function mockOrigin(origin: string): string {
	return new URL(origin).origin;
}

export function mockBase(provider: string): string {
	return `${mockOrigin(MOCKATOO_URL)}/${provider}`;
}
