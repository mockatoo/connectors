import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const POSTHOG_TOKEN = "phc_rJu86cANRFQ5Hnzi5ziFipYbQAeKLWeNdGQyQAiaZZ85";
const POSTHOG_CAPTURE_URL = "https://us.i.posthog.com/capture/";
const TIMEOUT_MS = 1500;

const AGENTS: [string[], string][] = [
	[["CLAUDECODE", "CLAUDE_CODE"], "claude-code"],
	[["CURSOR_AGENT"], "cursor"],
	[["CODEX_CI", "CODEX_SANDBOX", "CODEX_THREAD_ID"], "codex"],
	[["WINDSURF_AGENT", "CODEIUM_AGENT"], "windsurf"],
	[["AIDER"], "aider"],
	[["OPENCODE"], "opencode"],
	[["ANTIGRAVITY_AGENT"], "antigravity"],
];

export type TelemetryConfig = { enabled: boolean; installId: string };
export type TelemetryStatus = {
	enabled: boolean;
	configured: boolean;
	reason: string;
	installId?: string;
};

export function telemetryConfigPath(
	env: NodeJS.ProcessEnv = process.env,
	platform: NodeJS.Platform = process.platform,
	homeDir: string = homedir(),
): string {
	const base =
		platform === "win32"
			? env.APPDATA || join(homeDir, "AppData", "Roaming")
			: env.XDG_CONFIG_HOME || join(homeDir, ".config");
	return join(base, "mockatoo", "telemetry.json");
}

export function readTelemetryConfig(
	configPath: string = telemetryConfigPath(),
): TelemetryConfig | undefined {
	try {
		if (!existsSync(configPath)) return undefined;
		const parsed = JSON.parse(readFileSync(configPath, "utf8"));
		if (
			typeof parsed?.enabled === "boolean" &&
			typeof parsed?.installId === "string" &&
			parsed.installId
		)
			return { enabled: parsed.enabled, installId: parsed.installId };
	} catch {}
	return undefined;
}

export function writeTelemetryConfig(
	enabled: boolean,
	configPath: string = telemetryConfigPath(),
): TelemetryConfig | undefined {
	const next: TelemetryConfig = {
		enabled,
		installId: readTelemetryConfig(configPath)?.installId ?? randomUUID(),
	};
	try {
		mkdirSync(dirname(configPath), { recursive: true });
		writeFileSync(configPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
		return next;
	} catch {
		return undefined;
	}
}

export function resolveTelemetryStatus(options?: {
	env?: NodeJS.ProcessEnv;
	configPath?: string;
}): TelemetryStatus {
	const env = options?.env ?? process.env;
	const config = readTelemetryConfig(
		options?.configPath ?? telemetryConfigPath(env),
	);
	const ci = env.CI?.trim().toLowerCase();

	if (env.DO_NOT_TRACK === "1")
		return {
			enabled: false,
			configured: true,
			reason: "DO_NOT_TRACK=1",
			installId: config?.installId,
		};
	if (env.MOCKATOO_TELEMETRY_DISABLED === "1")
		return {
			enabled: false,
			configured: true,
			reason: "MOCKATOO_TELEMETRY_DISABLED=1",
			installId: config?.installId,
		};
	if (ci && ci !== "0" && ci !== "false")
		return {
			enabled: false,
			configured: true,
			reason: "CI",
			installId: config?.installId,
		};
	if (env.MOCKATOO_TELEMETRY === "1")
		return {
			enabled: true,
			configured: true,
			reason: "MOCKATOO_TELEMETRY=1",
			installId: config?.installId,
		};
	if (config)
		return {
			enabled: config.enabled,
			configured: true,
			reason: "user config",
			installId: config.installId,
		};
	return { enabled: false, configured: false, reason: "not configured" };
}

export function detectAgent(
	env: NodeJS.ProcessEnv = process.env,
): string | undefined {
	return AGENTS.find(([keys]) => keys.some((k) => Boolean(env[k])))?.[1];
}

export async function sendTelemetryEvent(
	event: {
		command: "init" | "login";
		framework?: string;
		success: boolean;
		errorKind?: string;
		cliVersion: string;
	},
	options?: {
		env?: NodeJS.ProcessEnv;
		configPath?: string;
		endpoint?: string;
		fetchImpl?: typeof fetch;
		platform?: NodeJS.Platform;
		nodeVersion?: string;
	},
): Promise<boolean> {
	const env = options?.env ?? process.env;
	if (!options?.endpoint && env.MOCKATOO_URL) return false;

	const status = resolveTelemetryStatus({
		env,
		configPath: options?.configPath,
	});
	if (!status.enabled) return false;

	const agent = detectAgent(env);
	const properties: Record<string, string | boolean> = {
		command: event.command,
		success: event.success,
		cli_version: event.cliVersion,
		node_version: options?.nodeVersion ?? process.version,
		os: options?.platform ?? process.platform,
		...(event.framework ? { framework: event.framework } : {}),
		...(event.errorKind ? { error_kind: event.errorKind } : {}),
		...(agent ? { agent } : {}),
	};

	try {
		await (options?.fetchImpl ?? fetch)(
			options?.endpoint ?? POSTHOG_CAPTURE_URL,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					api_key: POSTHOG_TOKEN,
					event: "cli_command_run",
					distinct_id: status.installId ?? randomUUID(),
					properties,
				}),
				signal: AbortSignal.timeout(TIMEOUT_MS),
			},
		);
		return true;
	} catch {
		return false;
	}
}
