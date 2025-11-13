// mcp/src/tools/image.js
const axios = require("axios");

const BACKEND_URL =
  process.env.DREAMBURST_BACKEND_URL || "http://127.0.0.1:8080";
const IMAGE_BATCH_ENDPOINT = "/image_batch";

async function generateConceptImages({ prompt, n = 6 }) {
  if (!prompt || !prompt.trim()) {
    throw new Error("Prompt is required to generate images");
  }

  try {
    const response = await axios.post(
      `${BACKEND_URL}${IMAGE_BATCH_ENDPOINT}`,
      { prompt, n },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 120_000,
      }
    );

    const data = response.data || {};

    // Backend should ideally return: { images: string[] }
    if (Array.isArray(data.images)) {
      return { images: data.images };
    }

    // Fallback if backend uses an object map instead: { images: { id: url } }
    if (data.images && typeof data.images === "object") {
      return { images: Object.values(data.images) };
    }

    throw new Error("Unexpected response shape from /image_batch");
  } catch (err) {
    const details =
      err.response?.data?.detail || err.message || "image_batch request failed";
    throw new Error(`image.generate failed: ${details}`);
  }
}

module.exports = generateConceptImages;
