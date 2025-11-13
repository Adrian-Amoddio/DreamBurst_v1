// DreamBurst MCP server (CommonJS)
require("dotenv").config();
const path = require("path");

// Resolve the CJS server entry from @modelcontextprotocol/sdk
const sdkCjsRoot = path.join(
  __dirname,
  "..",
  "node_modules",
  "@modelcontextprotocol",
  "sdk",
  "dist",
  "cjs"
);

const { Server } = require(path.join(sdkCjsRoot, "server", "index.js"));

let StdioServerTransport;
try {
  ({ StdioServerTransport } = require(path.join(
    sdkCjsRoot,
    "server",
    "stdio.js"
  )));
} catch {
  ({ StdioServerTransport } = require(path.join(
    sdkCjsRoot,
    "server",
    "stdio",
    "index.js"
  )));
}

// Minimal schemas  the SDK expects objects with a shape.method.value
const ListToolsRequestSchema = { shape: { method: { value: "tools/list" } } };
const CallToolRequestSchema = { shape: { method: { value: "tools/call" } } };

// Tool implementations
const generateBrief = require("./tools/brief");
const generateConceptImages = require("./tools/image");
const extractPaletteAndLook = require("./tools/palette");

// MCP server instance
const server = new Server(
  { name: "dreamburst-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);



// Tool definitions returned via tools/list
const tools = [
  {
    name: "brief.generate",
    description: "Generate a creative brief based on a user prompt.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
      },
      required: ["prompt"],
    },
    outputSchema: {
      type: "object",
      properties: {
        brief: { type: "string" },
      },
    },
  },
  {
    name: "image.generate",
    description: "Generate a batch of concept images for a prompt.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        n: { type: "number" },
      },
      required: ["prompt"],
    },
    outputSchema: {
      type: "object",
      properties: {
        images: { type: "array", items: { type: "string" } },
      },
    },
  },
  {
    name: "palette.extract",
    description:
      "Extract a colour palette and look metrics from a selected hero image.",
    inputSchema: {
      type: "object",
      properties: {
        image: { type: "string" },
      },
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

// tools/list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// tools/call handler
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params || {};

  switch (name) {
    case "brief.generate": {
      const { prompt } = args;
      if (!prompt) throw new Error("brief.generate: 'prompt' is required");

      const result = await generateBrief({ prompt });
      return { content: [{ type: "json", json: result }] };
    }

    case "image.generate": {
      const { prompt, n } = args;
      if (!prompt) throw new Error("image.generate: 'prompt' is required");

      const result = await generateConceptImages({ prompt, n });
      return { content: [{ type: "json", json: result }] };
    }

    case "palette.extract": {
      const { image } = args;
      if (!image) throw new Error("palette.extract: 'image' is required");

      const result = await extractPaletteAndLook({ image });
      return { content: [{ type: "json", json: result }] };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start the MCP server over stdio
(async () => {
  await server.connect(new StdioServerTransport());
  console.log("DreamBurst MCP server running over stdio");
})();
