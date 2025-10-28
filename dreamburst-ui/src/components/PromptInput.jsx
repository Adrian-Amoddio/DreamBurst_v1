import { useState } from "react";


export default function PromptInput({ loading, onSubmit }) {
  const [localPrompt, setLocalPrompt] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!localPrompt.trim()) return;
    onSubmit(localPrompt);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
      <textarea
        rows={4}
        placeholder="Describe your idea..."
        value={localPrompt}
        onChange={(e) => setLocalPrompt(e.target.value)}
        style={{ padding: 10 }}
      />
      <button type="submit" disabled={loading}>
        {loading ? "Generating brief..." : "Generate Brief"}
      </button>
    </form>
  );
}
