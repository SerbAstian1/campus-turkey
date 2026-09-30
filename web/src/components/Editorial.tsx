"use client";

import type { CSSProperties, ReactNode } from "react";
import type { Credited } from "./PhotoCredit";
import { PhotoCredit } from "./PhotoCredit";

export function EditorialImage({
  src,
  alt,
  slot,
  ratio = "16 / 10",
  position = "center",
  priority = false,
  credit,
  className,
}: {
  src: string;
  alt: string;
  slot: string;
  ratio?: string;
  position?: CSSProperties["objectPosition"];
  priority?: boolean;
  credit?: Credited;
  className?: string;
}) {
  return (
    <figure className={["ct-editorial-image", className].filter(Boolean).join(" ")} style={{ margin: 0 }}>
      <div className="ct-editorial-image__frame" style={{ aspectRatio: ratio }}>
        <img
          data-slot={slot}
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "low"}
          style={{ objectPosition: position }}
        />
      </div>
      <PhotoCredit photo={credit} />
    </figure>
  );
}

export function EditorialSplit({
  media,
  children,
  reverse = false,
  tone = "plain",
  className,
}: {
  media: ReactNode;
  children: ReactNode;
  reverse?: boolean;
  tone?: "plain" | "tinted" | "dark";
  className?: string;
}) {
  return (
    <div
      className={["ct-editorial-split", className].filter(Boolean).join(" ")}
      data-reverse={reverse ? "true" : undefined}
      data-tone={tone}
    >
      <div className="ct-editorial-split__media">{media}</div>
      <div className="ct-editorial-split__content">{children}</div>
    </div>
  );
}

export function EditorialIndex({ children }: { children: ReactNode }) {
  return <span className="ct-editorial-index" aria-hidden="true">{children}</span>;
}
