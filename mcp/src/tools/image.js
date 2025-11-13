// mcp/src/tools/image.js
const axios = require("axios");

// Allow overriding the backend URL via env; default to your working 8080 port
const BACKEND_URL = process.env.DREAMBURST_BACKEND_URL || "http://127.0.0.1:8080";

/**
 * Ask the FastAPI backend to create N concept images from a prompt.
 * Returns: { images: string[] }  // data URLs (base64) expected
 */
module.exports = async function handleImageGenerate({ prompt, n = 6 }) {
  try {
    const r = await axios.post(
      `${BACKEND_URL}/image_batch`,
      { prompt, n },
      { headers: { "Content-Type": "application/json" }, timeout: 120_000 }
    );

    // Normalize to { images: string[] }
    const data = r.data || {};
    if (Array.isArray(data.images)) return { images: data.images };

    // If backend returns objects (e.g., {id,url}), map to urls
    if (data.images && typeof data.images === "object") {
      const arr = Object.values(data.images);
      return { images: arr };
    }

    throw new Error("Backend returned unexpected shape for /image_batch");
  } catch (err) {
    const msg = err.response?.data?.detail || err.message || "image_batch failed";
    throw new Error(`image.generate: ${msg}`);
  }
};
