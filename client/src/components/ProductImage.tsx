import { useState } from "react";
import { BottleIcon } from "./Icons";

interface ProductImageProps {
  src: string | null;
  alt: string;
  className?: string;
}

export function ProductImage({ src, alt, className = "" }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-brand-100 text-brand-400 ${className}`}>
        <BottleIcon className="w-1/3 h-1/3" />
      </div>
    );
  }
  return <img src={src} alt={alt} className={`object-cover ${className}`} onError={() => setFailed(true)} />;
}
