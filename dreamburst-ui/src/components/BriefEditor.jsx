export default function BriefEditor({ brief, setBrief, onGenerateImages, loading }) {
  return (
    <div style={{ marginTop: 24 }}>
      <h2>Creative Brief</h2>
      <textarea
        rows={10}
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        style={{ width: "100%", padding: 10 }}
      />
      <button onClick={onGenerateImages} disabled={loading}>
        {loading ? "Generating images..." : "Generate 6 Images"}
      </button>
    </div>
  );
}
