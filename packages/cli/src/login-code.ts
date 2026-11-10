/**
 * The login code: `mka_` followed by base64url JSON with the test account's
 * email and password. The mock's dashboard produces the same format.
 */
export const LOGIN_CODE_PREFIX = "mka_";

export type Credentials = { email: string; password: string };

/**
 * Reads a code from a pasted code or from a whole pasted command. Returns
 * undefined when no valid code is in the input.
 */
export function decodeLoginCode(input: string): Credentials | undefined {
	const code = input.match(/mka_[A-Za-z0-9_-]+/)?.[0];
	if (!code) return undefined;
	try {
		const value = JSON.parse(
			Buffer.from(code.slice(LOGIN_CODE_PREFIX.length), "base64url").toString(),
		);
		if (typeof value?.email === "string" && typeof value?.password === "string")
			return { email: value.email, password: value.password };
	} catch {}
	return undefined;
}
