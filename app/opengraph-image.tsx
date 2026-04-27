import { ImageResponse } from "next/og";

export const alt = "NOEMA - Croatian Fashion Rental Closet Zagreb";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1A1A1A",
        }}
      >
        {/* Top accent line */}
        <div style={{ width: 48, height: 1, backgroundColor: "#F5F0EB", marginBottom: 48, display: "flex" }} />

        {/* NOEMA wordmark */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 300,
            letterSpacing: "0.35em",
            color: "#F5F0EB",
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          NOEMA
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: 20,
            fontSize: 16,
            fontWeight: 400,
            letterSpacing: "0.25em",
            color: "#A09890",
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          Croatian Fashion Rental Closet
        </div>

        {/* Bottom accent line */}
        <div style={{ width: 48, height: 1, backgroundColor: "#6B6560", marginTop: 48, marginBottom: 32, display: "flex" }} />

        {/* Address */}
        <div
          style={{
            fontSize: 14,
            fontWeight: 400,
            letterSpacing: "0.15em",
            color: "#6B6560",
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          Nova Ves 50, Zagreb
        </div>
      </div>
    ),
    { ...size }
  );
}
