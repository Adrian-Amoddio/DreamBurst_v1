import os, base64
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from backend.providers.brief_openai import generate_brief
from backend.providers.image_stability import generate_images
from backend.providers.smart_palette import extract_palette

app = FastAPI(title="DreamBurst API")

# ... keep the rest of your code unchanged ...


# Allow local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Classes for correct data validation
class InitialPromptIn(BaseModel):
    prompt: str

class BriefOut(BaseModel):
    brief: str

class ImageBatchIn(BaseModel):
    prompt: str
    n: int = 6

class ImageOut(BaseModel):
    images: list[str]

class PaletteIn(BaseModel):
    image: str  # base64 dataURL

# ROUTES --------------------------------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"ok": True}

@app.post("/initial_prompt", response_model=BriefOut)
async def initial_prompt(req: InitialPromptIn):
    try:
        brief = await generate_brief(req.prompt)
        return BriefOut(brief=brief)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@app.post("/image_batch", response_model=ImageOut)
async def image_batch(req: ImageBatchIn):
    try:
        imgs = await generate_images(req.prompt, n=req.n)
        return ImageOut(images=imgs)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@app.post("/palette")
async def palette(req: PaletteIn):
    try:
        palette = await extract_palette(req.image)
        return palette
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
