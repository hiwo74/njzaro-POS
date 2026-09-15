import { BottleIcon } from "./Icons";

interface ProductImageProps {
  src: string | null;
  alt: string;
  className?: string;
}

export function ProductImage({ src, alt, className = "" }: ProductImageProps) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-brand-100 text-brand-400 ${className}`}>
        <BottleIcon className="w-1/3 h-1/3" />
      </div>
    );
  }
  return <img src={src} alt={alt} className={`object-cover ${className}`} />;
}
