// mcp/src/tools/brief.js
const axios = require("axios");

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";

async function generateBrief({ prompt }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  if (!prompt || !prompt.trim()) {
    throw new Error("Prompt is required to generate a brief");
  }

  try {
    const response = await axios.post(
      OPENAI_URL,
      {
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You turn loose creative ideas into concise, practical creative briefs that are easy for designers and directors to use.",
          },
          {
            role: "user",
            content: [
              "Write a six-bullet creative brief for this concept:",
              "",
              prompt,
              "",
              "The bullets must cover: Goal, Audience, Tone, Visual Style, Colour/Lighting, and any Constraints.",
            ].join("\n"),
          },
        ],
        max_tokens: 300,
        temperature: 0.6,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30_000,
      }
    );

    const brief =
      response.data?.choices?.[0]?.message?.content?.trim() || "";

    return { brief };
  } catch (err) {
    const details =
      err.response?.data?.error?.message ||
      err.response?.data?.message ||
      err.message ||
      "Unknown error from OpenAI";

    throw new Error(`brief.generate failed: ${details}`);
  }
}

module.exports = generateBrief;
