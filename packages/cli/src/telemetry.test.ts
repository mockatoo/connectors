import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	detectAgent,
	readTelemetryConfig,
	resolveTelemetryStatus,
	sendTelemetryEvent,
	telemetryConfigPath,
	writeTelemetryConfig,
} from "./telemetry";

const tempDirs: string[] = [];
const makeConfigPath = () => {
	const dir = mkdtempSync(join(tmpdir(), "mockatoo-telemetry-"));
	tempDirs.push(dir);
	return join(dir, "mockatoo", "telemetry.json");
};

afterEach(() => {
	for (const dir of tempDirs.splice(0))
		rmSync(dir, { recursive: true, force: true });
});

describe("telemetry config & gates", () => {
	it("resolves config paths per platform and keeps installId stable across updates", () => {
		expect(
			telemetryConfigPath({ XDG_CONFIG_HOME: "/xdg" }, "linux", "/home/dev"),
		).toBe("/xdg/mockatoo/telemetry.json");
		expect(
			telemetryConfigPath(
				{ APPDATA: "C:\\AppData" },
				"win32",
				"C:\\Users\\dev",
			),
		).toBe(join("C:\\AppData", "mockatoo", "telemetry.json"));

		const configPath = makeConfigPath();
		const first = writeTelemetryConfig(true, configPath);
		const second = writeTelemetryConfig(false, configPath);
		expect(first?.installId).toMatch(/^[0-9a-f-]{36}$/);
		expect(second?.installId).toBe(first?.installId);
		expect(readTelemetryConfig(configPath)).toEqual(second);
	});

	it.each([
		[{}, false, false, "not configured"],
		[{ MOCKATOO_TELEMETRY: "1" }, true, true, "MOCKATOO_TELEMETRY=1"],
		[
			{ DO_NOT_TRACK: "1", MOCKATOO_TELEMETRY: "1" },
			false,
			true,
			"DO_NOT_TRACK=1",
		],
		[
			{ MOCKATOO_TELEMETRY_DISABLED: "1", MOCKATOO_TELEMETRY: "1" },
			false,
			true,
			"MOCKATOO_TELEMETRY_DISABLED=1",
		],
		[{ CI: "true", MOCKATOO_TELEMETRY: "1" }, false, true, "CI"],
	])(
		"evaluates env %j → enabled=%s configured=%s",
		(env, enabled, configured, reason) => {
			expect(
				resolveTelemetryStatus({ env, configPath: makeConfigPath() }),
			).toMatchObject({ enabled, configured, reason });
		},
	);

	it("respects saved config and ignores CI=false", () => {
		const configPath = makeConfigPath();
		writeTelemetryConfig(true, configPath);
		expect(
			resolveTelemetryStatus({ env: { CI: "false" }, configPath }),
		).toMatchObject({ enabled: true, configured: true, reason: "user config" });
		writeTelemetryConfig(false, configPath);
		expect(resolveTelemetryStatus({ env: {}, configPath })).toMatchObject({
			enabled: false,
			configured: true,
			reason: "user config",
		});
	});

	it("detects coding agents from env", () => {
		expect(detectAgent({ CLAUDECODE: "1" })).toBe("claude-code");
		expect(detectAgent({ CURSOR_AGENT: "1" })).toBe("cursor");
		expect(detectAgent({})).toBeUndefined();
	});
});

describe("sendTelemetryEvent", () => {
	it("skips when disabled, unconfigured, or under MOCKATOO_URL", async () => {
		const configPath = makeConfigPath();
		const fetchImpl = vi.fn<typeof fetch>();
		const event = {
			command: "init" as const,
			success: true,
			cliVersion: "0.1.0",
		};

		expect(
			await sendTelemetryEvent(event, { env: {}, configPath, fetchImpl }),
		).toBe(false);
		writeTelemetryConfig(true, configPath);
		expect(
			await sendTelemetryEvent(event, {
				env: { DO_NOT_TRACK: "1" },
				configPath,
				fetchImpl,
			}),
		).toBe(false);
		expect(
			await sendTelemetryEvent(event, {
				env: { CI: "1" },
				configPath,
				fetchImpl,
			}),
		).toBe(false);
		expect(
			await sendTelemetryEvent(event, {
				env: { MOCKATOO_URL: "http://localhost:3000" },
				configPath,
				fetchImpl,
			}),
		).toBe(false);
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("sends cli_command_run with allowed fields and swallows network errors", async () => {
		const configPath = makeConfigPath();
		const saved = writeTelemetryConfig(true, configPath);
		const fetchImpl = vi.fn<typeof fetch>(
			async () => new Response(null, { status: 200 }),
		);

		expect(
			await sendTelemetryEvent(
				{
					command: "init",
					framework: "better-auth",
					success: false,
					errorKind: "install_failed",
					cliVersion: "0.1.1",
				},
				{
					env: { CLAUDECODE: "1" },
					configPath,
					fetchImpl,
					platform: "linux",
					nodeVersion: "v24.0.0",
				},
			),
		).toBe(true);

		const [url, init] = fetchImpl.mock.calls[0];
		expect(url).toBe("https://us.i.posthog.com/capture/");
		expect(JSON.parse(String(init?.body))).toEqual({
			api_key: expect.stringMatching(/^phc_/),
			event: "cli_command_run",
			distinct_id: saved?.installId,
			properties: {
				command: "init",
				framework: "better-auth",
				success: false,
				error_kind: "install_failed",
				cli_version: "0.1.1",
				node_version: "v24.0.0",
				os: "linux",
				agent: "claude-code",
			},
		});

		const failingFetch = vi.fn<typeof fetch>(async () => {
			throw new Error("offline");
		});
		await expect(
			sendTelemetryEvent(
				{ command: "login", success: true, cliVersion: "0.1.1" },
				{ env: {}, configPath, fetchImpl: failingFetch },
			),
		).resolves.toBe(false);
	});
});
