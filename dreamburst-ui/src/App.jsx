import { useState, useEffect } from "react";
import PromptInput from "./components/PromptInput";
import BriefEditor from "./components/BriefEditor";
import ImageGallery from "./components/ImageGallery";
import HeroDisplay from "./components/HeroDisplay";
import { fetchBrief, fetchImages, fetchPalette } from "./utils/api";

export default function App() {
  const [step, setStep] = useState("prompt");
  const [prompt, setPrompt] = useState("");
  const [brief, setBrief] = useState("");
  const [images, setImages] = useState([]);
  const [hero, setHero] = useState(null);
  const [palette, setPalette] = useState([]);
  const [look, setLook] = useState(null);               // 👈 NEW: look metrics
  const [contrastMatrix, setContrastMatrix] = useState(null); // 👈 optional
  const [loading, setLoading] = useState({ brief: false, images: false, palette: false });
  const [error, setError] = useState("");

  // --- Actions ---
  const handlePromptSubmit = async (promptText) => {
    try {
      setLoading((l) => ({ ...l, brief: true }));
      const data = await fetchBrief(promptText);
      setBrief(data.brief);
      setPrompt(promptText);
      setStep("brief");
    } catch (err) {
      setError("Brief failed: " + err.message);
    } finally {
      setLoading((l) => ({ ...l, brief: false }));
    }
  };

  const handleGenerateImages = async () => {
    try {
      setLoading((l) => ({ ...l, images: true }));
      const data = await fetchImages(brief, 6);
      setImages(data.images);
      setStep("gallery");
    } catch (err) {
      setError("Image generation failed: " + err.message);
    } finally {
      setLoading((l) => ({ ...l, images: false }));
    }
  };

  const handleHeroSelect = (src) => {
    setHero(src);
    setStep("result");
  };

  useEffect(() => {
    const runPalette = async () => {
      if (!hero) return;
      try {
        setLoading((l) => ({ ...l, palette: true }));
        const data = await fetchPalette(hero);

        // Existing palette
        setPalette(data.palette || []);

        // NEW: look + contrast matrix if backend returns them
        setLook(data.look || null);
        setContrastMatrix(data.contrastMatrix || null);
      } catch (err) {
        setError("Palette extraction failed: " + err.message);
      } finally {
        setLoading((l) => ({ ...l, palette: false }));
      }
    };
    runPalette();
  }, [hero]);

  const handleRestart = () => {
    setPrompt("");
    setBrief("");
    setImages([]);
    setHero(null);
    setPalette([]);
    setLook(null);
    setContrastMatrix(null);
    setError("");
    setStep("prompt");
  };

  // --- Render ---
  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>DreamBurst Studio</h1>
      <p>From idea → creative brief → concept images → hero image + palette</p>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {step === "prompt" && (
        <PromptInput loading={loading.brief} onSubmit={handlePromptSubmit} />
      )}

      {step === "brief" && (
        <BriefEditor
          brief={brief}
          setBrief={setBrief}
          onGenerateImages={handleGenerateImages}
          loading={loading.images}
        />
      )}

      {step === "gallery" && (
        <ImageGallery
          images={images}
          onSelectHero={handleHeroSelect}
          loading={loading.images}
        />
      )}

      {step === "result" && (
        <HeroDisplay
          hero={hero}
          palette={palette}
          look={look}                        // 👈 pass look to the display
          contrastMatrix={contrastMatrix}    // 👈 optional
          loading={loading.palette}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
