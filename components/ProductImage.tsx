
import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, ImageOff } from 'lucide-react';

interface ProductImageProps {
  factoryId: string;
  alt: string;
  className?: string;
}

/**
 * Componente que intenta cargar una imagen de producto basada en el factoryId.
 * Prueba con extensiones .jpg y .jpeg antes de mostrar un fallback.
 */
const ProductImage: React.FC<ProductImageProps> = ({ factoryId, alt, className = "" }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!factoryId) {
      setError(true);
      setLoading(false);
      return;
    }

    const extensions = ['jpg', 'jpeg'];
    let currentIdx = 0;

    const tryNext = () => {
      if (currentIdx < extensions.length) {
        const ext = extensions[currentIdx];
        const testSrc = `/products/${factoryId}.${ext}`;
        
        const img = new Image();
        img.src = testSrc;
        img.onload = () => {
          setSrc(testSrc);
          setLoading(false);
          setError(false);
        };
        img.onerror = () => {
          currentIdx++;
          tryNext();
        };
      } else {
        setError(true);
        setLoading(false);
      }
    };

    setLoading(true);
    setError(false);
    tryNext();
  }, [factoryId]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-accent bg-opacity-10 animate-pulse rounded-md ${className}`}>
        <ImageIcon className="text-accent opacity-30" size={24} />
      </div>
    );
  }

  if (error || !src) {
    return (
      <div className={`flex items-center justify-center bg-accent bg-opacity-10 rounded-md ${className}`}>
        <ImageOff className="text-accent opacity-30" size={24} />
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className={`object-cover rounded-md ${className}`}
      referrerPolicy="no-referrer"
      onError={() => setError(true)}
    />
  );
};

export default ProductImage;
