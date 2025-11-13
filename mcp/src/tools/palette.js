// mcp/src/tools/palette.js
const axios = require("axios");

const BACKEND_URL = process.env.DREAMBURST_BACKEND_URL || "http://127.0.0.1:8080";

/**
 * Send a single image (data URL/base64) to the backend to extract palette + look metrics.
 * Returns: { palette: string[], look: object, contrastMatrix: object }
 */
module.exports = async function handlePaletteExtract({ image }) {
  if (!image) throw new Error("palette.extract: missing 'image'");

  try {
    const r = await axios.post(
      `${BACKEND_URL}/palette`,
      { image },
      { headers: { "Content-Type": "application/json" }, timeout: 30_000 }
    );

    const { palette, look, contrastMatrix } = r.data || {};
    if (!palette) throw new Error("Backend did not return 'palette'");
    return { palette, look, contrastMatrix };
  } catch (err) {
    const msg = err.response?.data?.detail || err.message || "palette failed";
    throw new Error(`palette.extract: ${msg}`);
  }
};
