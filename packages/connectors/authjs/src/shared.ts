export const MOCK_ORIGIN = "https://oauth-mock.com";
export const MOCK_CLIENT = {
	clientId: "oauth-mock",
	clientSecret: "oauth-mock-secret",
} as const;

export function mockOrigin(origin?: string): string {
	return new URL(origin ?? MOCK_ORIGIN).origin;
}

export function mockBase(origin: string | undefined, provider: string): string {
	return `${mockOrigin(origin)}/${provider}`;
}
