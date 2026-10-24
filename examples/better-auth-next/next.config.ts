import type { NextConfig } from "next";

const config: NextConfig = {
	distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
	transpilePackages: ["@mockatoo/connect-better-auth"],
	agentRules: false,
};
export default config;
