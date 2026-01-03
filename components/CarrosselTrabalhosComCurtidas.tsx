"use client";

import React, { useEffect, useRef, useState, createContext, useContext } from "react";
import { IconArrowNarrowLeft, IconArrowNarrowRight, IconX } from "@tabler/icons-react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { supabase } from "@/lib/supabase";

interface CarouselProps {
  items: React.ReactElement[];
  initialScroll?: number;
}

type Card = {
  id?: string;
  src: string;
  title: string;
  category: string;
  content: React.ReactNode;
  curtidas?: number;
};

export const CarouselContext = createContext<{
  onCardClose: (index: number) => void;
  currentIndex: number;
}>({
  onCardClose: () => {},
  currentIndex: 0,
});

export const Carousel = ({ items, initialScroll = 0 }: CarouselProps) => {
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = initialScroll;
      checkScrollability();
    }
  }, [initialScroll]);

  const checkScrollability = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    }
  };

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  const handleCardClose = (index: number) => {
    if (carouselRef.current) {
      const cardWidth = isMobile() ? 230 : 384;
      const gap = isMobile() ? 4 : 8;
      const scrollPosition = (cardWidth + gap) * (index + 1);
      carouselRef.current.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });
      setCurrentIndex(index);
    }
  };

  const isMobile = () => {
    return window && window.innerWidth < 768;
  };

  return (
    <CarouselContext.Provider value={{ onCardClose: handleCardClose, currentIndex }}>
      <div className="relative w-full">
        <div
          className="flex w-full overflow-x-scroll overscroll-x-auto scroll-smooth py-10 [scrollbar-width:none] md:py-20"
          ref={carouselRef}
          onScroll={checkScrollability}
        >
          <div className={cn("absolute right-0 z-[1000] h-auto w-[5%] overflow-hidden bg-gradient-to-l")}></div>

          <div className={cn("flex flex-row justify-start gap-4 pl-4", "mx-auto max-w-7xl")}>
            {items.map((item, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 * index, ease: "easeOut" }}
                key={"card" + index}
                className="rounded-3xl last:pr-[5%] md:last:pr-[33%]"
              >
                {item}
              </motion.div>
            ))}
          </div>
        </div>
        <div className="mr-10 flex justify-end gap-2">
          <button
            className="relative z-40 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 disabled:opacity-50"
            onClick={scrollLeft}
            disabled={!canScrollLeft}
          >
            <IconArrowNarrowLeft className="h-6 w-6 text-zinc-900 dark:text-white" />
          </button>
          <button
            className="relative z-40 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 disabled:opacity-50"
            onClick={scrollRight}
            disabled={!canScrollRight}
          >
            <IconArrowNarrowRight className="h-6 w-6 text-zinc-900 dark:text-white" />
          </button>
        </div>
      </div>
    </CarouselContext.Provider>
  );
};

