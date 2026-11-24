#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import {
	appendFileSync,
	existsSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { setEnvValues } from "./env-file";
import {
	type Credentials,
	decodeLoginCode,
	LOGIN_CODE_PREFIX,
} from "./login-code";
import {
	resolveTelemetryStatus,
	sendTelemetryEvent,
	writeTelemetryConfig,
} from "./telemetry";

const ORIGIN = (
	process.env.MOCKATOO_URL ?? "https://app.mockatoo.globalunderdog.com"
).replace(/\/$/, "");
const LOGIN_URL = `${ORIGIN}/cli`;
const LOGIN_URL_TELEMETRY_SET = `${LOGIN_URL}?telemetry=set`;
const DEFAULT_ENV_FILE = ".env.local";

function readCliVersion(): string {
	try {
		const raw = readFileSync(
			new URL("../package.json", import.meta.url),
			"utf8",
		);
		const parsed = JSON.parse(raw);
		if (typeof parsed?.version === "string") return parsed.version;
	} catch {}
	return "unknown";
}

const CLI_VERSION = readCliVersion();

const CONNECTORS = {
	"better-auth": "@mockatoo/connect-better-auth",
	authjs: "@mockatoo/connect-authjs",
} as const;
type Framework = keyof typeof CONNECTORS;

type ErrorKind =
	| "invalid_code"
	| "missing_env_dir"
	| "missing_package_json"
	| "unknown_framework"
	| "ambiguous_framework"
	| "framework_not_detected"
	| "install_failed"
	| "unknown_command"
	| "invalid_args";

class CliError extends Error {
	constructor(
		message: string,
		readonly errorKind: ErrorKind,
	) {
		super(message);
	}
}

const USAGE = `Usage:
  mockatoo init [--framework better-auth|authjs] [-e <env-file>]
      Install the Mockatoo connector for this app, then log in.
  mockatoo login [code] [-e <env-file>]
      Write the test account's MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD to the env file.
  mockatoo telemetry <status|enable|disable>
      Show or update anonymous CLI usage telemetry preference.

Options:
  -e, --env-file  env file to write (default ${DEFAULT_ENV_FILE})

Environment variables:
  MOCKATOO_TELEMETRY=1           enable anonymous CLI telemetry
  MOCKATOO_TELEMETRY_DISABLED=1  disable anonymous CLI telemetry
  DO_NOT_TRACK=1                 disable anonymous CLI telemetry`;

// ---------------------------------------------------------------------------
// login

function loginUrlForMachine(): string {
	return resolveTelemetryStatus().configured
		? LOGIN_URL_TELEMETRY_SET
		: LOGIN_URL;
}

async function login(code: string | undefined, envFile: string): Promise<void> {
	if (code === undefined) {
		const url = loginUrlForMachine();
		if (!process.stdin.isTTY) {
			// Under an agent: print the link and exit. The person pastes the
			// command the page shows, and the agent runs it.
			console.log(`Sign in here: ${url}`);
			console.log(
				"Then paste the code shown on that page into the chat, and run: npx -y @mockatoo/mockatoo@latest login <code>",
			);
			return;
		}
		openBrowser(url);
		console.log(`Sign in here: ${url}`);
		const readline = createInterface({
			input: process.stdin,
			output: process.stdout,
		});
		code = await readline.question("Paste the code: ");
		readline.close();
	}

	const credentials = decodeLoginCode(code);
	if (!credentials)
		throw new CliError(
			`That is not a Mockatoo login code. It starts with ${LOGIN_CODE_PREFIX} and comes from ${LOGIN_URL}.`,
			"invalid_code",
		);
	if (typeof credentials.telemetry === "boolean") {
		writeTelemetryConfig(credentials.telemetry);
	}
	writeCredentials(envFile, credentials);
}

function writeCredentials(envFile: string, credentials: Credentials): void {
	const path = resolve(envFile);
	if (!existsSync(dirname(path)))
		throw new CliError(
			`The directory ${dirname(envFile)} does not exist. Check the --env-file path.`,
			"missing_env_dir",
		);
	const source = existsSync(path) ? readFileSync(path, "utf8") : "";
	writeFileSync(
		path,
		setEnvValues(source, {
			MOCKATOO_TEST_EMAIL: credentials.email,
			MOCKATOO_TEST_PASSWORD: credentials.password,
		}),
	);
	ignoreInGit(path);
	console.log(
		`Wrote MOCKATOO_TEST_EMAIL (${credentials.email}) and MOCKATOO_TEST_PASSWORD to ${relative(process.cwd(), path)}.`,
	);
}

/** Adds the env file to the repository's .gitignore unless git already ignores it. */
function ignoreInGit(path: string): void {
	const top = spawnSync("git", ["rev-parse", "--show-toplevel"], {
		cwd: dirname(path),
		encoding: "utf8",
	});
	if (top.status !== 0) return; // not in a git repository
	const root = top.stdout.trim();
	const check = spawnSync("git", ["check-ignore", "-q", "--", path], {
		cwd: root,
	});
	if (check.status === 0) return; // already ignored
	const entry = `/${relative(root, path).split("\\").join("/")}`;
	const gitignore = resolve(root, ".gitignore");
	const existing = existsSync(gitignore) ? readFileSync(gitignore, "utf8") : "";
	appendFileSync(
		gitignore,
		`${existing === "" || existing.endsWith("\n") ? "" : "\n"}${entry}\n`,
	);
}

