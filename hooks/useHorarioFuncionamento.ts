import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface HorarioDia {
  aberto: boolean;
  inicio: string;
  fim: string;
}

interface HorarioSemana {
  segunda: HorarioDia;
  terca: HorarioDia;
  quarta: HorarioDia;
  quinta: HorarioDia;
  sexta: HorarioDia;
  sabado: HorarioDia;
  domingo: HorarioDia;
}

/**
 * Hook para buscar horário de funcionamento da barbearia
 * Pode ser usado em qualquer componente do site
 */
export function useHorarioFuncionamento() {
  const [horarios, setHorarios] = useState<HorarioSemana | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    buscarHorarios();
  }, []);

  const buscarHorarios = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'horario_funcionamento')
        .single();

      if (error) throw error;

      if (data?.valor) {
        setHorarios(data.valor as HorarioSemana);
      }
    } catch (error) {
      console.error('Erro ao buscar horários:', error);
      // Retornar horários padrão em caso de erro
      setHorarios({
        segunda: { aberto: true, inicio: "09:00", fim: "18:00" },
        terca: { aberto: true, inicio: "09:00", fim: "18:00" },
        quarta: { aberto: true, inicio: "09:00", fim: "18:00" },
        quinta: { aberto: true, inicio: "09:00", fim: "18:00" },
        sexta: { aberto: true, inicio: "09:00", fim: "18:00" },
        sabado: { aberto: true, inicio: "09:00", fim: "18:00" },
        domingo: { aberto: false, inicio: "09:00", fim: "18:00" },
      });
    } finally {
      setCarregando(false);
    }
  };

  /**
   * Formata o horário para exibição
   * Ex: "09:00 às 18:00"
   */
  const formatarHorario = (inicio: string, fim: string): string => {
    return `${inicio} às ${fim}`;
  };

  /**
   * Retorna texto formatado para um dia específico
   * Ex: "9h às 18h" ou "Fechado"
   */
  const getHorarioDia = (dia: keyof HorarioSemana): string => {
    if (!horarios) return 'Carregando...';
    
    const horarioDia = horarios[dia];
    if (!horarioDia.aberto) return 'Fechado';
    
    const inicio = horarioDia.inicio.replace(':', 'h');
    const fim = horarioDia.fim.replace(':', 'h');
    return `${inicio} às ${fim}`;
  };

  /**
   * Retorna se está aberto em um dia específico
   */
  const estaAberto = (dia: keyof HorarioSemana): boolean => {
    if (!horarios) return false;
    return horarios[dia].aberto;
  };

  return {
    horarios,
    carregando,
    formatarHorario,
    getHorarioDia,
    estaAberto,
  };
}
