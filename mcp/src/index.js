// DreamBurst MCP - JavaScript (CJS) using low-level Server API + schema shims
require("dotenv").config();
const path = require("path");

// --- Locate SDK CJS server files ---
const sdkCjsRoot = path.join(
  __dirname,
  "..",
  "node_modules",
  "@modelcontextprotocol",
  "sdk",
  "dist",
  "cjs"
);

// Load server + stdio directly from cjs
const { Server } = require(path.join(sdkCjsRoot, "server", "index.js"));

let StdioServerTransport;
try {
  ({ StdioServerTransport } = require(path.join(sdkCjsRoot, "server", "stdio.js")));
} catch {
  ({ StdioServerTransport } = require(path.join(sdkCjsRoot, "server", "stdio", "index.js")));
}

// ---- Schema shims (your SDK wants objects with shape.method.value) ----
const ListToolsRequestSchema = { shape: { method: { value: "tools/list" } } };
const CallToolRequestSchema  = { shape: { method: { value: "tools/call" } } };

// ---- Your tool handlers (CommonJS exports) ----
const handleBriefGenerate = require("./tools/brief");
const handleImageGenerate = require("./tools/image");
const handlePaletteExtract = require("./tools/palette");

// ---- Create server ----
const server = new Server(
  { name: "dreamburst-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ---- Tools we advertise via tools/list ----
const tools = [
  {
    name: "brief.generate",
    description: "Generate a creative brief from a user prompt",
    inputSchema: {
      type: "object",
      properties: { prompt: { type: "string" } },
      required: ["prompt"],
    },
    outputSchema: {
      type: "object",
      properties: { brief: { type: "string" } },
    },
  },
  {
    name: "image.generate",
    description: "Generate concept images for a given prompt",
    inputSchema: {
      type: "object",
      properties: { prompt: { type: "string" }, n: { type: "number" } },
      required: ["prompt"],
    },
    outputSchema: {
      type: "object",
      properties: { images: { type: "array", items: { type: "string" } } },
    },
  },
  {
    name: "palette.extract",
    description: "Extract a color palette and look metrics from a hero image",
    inputSchema: {
      type: "object",
      properties: { image: { type: "string" } },
      required: ["image"],
    },
    outputSchema: {
      type: "object",
      properties: {
        palette: { type: "array", items: { type: "string" } },
        look: {},
        contrastMatrix: {},
      },
    },
  },
];

// ---- Advertise tools (schema-based) ----
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// ---- Handle tool calls (schema-based) ----
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params || {};

  switch (name) {
    case "brief.generate": {
      const { prompt } = args;
      if (!prompt) throw new Error("Missing 'prompt'");
      const out = await handleBriefGenerate({ prompt });
      return { content: [{ type: "json", json: out }] };
    }
    case "image.generate": {
      const { prompt, n } = args;
      if (!prompt) throw new Error("Missing 'prompt'");
      const out = await handleImageGenerate({ prompt, n });
      return { content: [{ type: "json", json: out }] };
    }
    case "palette.extract": {
      const { image } = args;
      if (!image) throw new Error("Missing 'image'");
      const out = await handlePaletteExtract({ image });
      return { content: [{ type: "json", json: out }] };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// ---- Start over stdio ----
(async () => {
  await server.connect(new StdioServerTransport());
  console.log("✅ DreamBurst MCP server running…");
})();