function openBrowser(url: string): void {
	const [command, args] =
		process.platform === "darwin"
			? ["open", [url]]
			: process.platform === "win32"
				? ["cmd", ["/c", "start", "", url]]
				: ["xdg-open", [url]];
	try {
		const child = spawn(command, args, { stdio: "ignore", detached: true });
		child.on("error", () => {}); // no opener installed: the link is printed anyway
		child.unref();
	} catch {}
}

// ---------------------------------------------------------------------------
// init

async function init(
	options: {
		framework?: string;
		envFile: string;
	},
	onFramework?: (framework: Framework) => void,
): Promise<void> {
	const pkg = readPackageJson();
	const framework = parseFramework(options.framework) ?? detectFramework(pkg);
	onFramework?.(framework);
	const connector = CONNECTORS[framework];
	const manager = detectPackageManager();

	const installed =
		pkg.dependencies?.[connector] || pkg.devDependencies?.[connector];
	if (installed) {
		console.log(`${connector} is already installed.`);
	} else {
		console.log(`Installing ${connector} with ${manager}…`);
		const result = spawnSync(manager, installArgs(manager, connector), {
			stdio: "inherit",
			shell: process.platform === "win32",
		});
		if (result.status !== 0)
			throw new CliError(
				`${manager} could not install ${connector}.`,
				"install_failed",
			);
	}

	console.log("");
	await login(undefined, options.envFile);
}

function readPackageJson(): {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
} {
	if (!existsSync("package.json"))
		throw new CliError(
			"No package.json here. Run mockatoo init in the app's directory.",
			"missing_package_json",
		);
	return JSON.parse(readFileSync("package.json", "utf8"));
}

function parseFramework(value: string | undefined): Framework | undefined {
	if (value === undefined) return undefined;
	if (value === "better-auth" || value === "authjs") return value;
	throw new CliError(
		`Unknown framework "${value}". Use better-auth or authjs.`,
		"unknown_framework",
	);
}

/** Better Auth or Auth.js, from the app's dependencies. Anything else needs --framework. */
function detectFramework(pkg: {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
}): Framework {
	const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
	const betterAuth = names.includes("better-auth");
	const authjs = names.some(
		(name) => name === "next-auth" || name.startsWith("@auth/"),
	);
	if (betterAuth && authjs)
		throw new CliError(
			"This app uses both Better Auth and Auth.js. Pass --framework better-auth or --framework authjs.",
			"ambiguous_framework",
		);
	if (betterAuth) return "better-auth";
	if (authjs) return "authjs";
	throw new CliError(
		"Could not find Better Auth or Auth.js in package.json. Pass --framework better-auth or --framework authjs.",
		"framework_not_detected",
	);
}

/** Chosen from the lockfile; npm when there isn't one. */
function detectPackageManager(): "pnpm" | "yarn" | "bun" | "npm" {
	if (existsSync("pnpm-lock.yaml")) return "pnpm";
	if (existsSync("yarn.lock")) return "yarn";
	if (existsSync("bun.lock") || existsSync("bun.lockb")) return "bun";
	return "npm";
}

function installArgs(manager: string, name: string): string[] {
	return manager === "npm" ? ["install", name] : ["add", name];
}

// ---------------------------------------------------------------------------
// telemetry

function telemetry(action: string | undefined): void {
	if (action === "status") {
		const { enabled, reason } = resolveTelemetryStatus();
		console.log(
			`Telemetry is ${enabled ? "enabled" : "disabled"} (${reason}).`,
		);
		return;
	}
	if (action === "enable" || action === "disable") {
		const enabled = action === "enable";
		writeTelemetryConfig(enabled);
		const status = resolveTelemetryStatus();
		console.log(
			enabled && !status.enabled
				? `Saved telemetry preference as enabled, but it is currently disabled (${status.reason}).`
				: `Telemetry ${enabled ? "enabled" : "disabled"}.`,
		);
		return;
	}
	throw new CliError(
		`Unknown telemetry action "${action ?? ""}". Run: mockatoo telemetry status|enable|disable`,
		"unknown_command",
	);
}

// ---------------------------------------------------------------------------
// entry point

async function main(argv: string[]): Promise<void> {
	const { positionals, values } = parseArgs({
		args: argv,
		allowPositionals: true,
		options: {
			"env-file": { type: "string", short: "e", default: DEFAULT_ENV_FILE },
			framework: { type: "string" },
			help: { type: "boolean", short: "h" },
		},
	});
	const [command, arg] = positionals;
	const envFile = values["env-file"] ?? DEFAULT_ENV_FILE;

	if (values.help || command === undefined || command === "help") {
		console.log(USAGE);
		return;
	}
	if (command === "telemetry") {
		telemetry(arg);
		return;
	}
	if (command === "login" || command === "init") {
		let framework: Framework | undefined;
		try {
			if (command === "login") {
				await login(arg, envFile);
			} else {
				await init({ framework: values.framework, envFile }, (detected) => {
					framework = detected;
				});
			}
			await sendTelemetryEvent({
				command,
				framework,
				success: true,
				cliVersion: CLI_VERSION,
			});
		} catch (error) {
			await sendTelemetryEvent({
				command,
				framework,
				success: false,
				errorKind: error instanceof CliError ? error.errorKind : "unexpected",
				cliVersion: CLI_VERSION,
			});
			throw error;
		}
		return;
	}
	throw new CliError(
		`Unknown command "${command}".\n\n${USAGE}`,
		"unknown_command",
	);
}

main(process.argv.slice(2)).catch((error: unknown) => {
	console.error(error instanceof CliError ? error.message : error);
	process.exit(1);
});
