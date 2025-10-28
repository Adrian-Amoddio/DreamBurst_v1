export default function ImageGallery({ images, onSelectHero }) {
  return (
    <div style={{ marginTop: 24 }}>
      <h2>Select a Hero Image</h2>
      <div style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))"
      }}>
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`concept-${i}`}
            onClick={() => onSelectHero(src)}
            style={{
              width: "100%",
              borderRadius: 6,
              cursor: "pointer",
              transition: "transform 0.2s",
            }}
          />
        ))}
      </div>
    </div>
  );
}
