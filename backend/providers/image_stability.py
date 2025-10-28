import asyncio, os, httpx, base64

STABILITY_API_KEY = os.getenv("STABILITY_API_KEY")

async def generate_images(prompt: str, n: int = 6) -> list[str]:
    if not STABILITY_API_KEY:
        raise RuntimeError("STABILITY_API_KEY missing in environment.")

    headers = {"Authorization": f"Bearer {STABILITY_API_KEY}",
               "Accept": "image/*"}

    async def one_image(seed: int):
        files = {
            "prompt": (None, prompt),
            "output_format": (None, "png"),
            "seed": (None, str(seed)),
        }
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(
                "https://api.stability.ai/v2beta/stable-image/generate/sd3",
                headers=headers, files=files
            )
        r.raise_for_status()
        b64 = base64.b64encode(r.content).decode("utf-8")
        return f"data:image/png;base64,{b64}"

    seeds = [1000 + i for i in range(n)]
    results = await asyncio.gather(*[one_image(s) for s in seeds])
    return results
