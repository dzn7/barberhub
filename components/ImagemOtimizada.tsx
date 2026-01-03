"use client";

import { useState, useEffect, useRef, memo } from "react";
import { Loader2 } from "lucide-react";

interface ImagemOtimizadaProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: "square" | "video" | "portrait" | "auto";
  priority?: boolean;
  placeholder?: "blur" | "skeleton";
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Componente de imagem otimizada com:
 * - Lazy loading nativo
 * - Cache inteligente via Service Worker
 * - Placeholder blur/skeleton
 * - Intersection Observer para carregamento sob demanda
 * - Fallback em caso de erro
 */
function ImagemOtimizadaBase({
  src,
  alt,
  className = "",
  aspectRatio = "auto",
  priority = false,
  placeholder = "skeleton",
  onLoad,
  onError,
}: ImagemOtimizadaProps) {
  const [carregada, setCarregada] = useState(false);
  const [erro, setErro] = useState(false);
  const [visivel, setVisivel] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer para lazy loading
  useEffect(() => {
    if (priority || !containerRef.current) {
      setVisivel(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisivel(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "200px",
        threshold: 0.01,
      }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [priority]);

  // Verificar cache do Service Worker
  useEffect(() => {
    if (!visivel || !src) return;

    // Tentar pré-carregar do cache
    if ("caches" in window) {
      caches.match(src).then((response) => {
        if (response) {
          setCarregada(true);
        }
      });
    }
  }, [visivel, src]);

  const handleLoad = () => {
    setCarregada(true);
    setErro(false);
    onLoad?.();
  };

  const handleError = () => {
    setErro(true);
    setCarregada(true);
    onError?.();
  };

  // Classes de aspect ratio
  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    portrait: "aspect-[3/4]",
    auto: "",
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-zinc-100 dark:bg-zinc-800 ${aspectClasses[aspectRatio]} ${className}`}
    >
      {/* Placeholder/Skeleton */}
      {!carregada && placeholder === "skeleton" && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-700">
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
          </div>
        </div>
      )}

      {/* Placeholder Blur */}
      {!carregada && placeholder === "blur" && (
        <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-700 backdrop-blur-xl" />
      )}

      {/* Imagem */}
      {visivel && !erro && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            carregada ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {/* Fallback de erro */}
      {erro && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
          <svg
            className="w-12 h-12 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm">Imagem indisponível</span>
        </div>
      )}
    </div>
  );
}

export const ImagemOtimizada = memo(ImagemOtimizadaBase);

/**
 * Hook para pré-carregar imagens
 */
export function usePrefetchImagens(urls: string[]) {
  useEffect(() => {
    urls.forEach((url) => {
      if (!url) return;
      
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "image";
      link.href = url;
      document.head.appendChild(link);
      
      return () => {
        document.head.removeChild(link);
      };
    });
  }, [urls]);
}

/**
 * Adiciona imagem ao cache do Service Worker
 */
export async function adicionarAoCache(url: string): Promise<boolean> {
  if (!("caches" in window)) return false;
  
  try {
    const cache = await caches.open("imagens-portfolio-v1");
    await cache.add(url);
    return true;
  } catch (error) {
    console.error("Erro ao adicionar ao cache:", error);
    return false;
  }
}

/**
 * Remove imagem do cache
 */
export async function removerDoCache(url: string): Promise<boolean> {
  if (!("caches" in window)) return false;
  
  try {
    const cache = await caches.open("imagens-portfolio-v1");
    return await cache.delete(url);
  } catch (error) {
    console.error("Erro ao remover do cache:", error);
    return false;
  }
}
