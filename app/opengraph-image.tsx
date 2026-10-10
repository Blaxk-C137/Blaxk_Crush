import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CrushBoard — Professional partner acquisition";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#ffffff",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: "#18181b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            C
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, color: "#18181b" }}>
            CrushBoard
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#4f46e5",
            }}
          >
            Professional partner acquisition
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#18181b",
              lineHeight: 1.1,
              maxWidth: 900,
            }}
          >
            Hire your next great relationship.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 24,
            color: "#71717a",
          }}
        >
          <span>Post a position · Share your portal · Review candidates</span>
          <div
            style={{
              padding: "12px 28px",
              borderRadius: 10,
              backgroundColor: "#18181b",
              color: "white",
              fontSize: 26,
              fontWeight: 600,
            }}
          >
            Open a new position
          </div>
        </div>
      </div>
    ),
    size
  );
}
