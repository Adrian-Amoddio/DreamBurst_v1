import fs from "fs";
import path from "path";


export type ToolName = "brief.generate" | "image.generate" | "palette.extract";
type ProviderType = "brief" | "image" | "palette";

export interface ProviderConfig {
  type: ProviderType;
  url: string;
}

interface ToolConfigEntry { provider: string; }
interface McpConfig {
  tools: Record<ToolName, ToolConfigEntry>;
  providers: Record<string, ProviderConfig>;
}

const CONFIG_PATH = path.resolve(__dirname, "..", "..", "mcp.config.json");
let cachedConfig: McpConfig | null = null;

export function loadConfig(): McpConfig {
  if (cachedConfig) return cachedConfig;
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  const parsed = JSON.parse(raw) as McpConfig;

  (["brief.generate","image.generate","palette.extract"] as ToolName[]).forEach((t) => {
    const tool = parsed.tools[t];
    if (!tool) throw new Error(`Missing tool config for ${t}`);
    const prov = parsed.providers[tool.provider];
    if (!prov) throw new Error(`Provider '${tool.provider}' not found for tool ${t}`);
  });

  cachedConfig = parsed;
  return parsed;
}

export function getProviderForTool(tool: ToolName): ProviderConfig {
  const cfg = loadConfig();
  const providerKey = cfg.tools[tool].provider;
  const provider = cfg.providers[providerKey];
  if (!provider) throw new Error(`Provider '${providerKey}' not found for ${tool}`);
  return provider;
}
