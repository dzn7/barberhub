"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, startOfDay, setHours, setMinutes, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X, Check, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@radix-ui/themes";

interface WheelPickerModalProps {
  aberto: boolean;
  valor: string;
  onFechar: () => void;
  onConfirmar: (valor: string) => void;
  minDate?: Date;
  maxDate?: Date;
  intervaloMinutos?: number;
  titulo?: string;
}

interface ItemWheel {
  valor: string;
  label: string;
  raw: Date | number;
}

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;

export function WheelPickerModal({ 
  aberto,
  valor, 
  onFechar,
  onConfirmar,
  minDate,
  maxDate = addDays(new Date(), 60),
  intervaloMinutos = 20,
  titulo = "Selecione a data e hora"
}: WheelPickerModalProps) {
  const dataAtual = valor ? new Date(valor) : new Date();
  
  const [dataSelecionada, setDataSelecionada] = useState<Date>(startOfDay(dataAtual));
  const [horaSelecionada, setHoraSelecionada] = useState<number>(dataAtual.getHours());
  const [minutoSelecionado, setMinutoSelecionado] = useState<number>(
    Math.floor(dataAtual.getMinutes() / intervaloMinutos) * intervaloMinutos
  );

  const dataRef = useRef<HTMLDivElement>(null);
  const horaRef = useRef<HTMLDivElement>(null);
  const minutoRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<{[key: string]: NodeJS.Timeout}>({});
  const isScrollingProgrammaticallyRef = useRef<{[key: string]: boolean}>({});
  const lastUpdateTimeRef = useRef<{[key: string]: number}>({});

  // Bloquear scroll do body e do Dialog.Content quando picker está aberto
  useEffect(() => {
    if (aberto) {
      const originalBodyOverflow = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      
      // Encontrar e bloquear scroll de todos os Dialog.Content abertos
      // Tentar múltiplos seletores para garantir que encontramos o Dialog.Content
      const selectors = [
        '[data-radix-dialog-content]',
        '[role="dialog"]',
        '[style*="overflow"]'
      ];
      
      const dialogContents: HTMLElement[] = [];
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const htmlEl = el as HTMLElement;
          const style = window.getComputedStyle(htmlEl);
          // Verificar se tem overflow-y: auto ou scroll (modais scrolláveis)
          if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
            if (!dialogContents.includes(htmlEl)) {
              dialogContents.push(htmlEl);
            }
          }
        });
      });
      
      const originalStyles: { element: HTMLElement; overflow: string; overflowY: string }[] = [];
      
      dialogContents.forEach((htmlElement) => {
        const computedStyle = window.getComputedStyle(htmlElement);
        originalStyles.push({ 
          element: htmlElement, 
          overflow: htmlElement.style.overflow || computedStyle.overflow,
          overflowY: htmlElement.style.overflowY || computedStyle.overflowY
        });
        htmlElement.style.overflow = 'hidden';
        htmlElement.style.overflowY = 'hidden';
      });
      
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        
        // Restaurar overflow dos dialogs
        originalStyles.forEach(({ element, overflow, overflowY }) => {
          element.style.overflow = overflow;
          element.style.overflowY = overflowY;
        });
      };
    }
  }, [aberto]);

  // Gerar datas
  const gerarDatas = useCallback((): ItemWheel[] => {
    const datas: ItemWheel[] = [];
    const hoje = startOfDay(new Date());
    const inicio = minDate && isBefore(minDate, hoje) ? hoje : (minDate || hoje);
    
    for (let i = 0; i <= 30; i++) {
      const data = addDays(inicio, i);
      if (maxDate && isAfter(data, maxDate)) break;
      
      const ehHoje = isBefore(data, addDays(hoje, 1)) && !isBefore(data, hoje);
      const label = ehHoje 
        ? "Hoje" 
        : format(data, "EEE. d 'de' MMM", { locale: ptBR });
      
      datas.push({
        valor: format(data, "yyyy-MM-dd"),
        label,
        raw: data
      });
    }
    return datas;
  }, [minDate, maxDate]);

  // Gerar horas
  const gerarHoras = useCallback((): ItemWheel[] => {
    return Array.from({ length: 24 }, (_, i) => ({
      valor: String(i).padStart(2, '0'),
      label: String(i).padStart(2, '0'),
      raw: i
    }));
  }, []);

  // Gerar minutos
  const gerarMinutos = useCallback((): ItemWheel[] => {
    const minutos: ItemWheel[] = [];
    for (let i = 0; i < 60; i += intervaloMinutos) {
      minutos.push({
        valor: String(i).padStart(2, '0'),
        label: String(i).padStart(2, '0'),
        raw: i
      });
    }
    return minutos;
  }, [intervaloMinutos]);

  const datas = gerarDatas();
  const horas = gerarHoras();
  const minutos = gerarMinutos();

  const indiceData = datas.findIndex(d => d.valor === format(dataSelecionada, "yyyy-MM-dd"));
  const indiceHora = horas.findIndex(h => h.raw === horaSelecionada);
  const indiceMinuto = minutos.findIndex(m => m.raw === minutoSelecionado);

  // Inicializar quando abre
  useEffect(() => {
    if (aberto && valor) {
      const novaData = new Date(valor);
      setDataSelecionada(startOfDay(novaData));
      setHoraSelecionada(novaData.getHours());
      setMinutoSelecionado(Math.floor(novaData.getMinutes() / intervaloMinutos) * intervaloMinutos);
    }
  }, [aberto, valor, intervaloMinutos]);

  // Posicionar scroll inicial
  useEffect(() => {
    if (aberto) {
      // Marcar como scroll programático antes de fazer scroll inicial
      isScrollingProgrammaticallyRef.current['data'] = true;
      isScrollingProgrammaticallyRef.current['hora'] = true;
      isScrollingProgrammaticallyRef.current['minuto'] = true;
      
      setTimeout(() => {
        if (dataRef.current && indiceData >= 0) {
          dataRef.current.scrollTop = indiceData * ITEM_HEIGHT;
        }
        if (horaRef.current && indiceHora >= 0) {
          horaRef.current.scrollTop = indiceHora * ITEM_HEIGHT;
        }
        if (minutoRef.current && indiceMinuto >= 0) {
          minutoRef.current.scrollTop = indiceMinuto * ITEM_HEIGHT;
        }
        
        // Liberar flags após scroll inicial
        setTimeout(() => {
          isScrollingProgrammaticallyRef.current['data'] = false;
          isScrollingProgrammaticallyRef.current['hora'] = false;
          isScrollingProgrammaticallyRef.current['minuto'] = false;
        }, 200);
      }, 100);
    }
  }, [aberto, indiceData, indiceHora, indiceMinuto]);

  const handleScroll = useCallback((
    e: React.UIEvent<HTMLDivElement>,
    ref: React.RefObject<HTMLDivElement>,
    items: ItemWheel[],
    setSelected: (item: ItemWheel) => void,
    key: string
  ) => {
    e.stopPropagation();
    
    // Ignorar se estiver scrollando programaticamente
    if (isScrollingProgrammaticallyRef.current[key]) {
      return;
    }
    
    if (!ref.current) return;
    
    const now = Date.now();
    const lastUpdate = lastUpdateTimeRef.current[key] || 0;
    
    // Throttle: só atualizar a cada 50ms
    if (now - lastUpdate < 50) {
      return;
    }
    
    lastUpdateTimeRef.current[key] = now;
    
    if (scrollTimeoutRef.current[key]) {
      clearTimeout(scrollTimeoutRef.current[key]);
    }

    const scrollTop = ref.current.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
    
    // Atualizar seleção apenas visualmente durante scroll manual
    setSelected(items[clampedIndex]);

    // Snap apenas quando parar de scrollar
    scrollTimeoutRef.current[key] = setTimeout(() => {
      if (!ref.current || isScrollingProgrammaticallyRef.current[key]) return;
      
      const finalScrollTop = ref.current.scrollTop;
      const finalIndex = Math.round(finalScrollTop / ITEM_HEIGHT);
      const finalClampedIndex = Math.max(0, Math.min(finalIndex, items.length - 1));
      const targetScroll = finalClampedIndex * ITEM_HEIGHT;
      
      // Só fazer snap se não estiver no lugar certo (threshold maior)
      if (Math.abs(finalScrollTop - targetScroll) > 5) {
        isScrollingProgrammaticallyRef.current[key] = true;
        ref.current.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
        
        // Liberar flag após animação
        setTimeout(() => {
          isScrollingProgrammaticallyRef.current[key] = false;
        }, 400);
      }
    }, 200);
  }, []);

  const confirmar = () => {
    const novaDataHora = setMinutes(
      setHours(dataSelecionada, horaSelecionada),
      minutoSelecionado
    );
    
    // Criar string ISO que preserva o horário LOCAL (não UTC)
    // Formato: YYYY-MM-DDTHH:mm:ss (sem Z no final para indicar horário local)
    const ano = novaDataHora.getFullYear();
    const mes = String(novaDataHora.getMonth() + 1).padStart(2, '0');
    const dia = String(novaDataHora.getDate()).padStart(2, '0');
    const hora = String(novaDataHora.getHours()).padStart(2, '0');
    const minuto = String(novaDataHora.getMinutes()).padStart(2, '0');
    
    // String no formato ISO mas com horário local
    const isoLocal = `${ano}-${mes}-${dia}T${hora}:${minuto}:00`;
    
    console.log('[WheelPicker] Confirmando:', {
      dataSelecionada: format(dataSelecionada, 'yyyy-MM-dd'),
      hora: horaSelecionada,
      minuto: minutoSelecionado,
      resultado: isoLocal
    });
    
    onConfirmar(isoLocal);
    onFechar();
  };

  const renderWheel = useCallback((
    items: ItemWheel[],
    selectedIndex: number,
    onSelect: (item: ItemWheel) => void,
    ref: React.RefObject<HTMLDivElement>,
    scrollKey: string,
    isDateColumn: boolean = false
  ) => {
    return (
      <div className="relative flex-1 flex flex-col items-center h-full">
        {/* Setas superiores */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 text-zinc-500 dark:text-zinc-400" />
        </div>
        
        {/* Gradiente superior */}
        <div className="absolute top-0 left-0 right-0 h-[100px] bg-gradient-to-b from-white dark:from-zinc-900 via-white/98 dark:via-zinc-900/98 to-transparent z-10 pointer-events-none" />
        
        {/* Área scrollável */}
        <div
          ref={ref}
          className="flex-1 overflow-y-auto w-full wheel-scroll-area"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
            willChange: 'scroll-position',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
          }}
          onScroll={(e) => {
            e.stopPropagation();
            handleScroll(e, ref, items, onSelect, scrollKey);
          }}
                  >
          {/* Padding superior */}
          <div style={{ height: `${ITEM_HEIGHT * 2}px` }} />
          
          {/* Items */}
          {items.map((item, index) => {
            const isSelected = index === selectedIndex;
            const distance = Math.abs(index - selectedIndex);
            const opacity = distance === 0 ? 1 : Math.max(0.35, 1 - distance * 0.2);
            const scale = distance === 0 ? 1 : Math.max(0.9, 1 - distance * 0.05);
            
            return (
              <div
                key={item.valor}
                className={`flex items-center justify-center cursor-pointer select-none ${
                  isDateColumn ? 'justify-start px-3 sm:px-4' : 'justify-center'
                }`}
                style={{
                  height: `${ITEM_HEIGHT}px`,
                }}
                onClick={() => {
                  // Prevenir cliques durante scroll programático
                  if (isScrollingProgrammaticallyRef.current[scrollKey]) {
                    return;
                  }
                  
                  onSelect(item);
                  if (ref.current) {
                    isScrollingProgrammaticallyRef.current[scrollKey] = true;
                    
                    // Limpar timeout pendente
                    if (scrollTimeoutRef.current[scrollKey]) {
                      clearTimeout(scrollTimeoutRef.current[scrollKey]);
                    }
                    
                    ref.current.scrollTo({
                      top: index * ITEM_HEIGHT,
                      behavior: 'smooth'
                    });
                    
                    // Liberar após animação
                    setTimeout(() => {
                      isScrollingProgrammaticallyRef.current[scrollKey] = false;
                    }, 400);
                  }
                }}
              >
                <span
                  className={`transition-all ${
                    isSelected 
                      ? 'font-bold text-zinc-900 dark:text-white bg-zinc-200 dark:bg-zinc-700 px-3 sm:px-4 py-2 rounded-lg shadow-sm' 
                      : 'font-medium text-zinc-500 dark:text-zinc-400'
                  }`}
                  style={{
                    opacity: isSelected ? 1 : opacity,
                    fontSize: isSelected ? '17px' : '15px',
                    transform: `scale(${scale})`,
                    transition: 'opacity 0.1s, transform 0.1s',
                  }}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
          
          {/* Padding inferior */}
          <div style={{ height: `${ITEM_HEIGHT * 2}px` }} />
        </div>
        
        {/* Gradiente inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-[100px] bg-gradient-to-t from-white dark:from-zinc-900 via-white/98 dark:via-zinc-900/98 to-transparent z-10 pointer-events-none" />
        
        {/* Setas inferiores */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-zinc-500 dark:text-zinc-400" />
        </div>
        
        {/* Barra de seleção destacada */}
        <div 
          className="absolute top-1/2 left-0 right-0 -translate-y-1/2 border-t-2 border-b-2 border-zinc-300 dark:border-zinc-600 bg-zinc-100/60 dark:bg-zinc-800/40 pointer-events-none z-20 rounded-sm"
          style={{ height: `${ITEM_HEIGHT}px` }}
        />
        
        {/* CSS para ocultar scrollbar */}
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    );
  }, [handleScroll]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!aberto || !mounted) return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center z-[99999] p-4"
        onClick={onFechar}
      >
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md mx-auto flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          style={{ pointerEvents: 'auto' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
            <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">
              {titulo}
            </h3>
            <button
              onClick={onFechar}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          {/* Picker - altura fixa */}
          <div 
            className="flex items-stretch overflow-hidden bg-white dark:bg-zinc-900"
            style={{ 
              height: `${ITEM_HEIGHT * VISIBLE_ITEMS}px`, 
              minHeight: `${ITEM_HEIGHT * VISIBLE_ITEMS}px`,
              maxHeight: `${ITEM_HEIGHT * VISIBLE_ITEMS}px`
            }}
          >
            {/* Data - coluna mais larga */}
            <div className="flex-[2.5] sm:flex-[2] border-r border-zinc-200 dark:border-zinc-800">
              {renderWheel(
                datas,
                indiceData >= 0 ? indiceData : 0,
                (item) => setDataSelecionada(item.raw as Date),
                dataRef,
                'data',
                true
              )}
            </div>

            {/* Hora - coluna estreita */}
            <div className="flex-1 border-r border-zinc-200 dark:border-zinc-800">
              {renderWheel(
                horas,
                indiceHora >= 0 ? indiceHora : 0,
                (item) => setHoraSelecionada(item.raw as number),
                horaRef,
                'hora',
                false
              )}
            </div>

            {/* Minuto - coluna estreita */}
            <div className="flex-1">
              {renderWheel(
                minutos,
                indiceMinuto >= 0 ? indiceMinuto : 0,
                (item) => setMinutoSelecionado(item.raw as number),
                minutoRef,
                'minuto',
                false
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 sm:p-6 border-t border-zinc-200 dark:border-zinc-800 flex-shrink-0">
            <Button
              onClick={onFechar}
              variant="soft"
              color="gray"
              className="flex-1 cursor-pointer"
              size="3"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmar}
              className="flex-1 cursor-pointer bg-green-600 hover:bg-green-700 text-white"
              size="3"
            >
              <Check className="w-4 h-4 mr-2" />
              Confirmar
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
