import { sites } from "@openai/sites-vite-plugin";
import vinext from "vinext";
import { defineConfig } from "vite";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

// This derivative intentionally has no Sites project binding. The local
// hosting file carries no project_id until this project receives its own site.
const d1: string | null = null;
const r2: string | null = null;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async ({ command }) => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");
  const bindingConfig = {
    ...localBindingConfig,
    // Local workerd cannot see the parent shell directly. Bind secrets only
    // while serving; production builds receive them from the hosting runtime.
    ...(command === "serve"
      ? {
          vars: {
            SOFTWARE_AGENT_API_KEY: process.env.SOFTWARE_AGENT_API_KEY ?? "",
            SOFTWARE_AGENT_BASE_URL: process.env.SOFTWARE_AGENT_BASE_URL ?? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
            SOFTWARE_AGENT_MODEL: process.env.SOFTWARE_AGENT_MODEL ?? process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
            DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ?? "",
            DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
            DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
          },
        }
      : {}),
  };

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: bindingConfig,
      }),
    ],
  };
});
