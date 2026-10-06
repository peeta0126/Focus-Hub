"use client";

import Image from "next/image";
import { useState } from "react";

interface AssetImageProps {
  src: string;
  alt: string;
  className?: string;
  emoji?: string;
  sizes?: string;
  priority?: boolean;
}

export function AssetImage({ src, alt, className = "", emoji = "✦", sizes = "100vw", priority = false }: AssetImageProps) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className={`asset-placeholder ${className}`} role="img" aria-label={`${alt} 이미지 자리`}><span>{emoji}</span></div>;
  return <Image src={src} alt={alt} fill sizes={sizes} className={className} priority={priority} onError={() => setFailed(true)} />;
}
