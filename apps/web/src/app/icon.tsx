import { renderMonogram } from "@/lib/og/card";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return renderMonogram(size.width);
}
