import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { APP_NAME } from "@/lib/config/app";

/**
 * The preview card when the app's link is shared (WhatsApp, Teams, Moodle, iMessage):
 * logo, name and what the app does, in Nova navy. Generated once at build time.
 */
export const alt = `${APP_NAME}: your campus life at Nova SBE in one app`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const logo = `data:image/png;base64,${(await readFile(join(process.cwd(), "app/icon.png"))).toString("base64")}`;

const FEATURES = ["Padel", "Friends & chat", "Timetable", "Rooms", "Food"];

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 56,
        padding: "0 80px",
        background: "#0b2a4a",
        color: "white",
      }}
    >
      <img src={logo} width={380} height={380} alt="" style={{ borderRadius: 48 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: -2 }}>{APP_NAME}</div>
        <div style={{ fontSize: 38, color: "#bcd3ea", lineHeight: 1.3, maxWidth: 600 }}>
          Your campus life at Nova SBE in one app.
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12, maxWidth: 620 }}>
          {FEATURES.map((feature) => (
            <div
              key={feature}
              style={{
                fontSize: 26,
                padding: "8px 20px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.12)",
              }}
            >
              {feature}
            </div>
          ))}
        </div>
      </div>
    </div>,
    size,
  );
}
