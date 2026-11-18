import { ImageResponse } from "next/og";

export const alt = "LeadAtlas — Better leads. Less guesswork.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "76px 92px",
        color: "#f6f9ff",
        background: "#07172d",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <span style={{ fontSize: 32, fontWeight: 700, color: "#f6f9ff" }}>
          LeadAtlas
        </span>
        <span style={{ fontSize: 25, color: "#b9c8df" }}>
          Better leads. Less guesswork.
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 64,
          fontSize: 72,
          fontWeight: 700,
          letterSpacing: -3,
          lineHeight: 1.08,
        }}
      >
        <span>Find businesses</span>
        <span>worth contacting.</span>
      </div>
      <div style={{ marginTop: 28, color: "#b9c8df", fontSize: 27 }}>
        Business research with evidence-led contacts.
      </div>
    </div>,
    size,
  );
}
