// mcp/src/tools/palette.js
const axios = require("axios");

const BACKEND_URL =
  process.env.DREAMBURST_BACKEND_URL || "http://127.0.0.1:8080";
const ENDPOINT = "/palette";

async function extractPaletteAndLook({ image }) {
  if (!image) {
    throw new Error("palette.extract: 'image' is required");
  }

  try {
    const response = await axios.post(
      `${BACKEND_URL}${ENDPOINT}`,
      { image },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30_000,
      }
    );

    const { palette, look, contrastMatrix } = response.data || {};

    if (!palette) {
      throw new Error("Backend returned no palette data");
    }

    return { palette, look, contrastMatrix };
  } catch (err) {
    const details =
      err.response?.data?.detail ||
      err.message ||
      "Unknown error in palette extraction";

    throw new Error(`palette.extract failed: ${details}`);
  }
}

module.exports = extractPaletteAndLook;
