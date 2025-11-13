// mcp/src/tools/brief.js
const axios = require("axios");

/**
 * Generate a concise creative brief using OpenAI.
 * Returns: { brief: string }
 */
module.exports = async function handleBriefGenerate({ prompt }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY");

  try {
    const r = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You turn loose ideas into concise, practical creative briefs." },
          {
            role: "user",
            content:
              `Create a six-bullet creative brief for this concept:\n\n${prompt}\n\n` +
              "Bullets should cover: Goal, Audience, Tone, Visual Style, Color/Lighting, Constraints."
          }
        ],
        max_tokens: 300,
        temperature: 0.6,
      },
      {
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        timeout: 30_000,
      }
    );

    const brief = r.data?.choices?.[0]?.message?.content?.trim() || "(no content)";
    return { brief };
  } catch (err) {
    const msg =
      err.response?.data?.error?.message ||
      err.response?.data?.message ||
      err.message ||
      "OpenAI request failed";
    throw new Error(`brief.generate: ${msg}`);
  }
};
