import type { jsPDF } from "jspdf";

type Doc = jsPDF;
type Rgb = [number, number, number];

export type ReportIcon =
  | "pot"
  | "instalment"
  | "cash"
  | "alert"
  | "in"
  | "out"
  | "percent"
  | "star"
  | "users"
  | "calendar"
  | "check"
  | "doc"
  | "wallet"
  | "trophy"
  | "info"
  | "list"
  | "chart"
  | "spark"
  | "bank"
  | "receipt";

/** Soft pastel bubble + crisp stroke icon (Helvetica-safe — no unicode glyphs). */
export function drawReportIcon(
  doc: Doc,
  x: number,
  y: number,
  size: number,
  kind: ReportIcon,
  fg: Rgb,
  bg: Rgb,
) {
  const r = size / 2;
  const cx = x + r;
  const cy = y + r;
  doc.setFillColor(...bg);
  doc.circle(cx, cy, r, "F");

  doc.setDrawColor(...fg);
  doc.setFillColor(...fg);
  doc.setLineWidth(Math.max(0.35, size * 0.075));
  doc.setLineCap("round");
  doc.setLineJoin("round");

  const s = size * 0.28; // half-extent of glyph

  switch (kind) {
    case "pot": {
      // coin / pot circle with ₹-like bars
      doc.circle(cx, cy, s * 0.95, "S");
      doc.line(cx - s * 0.45, cy - s * 0.15, cx + s * 0.45, cy - s * 0.15);
      doc.line(cx - s * 0.35, cy + s * 0.2, cx + s * 0.35, cy + s * 0.2);
      doc.line(cx, cy - s * 0.55, cx, cy + s * 0.55);
      break;
    }
    case "instalment": {
      // transfer arrows
      doc.line(cx - s, cy - s * 0.35, cx + s * 0.2, cy - s * 0.35);
      doc.line(cx + s * 0.2, cy - s * 0.35, cx - s * 0.1, cy - s * 0.65);
      doc.line(cx + s * 0.2, cy - s * 0.35, cx - s * 0.1, cy - s * 0.05);
      doc.line(cx + s, cy + s * 0.35, cx - s * 0.2, cy + s * 0.35);
      doc.line(cx - s * 0.2, cy + s * 0.35, cx + s * 0.1, cy + s * 0.05);
      doc.line(cx - s * 0.2, cy + s * 0.35, cx + s * 0.1, cy + s * 0.65);
      break;
    }
    case "cash": {
      // wallet
      doc.roundedRect(cx - s, cy - s * 0.7, s * 2, s * 1.4, 0.6, 0.6, "S");
      doc.line(cx + s * 0.15, cy - s * 0.15, cx + s, cy - s * 0.15);
      doc.line(cx + s * 0.15, cy - s * 0.15, cx + s * 0.15, cy + s * 0.45);
      doc.circle(cx + s * 0.45, cy + s * 0.15, s * 0.18, "S");
      break;
    }
    case "wallet": {
      doc.roundedRect(cx - s, cy - s * 0.65, s * 2, s * 1.3, 0.55, 0.55, "S");
      doc.setFillColor(...fg);
      doc.circle(cx + s * 0.45, cy, s * 0.22, "F");
      break;
    }
    case "alert": {
      // triangle warning
      doc.lines(
        [
          [s, s * 1.5],
          [-s * 2, 0],
          [s, -s * 1.5],
        ],
        cx,
        cy - s * 0.75,
        [1, 1],
        "S",
        true,
      );
      doc.circle(cx, cy + s * 0.45, size * 0.035, "F");
      doc.line(cx, cy - s * 0.35, cx, cy + s * 0.15);
      break;
    }
    case "in": {
      doc.line(cx, cy - s, cx, cy + s * 0.35);
      doc.line(cx, cy + s * 0.35, cx - s * 0.45, cy - s * 0.05);
      doc.line(cx, cy + s * 0.35, cx + s * 0.45, cy - s * 0.05);
      doc.line(cx - s * 0.7, cy + s * 0.85, cx + s * 0.7, cy + s * 0.85);
      break;
    }
    case "out": {
      doc.line(cx, cy + s, cx, cy - s * 0.35);
      doc.line(cx, cy - s * 0.35, cx - s * 0.45, cy + s * 0.05);
      doc.line(cx, cy - s * 0.35, cx + s * 0.45, cy + s * 0.05);
      doc.line(cx - s * 0.7, cy - s * 0.85, cx + s * 0.7, cy - s * 0.85);
      break;
    }
    case "percent": {
      doc.line(cx - s * 0.7, cy + s * 0.7, cx + s * 0.7, cy - s * 0.7);
      doc.circle(cx - s * 0.4, cy - s * 0.4, s * 0.28, "S");
      doc.circle(cx + s * 0.4, cy + s * 0.4, s * 0.28, "S");
      break;
    }
    case "star": {
      const pts: [number, number][] = [];
      for (let i = 0; i < 5; i++) {
        const a = (-Math.PI / 2) + (i * 2 * Math.PI) / 5;
        pts.push([cx + Math.cos(a) * s, cy + Math.sin(a) * s]);
      }
      // simple diamond star
      doc.line(pts[0]![0], pts[0]![1], pts[2]![0], pts[2]![1]);
      doc.line(pts[2]![0], pts[2]![1], pts[4]![0], pts[4]![1]);
      doc.line(pts[4]![0], pts[4]![1], pts[1]![0], pts[1]![1]);
      doc.line(pts[1]![0], pts[1]![1], pts[3]![0], pts[3]![1]);
      doc.line(pts[3]![0], pts[3]![1], pts[0]![0], pts[0]![1]);
      break;
    }
    case "users": {
      doc.circle(cx - s * 0.35, cy - s * 0.25, s * 0.28, "S");
      doc.circle(cx + s * 0.4, cy - s * 0.15, s * 0.22, "S");
      doc.ellipse(cx - s * 0.35, cy + s * 0.55, s * 0.55, s * 0.35, "S");
      doc.ellipse(cx + s * 0.4, cy + s * 0.5, s * 0.4, s * 0.28, "S");
      break;
    }
    case "calendar": {
      doc.roundedRect(cx - s, cy - s * 0.55, s * 2, s * 1.55, 0.5, 0.5, "S");
      doc.line(cx - s, cy - s * 0.1, cx + s, cy - s * 0.1);
      doc.line(cx - s * 0.45, cy - s * 0.85, cx - s * 0.45, cy - s * 0.35);
      doc.line(cx + s * 0.45, cy - s * 0.85, cx + s * 0.45, cy - s * 0.35);
      doc.circle(cx - s * 0.35, cy + s * 0.35, size * 0.03, "F");
      doc.circle(cx, cy + s * 0.35, size * 0.03, "F");
      doc.circle(cx + s * 0.35, cy + s * 0.35, size * 0.03, "F");
      break;
    }
    case "check": {
      doc.circle(cx, cy, s, "S");
      doc.line(cx - s * 0.45, cy, cx - s * 0.1, cy + s * 0.4);
      doc.line(cx - s * 0.1, cy + s * 0.4, cx + s * 0.5, cy - s * 0.4);
      break;
    }
    case "doc": {
      doc.roundedRect(cx - s * 0.7, cy - s, s * 1.4, s * 2, 0.4, 0.4, "S");
      doc.line(cx - s * 0.35, cy - s * 0.4, cx + s * 0.35, cy - s * 0.4);
      doc.line(cx - s * 0.35, cy, cx + s * 0.35, cy);
      doc.line(cx - s * 0.35, cy + s * 0.4, cx + s * 0.15, cy + s * 0.4);
      break;
    }
    case "trophy": {
      doc.line(cx - s * 0.55, cy - s * 0.7, cx + s * 0.55, cy - s * 0.7);
      doc.line(cx - s * 0.55, cy - s * 0.7, cx - s * 0.35, cy + s * 0.15);
      doc.line(cx + s * 0.55, cy - s * 0.7, cx + s * 0.35, cy + s * 0.15);
      doc.line(cx - s * 0.35, cy + s * 0.15, cx + s * 0.35, cy + s * 0.15);
      doc.line(cx, cy + s * 0.15, cx, cy + s * 0.55);
      doc.line(cx - s * 0.4, cy + s * 0.75, cx + s * 0.4, cy + s * 0.75);
      doc.line(cx - s * 0.4, cy + s * 0.55, cx + s * 0.4, cy + s * 0.55);
      break;
    }
    case "info": {
      doc.circle(cx, cy, s, "S");
      doc.circle(cx, cy - s * 0.4, size * 0.035, "F");
      doc.line(cx, cy - s * 0.1, cx, cy + s * 0.45);
      break;
    }
    case "list": {
      doc.line(cx - s * 0.2, cy - s * 0.55, cx + s * 0.75, cy - s * 0.55);
      doc.line(cx - s * 0.2, cy, cx + s * 0.75, cy);
      doc.line(cx - s * 0.2, cy + s * 0.55, cx + s * 0.75, cy + s * 0.55);
      doc.circle(cx - s * 0.65, cy - s * 0.55, size * 0.04, "F");
      doc.circle(cx - s * 0.65, cy, size * 0.04, "F");
      doc.circle(cx - s * 0.65, cy + s * 0.55, size * 0.04, "F");
      break;
    }
    case "chart": {
      doc.line(cx - s, cy + s * 0.7, cx + s, cy + s * 0.7);
      doc.line(cx - s, cy + s * 0.7, cx - s, cy - s * 0.7);
      doc.line(cx - s * 0.55, cy + s * 0.7, cx - s * 0.55, cy + s * 0.1);
      doc.line(cx, cy + s * 0.7, cx, cy - s * 0.2);
      doc.line(cx + s * 0.55, cy + s * 0.7, cx + s * 0.55, cy - s * 0.55);
      break;
    }
    case "spark": {
      doc.line(cx, cy - s, cx, cy + s);
      doc.line(cx - s, cy, cx + s, cy);
      doc.line(cx - s * 0.65, cy - s * 0.65, cx + s * 0.65, cy + s * 0.65);
      doc.line(cx + s * 0.65, cy - s * 0.65, cx - s * 0.65, cy + s * 0.65);
      break;
    }
    case "bank": {
      doc.line(cx - s, cy - s * 0.2, cx + s, cy - s * 0.2);
      doc.line(cx - s, cy - s * 0.2, cx, cy - s * 0.85);
      doc.line(cx + s, cy - s * 0.2, cx, cy - s * 0.85);
      doc.line(cx - s * 0.65, cy - s * 0.2, cx - s * 0.65, cy + s * 0.55);
      doc.line(cx, cy - s * 0.2, cx, cy + s * 0.55);
      doc.line(cx + s * 0.65, cy - s * 0.2, cx + s * 0.65, cy + s * 0.55);
      doc.line(cx - s * 0.9, cy + s * 0.55, cx + s * 0.9, cy + s * 0.55);
      break;
    }
    case "receipt": {
      doc.roundedRect(cx - s * 0.65, cy - s, s * 1.3, s * 2, 0.35, 0.35, "S");
      doc.line(cx - s * 0.3, cy - s * 0.45, cx + s * 0.3, cy - s * 0.45);
      doc.line(cx - s * 0.3, cy, cx + s * 0.3, cy);
      doc.line(cx - s * 0.3, cy + s * 0.45, cx + s * 0.1, cy + s * 0.45);
      break;
    }
    default:
      doc.circle(cx, cy, s * 0.35, "S");
  }
}
