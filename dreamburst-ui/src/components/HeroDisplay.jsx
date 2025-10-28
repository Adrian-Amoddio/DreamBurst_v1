export default function HeroDisplay({ hero, palette, look, loading, onRestart }) {
  return (
    <div style={{ marginTop: 24 }}>
      <h2>Hero Image & Palette</h2>

      <img src={hero} alt="hero" style={{ width: "100%", borderRadius: 8 }} />
      {loading && <p>Extracting palette...</p>}

      {palette?.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            {palette.map((c, i) => (
              <div
                key={i}
                title={`${c.role}: ${c.hex}`}
                style={{ background: c.hex, width: "20%", height: 60, borderRadius: 6 }}
              />
            ))}
          </div>

          <table style={{ width: "100%", marginTop: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th>Role</th>
                <th>HEX</th>
                <th>Copy</th>
              </tr>
            </thead>
            <tbody>
              {palette.map((c, i) => (
                <tr key={i}>
                  <td>{c.role}</td>
                  <td>{c.hex}</td>
                  <td>
                    <button onClick={() => navigator.clipboard.writeText(c.hex)}>📋</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Look Metrics */}
      {look && (
        <div style={{ marginTop: 20, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>Look Metrics</h3>
          <p>
            <b>White Balance:</b> {look.whiteBalance?.cct} K,&nbsp;
            tint {look.whiteBalance?.tintApprox >= 0 ? "+" : ""}
            {look.whiteBalance?.tintApprox} (mired shift {look.whiteBalance?.miredShiftFromD65})
          </p>
          <p>
            <b>Tonal Key:</b> {look.exposure?.tonalKey} •&nbsp;
            <b>DR:</b> {look.exposure?.dynamicRangeStops} stops •&nbsp;
            <b>Contrast:</b> {look.exposure?.globalContrast}
          </p>
          <p>
            <b>Key:Fill:</b> {look.exposure?.keyFillRatio} ({look.exposure?.keyFillStops} stops)
          </p>
          <p>
            <b>Cool/Warm:</b> Cool {look.coolWarmBalance?.coolPct}% / Warm {look.coolWarmBalance?.warmPct}%
          </p>
        </div>
      )}

      <button style={{ marginTop: 20 }} onClick={onRestart}>
        Start New Idea
      </button>
    </div>
  );
}
