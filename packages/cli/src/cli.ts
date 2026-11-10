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

const ORIGIN = (
	process.env.MOCKATOO_URL ?? "https://app.mockatoo.globalunderdog.com"
).replace(/\/$/, "");
const LOGIN_URL = `${ORIGIN}/cli`;
const DEFAULT_ENV_FILE = ".env.local";

const CONNECTORS = {
	"better-auth": "@mockatoo/connect-better-auth",
	authjs: "@mockatoo/connect-authjs",
} as const;
type Framework = keyof typeof CONNECTORS;

class CliError extends Error {}

const USAGE = `Usage:
  mockatoo init [--framework better-auth|authjs] [-e <env-file>]
      Install the Mockatoo connector for this app, then log in.
  mockatoo login [code] [-e <env-file>]
      Write the test account's MOCK_EMAIL and MOCK_PASSWORD to the env file.

  -e, --env-file  env file to write (default ${DEFAULT_ENV_FILE})`;

// ---------------------------------------------------------------------------
// login

async function login(code: string | undefined, envFile: string): Promise<void> {
	if (code === undefined) {
		if (!process.stdin.isTTY) {
			// Under an agent: print the link and exit. The person pastes the
			// command the page shows, and the agent runs it.
			console.log(`Sign in here: ${LOGIN_URL}`);
			console.log(
				"Then paste the code shown on that page into the chat, and run: npx -y mockatoo@latest login <code>",
			);
			return;
		}
		openBrowser(LOGIN_URL);
		console.log(`Sign in here: ${LOGIN_URL}`);
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
		);
	writeCredentials(envFile, credentials);
}

function writeCredentials(envFile: string, credentials: Credentials): void {
	const path = resolve(envFile);
	if (!existsSync(dirname(path)))
		throw new CliError(
			`The directory ${dirname(envFile)} does not exist. Check the --env-file path.`,
		);
	const source = existsSync(path) ? readFileSync(path, "utf8") : "";
	writeFileSync(
		path,
		setEnvValues(source, {
			MOCK_EMAIL: credentials.email,
			MOCK_PASSWORD: credentials.password,
		}),
	);
	ignoreInGit(path);
	console.log(
		`Wrote MOCK_EMAIL (${credentials.email}) and MOCK_PASSWORD to ${relative(process.cwd(), path)}.`,
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

async function init(options: {
	framework?: string;
	envFile: string;
}): Promise<void> {
	const pkg = readPackageJson();
	const framework = parseFramework(options.framework) ?? detectFramework(pkg);
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
			throw new CliError(`${manager} could not install ${connector}.`);
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
		);
	return JSON.parse(readFileSync("package.json", "utf8"));
}

function parseFramework(value: string | undefined): Framework | undefined {
	if (value === undefined) return undefined;
	if (value === "better-auth" || value === "authjs") return value;
	throw new CliError(
		`Unknown framework "${value}". Use better-auth or authjs.`,
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
		);
	if (betterAuth) return "better-auth";
	if (authjs) return "authjs";
	throw new CliError(
		"Could not find Better Auth or Auth.js in package.json. Pass --framework better-auth or --framework authjs.",
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
	const [command, code] = positionals;
	const envFile = values["env-file"] ?? DEFAULT_ENV_FILE;

	if (values.help || command === undefined || command === "help") {
		console.log(USAGE);
		return;
	}
	if (command === "login") return login(code, envFile);
	if (command === "init") return init({ framework: values.framework, envFile });
	throw new CliError(`Unknown command "${command}".\n\n${USAGE}`);
}

main(process.argv.slice(2)).catch((error: unknown) => {
	console.error(error instanceof CliError ? error.message : error);
	process.exit(1);
});
