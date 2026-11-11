import { describe, expect, it } from "vitest";
import { setEnvValues } from "./env-file";
import { decodeLoginCode } from "./login-code";

/** The code the mock's dashboard produces: mka_ and base64url JSON. */
const code = (value: object) =>
	`mka_${Buffer.from(JSON.stringify(value)).toString("base64url")}`;

describe("decodeLoginCode", () => {
	it("reads a bare code and a whole pasted command", () => {
		const credentials = { email: "a@example.com", password: "pw-123" };
		expect(decodeLoginCode(code(credentials))).toEqual(credentials);
		expect(
			decodeLoginCode(
				`npx -y @mockatoo/mockatoo@latest login ${code(credentials)}`,
			),
		).toEqual(credentials);
	});

	it("rejects anything that is not a code", () => {
		expect(decodeLoginCode("hello")).toBeUndefined();
		expect(decodeLoginCode(code({ email: "a@example.com" }))).toBeUndefined();
	});
});

describe("setEnvValues", () => {
	it("replaces existing keys in place and keeps other lines", () => {
		const source = "# app\nAPI_URL=x\nMOCK_EMAIL=old@example.com\n";
		expect(
			setEnvValues(source, {
				MOCK_EMAIL: "new@example.com",
				MOCK_PASSWORD: "pw",
			}),
		).toBe("# app\nAPI_URL=x\nMOCK_EMAIL=new@example.com\nMOCK_PASSWORD=pw\n");
	});

	it("creates the file contents and quotes values that need it", () => {
		expect(setEnvValues("", { MOCK_PASSWORD: "a b#c" })).toBe(
			'MOCK_PASSWORD="a b#c"\n',
		);
	});
});
