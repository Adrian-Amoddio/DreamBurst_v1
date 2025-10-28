import os, httpx

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

async def generate_brief(prompt: str) -> str:
    """Generate a creative brief from a short idea prompt (OpenAI HTTP version)."""
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY missing in environment.")

    system = (
        "You are a creative brief writer. Expand the user's idea into a concise brief "
        "with: Title, One-liner, Visual style, Color/mood, References (if any). "
        "Keep it under 180 words."
    )
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    }

    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post("https://api.openai.com/v1/chat/completions",
                              headers=headers, json=payload)
    r.raise_for_status()
    data = r.json()
    return data["choices"][0]["message"]["content"]
