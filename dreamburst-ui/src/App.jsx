import { useState, useEffect } from "react";
import PromptInput from "./components/PromptInput";
import BriefEditor from "./components/BriefEditor";
import ImageGallery from "./components/ImageGallery";
import HeroDisplay from "./components/HeroDisplay";
import { fetchBrief, fetchImages, fetchPalette } from "./utils/api";

const STEPS = {
  PROMPT: "prompt",
  BRIEF: "brief",
  GALLERY: "gallery",
  RESULT: "result",
};

export default function App() {
  const [step, setStep] = useState(STEPS.PROMPT);

  const [prompt, setPrompt] = useState("");
  const [brief, setBrief] = useState("");
  const [images, setImages] = useState([]);
  const [heroImage, setHeroImage] = useState(null);

  const [palette, setPalette] = useState([]);
  const [lookMetrics, setLookMetrics] = useState(null);
  const [contrastMatrix, setContrastMatrix] = useState(null);

  const [loading, setLoading] = useState({
    brief: false,
    images: false,
    palette: false,
  });

  const [error, setError] = useState("");

  const setLoadingFlag = (key, value) =>
    setLoading((prev) => ({ ...prev, [key]: value }));

  const handlePromptSubmit = async (promptText) => {
    setError("");
    if (!promptText?.trim()) return;

    try {
      setLoadingFlag("brief", true);
      const data = await fetchBrief(promptText);

      setPrompt(promptText);
      setBrief(data.brief || "");
      setStep(STEPS.BRIEF);
    } catch (err) {
      setError(err?.message || "Failed to generate brief.");
    } finally {
      setLoadingFlag("brief", false);
    }
  };

  const handleGenerateImages = async () => {
    if (!brief?.trim()) return;

    try {
      setLoadingFlag("images", true);
      const data = await fetchImages(brief, 6);

      setImages(data.images || []);
      setStep(STEPS.GALLERY);
    } catch (err) {
      setError(err?.message || "Failed to generate images.");
    } finally {
      setLoadingFlag("images", false);
    }
  };

  const handleHeroSelect = (src) => {
    if (!src) return;
    setHeroImage(src);
    setStep(STEPS.RESULT);
  };

  useEffect(() => {
    const runPaletteExtraction = async () => {
      if (!heroImage) return;

      setError("");
      try {
        setLoadingFlag("palette", true);
        const data = await fetchPalette(heroImage);

        setPalette(data.palette || []);
        setLookMetrics(data.look || null);
        setContrastMatrix(data.contrastMatrix || null);
      } catch (err) {
        setError(err?.message || "Failed to analyse hero image.");
      } finally {
        setLoadingFlag("palette", false);
      }
    };

    runPaletteExtraction();
  }, [heroImage]);

  const handleRestart = () => {
    setPrompt("");
    setBrief("");
    setImages([]);
    setHeroImage(null);
    setPalette([]);
    setLookMetrics(null);
    setContrastMatrix(null);
    setError("");
    setStep(STEPS.PROMPT);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            DreamBurst Studio
          </h1>
          <p className="mt-2 text-sm text-slate-300 max-w-xl">
            Take a rough idea and push it through: prompt → creative brief →
            concept batch → hero image → colour palette + look metrics.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {step === STEPS.PROMPT && (
          <PromptInput loading={loading.brief} onSubmit={handlePromptSubmit} />
        )}

        {step === STEPS.BRIEF && (
          <BriefEditor
            brief={brief}
            setBrief={setBrief}
            onGenerateImages={handleGenerateImages}
            loading={loading.images}
          />
        )}

        {step === STEPS.GALLERY && (
          <ImageGallery
            images={images}
            onSelectHero={handleHeroSelect}
            loading={loading.images}
          />
        )}

        {step === STEPS.RESULT && (
          <HeroDisplay
            hero={heroImage}
            palette={palette}
            look={lookMetrics}
            contrastMatrix={contrastMatrix}
            loading={loading.palette}
            onRestart={handleRestart}
          />
        )}
      </main>
    </div>
  );
}
