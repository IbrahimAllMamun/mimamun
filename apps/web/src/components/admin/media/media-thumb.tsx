import Image from "next/image";
import { FileText, Film } from "lucide-react";
import type { MediaDTO } from "@portfolio/shared";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/** Square preview: the image itself, or an icon and extension for documents and video. */
export function MediaThumb({
  media,
  className,
  sizes = "160px",
}: {
  media: MediaDTO;
  className?: string;
  sizes?: string;
}) {
  if (media.kind === "image" && media.width && media.height) {
    return (
      <span
        className={cn(
          "relative block aspect-square overflow-hidden rounded-xs bg-muted",
          className,
        )}
      >
        <Image src={media.url} alt="" fill sizes={sizes} className="object-cover" />
      </span>
    );
  }
  const extension = media.fileName.split(".").pop()?.toUpperCase() ?? "";
  return (
    <span
      className={cn(
        "grid aspect-square place-items-center rounded-xs bg-muted text-ink-3",
        className,
      )}
    >
      <span className="flex flex-col items-center gap-1">
        <Icon icon={media.kind === "video" ? Film : FileText} size={22} />
        <span className="font-mono text-xs">{extension}</span>
      </span>
    </span>
  );
}