export const Card = ({ card, index, layout = false }: { card: Card; index: number; layout?: boolean }) => {
  const [open, setOpen] = useState(false);
  const [curtidas, setCurtidas] = useState(card.curtidas || 0);
  const [curtido, setCurtido] = useState(false);
  const [processando, setProcessando] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { onCardClose, currentIndex } = useContext(CarouselContext);

  useEffect(() => {
    if (card.id) {
      verificarCurtida();
    }
  }, [card.id]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useOutsideClick(containerRef as React.RefObject<HTMLDivElement>, () => handleClose());

  const getClientIP = () => {
    // Em produção, isso seria obtido do servidor
    // Por enquanto, usamos um identificador único do navegador
    return localStorage.getItem('client_id') || createClientId();
  };

  const createClientId = () => {
    const id = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('client_id', id);
    return id;
  };

  const verificarCurtida = async () => {
    if (!card.id) return;
    
    const clientId = getClientIP();
    const { data } = await supabase
      .from('curtidas_trabalhos')
      .select('id')
      .eq('trabalho_id', card.id)
      .eq('ip_address', clientId)
      .single();

    if (data) {
      setCurtido(true);
    }
  };

  const handleCurtir = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!card.id || processando) return;

    setProcessando(true);
    const clientId = getClientIP();

    console.log('Tentando curtir:', { card_id: card.id, client_id: clientId, curtido });

    try {
      if (curtido) {
        // Descurtir
        console.log('Removendo curtida...');
        const { error: deleteError } = await supabase
          .from('curtidas_trabalhos')
          .delete()
          .eq('trabalho_id', card.id)
          .eq('ip_address', clientId);

        if (deleteError) {
          console.error('Erro ao deletar curtida:', deleteError);
          console.error('Detalhes do erro:', JSON.stringify(deleteError, null, 2));
          throw deleteError;
        }

        // Decrementar contador diretamente
        const { error: updateError } = await supabase
          .from('trabalhos')
          .update({ curtidas: Math.max(0, curtidas - 1) })
          .eq('id', card.id);

        if (updateError) {
          console.error('Erro ao atualizar contador:', updateError);
          throw updateError;
        }

        setCurtidas(prev => Math.max(0, prev - 1));
        setCurtido(false);
        console.log('Curtida removida com sucesso!');
      } else {
        // Curtir
        console.log('Adicionando curtida...');
        const { data: insertData, error: insertError } = await supabase
          .from('curtidas_trabalhos')
          .insert({
            trabalho_id: card.id,
            ip_address: clientId,
            user_agent: navigator.userAgent
          })
          .select();

        if (insertError) {
          console.error('Erro ao inserir curtida:', insertError);
          console.error('Detalhes do erro:', JSON.stringify(insertError, null, 2));
          console.error('Dados tentados:', { trabalho_id: card.id, ip_address: clientId });
          
          // Verificar se é erro de tabela não existente
          if (insertError.message?.includes('relation') || insertError.code === '42P01') {
            console.error('❌ TABELA curtidas_trabalhos NÃO EXISTE! Execute a migração SQL primeiro.');
          }
          
          throw insertError;
        }

        console.log('Curtida inserida:', insertData);

        // Incrementar contador diretamente
        const { error: updateError } = await supabase
          .from('trabalhos')
          .update({ curtidas: curtidas + 1 })
          .eq('id', card.id);

        if (updateError) {
          console.error('Erro ao atualizar contador:', updateError);
          throw updateError;
        }

        setCurtidas(prev => prev + 1);
        setCurtido(true);
        console.log('Curtida adicionada com sucesso!');
      }
    } catch (error: any) {
      console.error('❌ Erro ao curtir:', error);
      console.error('Tipo do erro:', typeof error);
      console.error('Erro completo:', error);
      
      // Reverter estado em caso de erro
      if (curtido) {
        setCurtidas(prev => prev + 1);
        setCurtido(true);
      } else {
        setCurtidas(prev => Math.max(0, prev - 1));
        setCurtido(false);
      }
    } finally {
      setProcessando(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    onCardClose(index);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 h-screen overflow-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 h-full w-full bg-black/80 backdrop-blur-lg"
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              ref={containerRef}
              layoutId={layout ? `card-${card.title}` : undefined}
              className="relative z-[60] mx-auto my-10 h-fit max-w-5xl rounded-3xl bg-white p-4 font-sans md:p-10 dark:bg-zinc-900"
            >
              <button
                className="sticky top-4 right-0 ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-black dark:bg-white"
                onClick={handleClose}
              >
                <IconX className="h-6 w-6 text-white dark:text-black" />
              </button>
              <motion.p
                layoutId={layout ? `category-${card.title}` : undefined}
                className="text-base font-medium text-black dark:text-white"
              >
                {card.category}
              </motion.p>
              <motion.p
                layoutId={layout ? `title-${card.title}` : undefined}
                className="mt-4 text-2xl font-semibold text-zinc-700 md:text-5xl dark:text-white"
              >
                {card.title}
              </motion.p>
              <div className="py-10">{card.content}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <motion.div
        layoutId={layout ? `card-${card.title}` : undefined}
        onClick={handleOpen}
        className="relative z-10 flex h-80 w-56 flex-col items-start justify-start overflow-hidden rounded-3xl bg-zinc-100 md:h-[40rem] md:w-96 dark:bg-zinc-900 cursor-pointer"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-full bg-gradient-to-b from-black/50 via-transparent to-transparent" />
        
        {/* Botão de Curtir */}
        <motion.button
          onClick={handleCurtir}
          disabled={processando}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="absolute top-4 right-4 z-40 flex items-center gap-2 px-3 py-2 bg-black/60 backdrop-blur-sm rounded-full hover:bg-black/80 transition-colors disabled:opacity-50 pointer-events-auto"
        >
          <Heart
            className={cn(
              "w-5 h-5 transition-all",
              curtido ? "fill-red-500 text-red-500" : "text-white"
            )}
          />
          <span className="text-white text-sm font-medium">{curtidas}</span>
        </motion.button>

        <div className="relative z-40 p-8">
          <motion.p
            layoutId={layout ? `category-${card.category}` : undefined}
            className="text-left font-sans text-sm font-medium text-white md:text-base"
          >
            {card.category}
          </motion.p>
          <motion.p
            layoutId={layout ? `title-${card.title}` : undefined}
            className="mt-2 max-w-xs text-left font-sans text-xl font-semibold [text-wrap:balance] text-white md:text-3xl"
          >
            {card.title}
          </motion.p>
        </div>
        <img
          src={card.src}
          alt={card.title}
          className="absolute inset-0 z-10 h-full w-full object-cover"
        />
      </motion.div>
    </>
  );
};
