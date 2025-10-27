import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx


# load .env so API keys can be accessed
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
STABILITY_API_KEY = os.getenv("STABILITY_API_KEY")
if not OPENAI_API_KEY or not STABILITY_API_KEY:
    raise RuntimeError("Error: Open AI or Stability AI API Key missing in .env file")

app = FastAPI(title="DreamBurst API")

# Allow your Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


#Classes for correct data validation
#----------------------------------------------------------------------#
class InitialPromptIn(BaseModel):
    prompt: str

class BriefOut(BaseModel):
    brief: str

class ImageIn(BaseModel):
    prompt: str

class ImageOut(BaseModel):
    images: list[str]  # data URLs: "data:image/png;base64,...."


#----------------------------------------------------------------------#

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/initial_prompt", response_model=BriefOut)
async def initial_prompt(initial: InitialPromptIn):
    system = (
        "You are a creative brief writer. Expand the user's idea into a concise brief "
        "with: Title, One-liner, Visual style, Color/mood, References (if any). "
        "Keep it under 180 words."
    )
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": initial.prompt},
        ],
    }
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post("https://api.openai.com/v1/chat/completions",
                              headers=headers, json=payload)
    if r.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"OpenAI error: {r.text}")
    data = r.json()
    brief_text = data["choices"][0]["message"]["content"]
    return BriefOut(brief=brief_text)

@app.post("/image", response_model=ImageOut)
async def image(img_req: ImageIn):
    # Generate a single PNG with Stability (you can add n-images later)
    headers = {
        "Authorization": f"Bearer {STABILITY_API_KEY}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    payload = {
        "prompt": img_req.prompt,
        "output_format": "png",
        # You can add style params here later (e.g., aspect_ratio, seed, etc.)
    }
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(
            "https://api.stability.ai/v2beta/stable-image/generate/sd3",
            headers=headers,
            json=payload,
        )
    if r.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Stability error: {r.text}")
    j = r.json()

    # The API returns a base64 PNG under "image" for single output
    if "image" in j:
        data_urls = [f"data:image/png;base64,{j['image']}"]
    elif "images" in j:
        # Fallback if API returns an array
        data_urls = [f"data:image/png;base64,{img}" for img in j["images"]]
    else:
        raise HTTPException(status_code=502, detail="Unexpected Stability response.")

    return ImageOut(images=data_urls)
