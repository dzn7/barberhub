"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronLeft, ChevronRight, Calendar, User, Scissors, CheckCircle, XCircle, MessageCircle, Trash2, X, Clock } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, parseISO, subDays } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { TextField, Select, Button } from "@radix-ui/themes";

const TIMEZONE_BRASILIA = "America/Sao_Paulo";
 const supabaseSemTipagem = supabase as any;

interface Agendamento {
  id: string;
  data_hora: string;
  status: string;
  observacoes?: string;
  clientes: {
    nome: string;
    telefone: string;
  };
  barbeiros: {
    nome: string;
  };
  servicos: {
    nome: string;
    preco: number;
    duracao: number;
  };
}

const HORAS_DIA = Array.from({ length: 12 }, (_, i) => i + 8); // 08:00 às 19:00
const DIAS_SEMANA = ['SEG.', 'TER.', 'QUA.', 'QUI.', 'SEX.', 'SÁB.']; // Sem domingo
const ALTURA_HORA = 170; // Altura em pixels de cada hora (aumentada para evitar sobreposição)

const CORES_STATUS = {
  pendente: 'bg-yellow-600',
  confirmado: 'bg-teal-600',
  concluido: 'bg-green-600',
  cancelado: 'bg-red-600',
};

 const ESTILOS_STATUS = {
   pendente: {
     borda: 'border-amber-400',
     fundo: 'bg-amber-50 dark:bg-amber-950/35',
     texto: 'text-amber-950 dark:text-amber-100',
     ponto: 'bg-amber-400',
   },
   confirmado: {
     borda: 'border-teal-400',
     fundo: 'bg-teal-50 dark:bg-teal-950/35',
     texto: 'text-teal-950 dark:text-teal-100',
     ponto: 'bg-teal-400',
   },
   concluido: {
     borda: 'border-emerald-400',
     fundo: 'bg-emerald-50 dark:bg-emerald-950/35',
     texto: 'text-emerald-950 dark:text-emerald-100',
     ponto: 'bg-emerald-400',
   },
   cancelado: {
     borda: 'border-rose-400',
     fundo: 'bg-rose-50 dark:bg-rose-950/35',
     texto: 'text-rose-950 dark:text-rose-100',
     ponto: 'bg-rose-400',
   },
 };

export function CalendarioSemanal() {
  const [diaSelecionado, setDiaSelecionado] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Agendamento | null>(null);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [visualizacaoCompacta, setVisualizacaoCompacta] = useState(true);
  const [modalConcluirTodos, setModalConcluirTodos] = useState(false);
  
  // Estados para novo agendamento
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [modalDataAberto, setModalDataAberto] = useState(false);
  const [modalHoraAberto, setModalHoraAberto] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState("");
  const [novoAgendamento, setNovoAgendamento] = useState({
    clienteNome: "",
    clienteTelefone: "",
    data: format(new Date(), "yyyy-MM-dd"),
    hora: "09:00",
    barbeiroId: "",
    servicoId: "",
  });
  const [barbeiros, setBarbeiros] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [agendamentosDataSelecionada, setAgendamentosDataSelecionada] = useState<Agendamento[]>([]);
  const subscriptionRef = useRef<any>(null);
  const gradeScrollRef = useRef<HTMLDivElement>(null);
  const jaAplicouFocoInicialRef = useRef(false);

  const irParaSemana = useCallback((dataBase: Date) => {
    // Mantém o comportamento de semana SEG-SÁB (começa na segunda)
    setDiaSelecionado(dataBase);
    jaAplicouFocoInicialRef.current = true;
  }, []);

  // Calcular semana do dia selecionado (segunda a sábado, sem domingo)
  const diasSemana = useMemo(() => {
    const inicioDaSemana = startOfWeek(diaSelecionado, { weekStartsOn: 1 }); // Começa na segunda
    return Array.from({ length: 6 }, (_, i) => addDays(inicioDaSemana, i)); // 6 dias (seg-sáb)
  }, [diaSelecionado]);

  // Buscar agendamentos do dia selecionado
  useEffect(() => {
    buscarAgendamentos();
  }, [diaSelecionado]);

  // Carregar dados do formulário
  useEffect(() => {
    carregarDadosFormulario();
  }, []);

  // Scroll automático para o dia atual ao carregar
  useEffect(() => {
    if (jaAplicouFocoInicialRef.current) return;
    if (!gradeScrollRef.current || carregando) return;

    const hoje = new Date();
    const indiceDiaAtual = diasSemana.findIndex((dia) => isSameDay(dia, hoje));
    if (indiceDiaAtual < 0) return;

    // Focar também no dia selecionado (ex: se hoje é quinta, abre na quinta)
    setDiaSelecionado(diasSemana[indiceDiaAtual]);

    // Scroll horizontal calculado pela largura real visível (sem chute)
    const larguraVisivel = gradeScrollRef.current.clientWidth;
    const larguraColuna = Math.max(180, Math.floor((larguraVisivel - 80) / diasSemana.length));
    const scrollX = indiceDiaAtual * larguraColuna;
    gradeScrollRef.current.scrollTo({ left: scrollX, behavior: 'smooth' });

    jaAplicouFocoInicialRef.current = true;
  }, [carregando, diasSemana]);

  // Configurar subscription em tempo real para agendamentos
  useEffect(() => {
    const configurarRealtimeAgendamentos = () => {
      // Limpar subscription anterior se existir
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }

      // Criar nova subscription para a tabela de agendamentos
      const canal = supabase
        .channel('agendamentos-calendario-semanal')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'agendamentos'
          },
          (payload) => {
            // Atualizar agendamentos quando houver mudança
            buscarAgendamentos();
            // Se o modal estiver aberto, atualizar também os horários ocupados
            if (modalNovoAberto && novoAgendamento.data) {
              buscarAgendamentosDataModal(novoAgendamento.data);
            }
          }
        )
        .subscribe();

      subscriptionRef.current = canal;
    };

    configurarRealtimeAgendamentos();

    // Cleanup ao desmontar
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [modalNovoAberto, novoAgendamento.data]);

  // Buscar agendamentos da data selecionada no modal (para verificar horários ocupados)
  const buscarAgendamentosDataModal = useCallback(async (data: string) => {
    try {
      // Converter para UTC considerando timezone de Brasília
      const inicioDiaLocal = `${data}T00:00:00`;
      const fimDiaLocal = `${data}T23:59:59`;
      const inicioDiaUTC = fromZonedTime(inicioDiaLocal, TIMEZONE_BRASILIA);
      const fimDiaUTC = fromZonedTime(fimDiaLocal, TIMEZONE_BRASILIA);

      const { data: agendamentosData, error } = await supabaseSemTipagem
        .from('agendamentos')
        .select(`
          id,
          data_hora,
          status,
          servicos (duracao)
        `)
        .gte('data_hora', inicioDiaUTC.toISOString())
        .lte('data_hora', fimDiaUTC.toISOString())
        .not('status', 'eq', 'cancelado');

      if (error) throw error;
      setAgendamentosDataSelecionada(agendamentosData as any || []);
    } catch (error) {
      console.error('Erro ao buscar agendamentos da data:', error);
    }
  }, []);

  // Atualizar agendamentos quando a data do modal mudar
  useEffect(() => {
    if (modalNovoAberto && novoAgendamento.data) {
      buscarAgendamentosDataModal(novoAgendamento.data);
    }
  }, [modalNovoAberto, novoAgendamento.data, buscarAgendamentosDataModal]);

  const carregarDadosFormulario = async () => {
    try {
      const [barbeirosRes, servicosRes, clientesRes] = await Promise.all([
        supabaseSemTipagem.from('barbeiros').select('id, nome').eq('ativo', true),
        supabaseSemTipagem.from('servicos').select('id, nome, preco').eq('ativo', true),
        supabaseSemTipagem.from('clientes').select('id, nome, telefone').eq('ativo', true),
      ]);

      const barbeirosLista = (barbeirosRes.data as any[]) || [];
      const servicosLista = (servicosRes.data as any[]) || [];
      const clientesLista = (clientesRes.data as any[]) || [];

      if (barbeirosLista.length > 0) setBarbeiros(barbeirosLista);
      if (servicosLista.length > 0) setServicos(servicosLista);
      if (clientesLista.length > 0) setClientes(clientesLista);

      if (barbeirosLista.length > 0) {
        setNovoAgendamento(prev => ({ ...prev, barbeiroId: barbeirosLista[0].id }));
      }
      if (servicosLista.length > 0) {
        setNovoAgendamento(prev => ({ ...prev, servicoId: servicosLista[0].id }));
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const salvarNovoAgendamento = async () => {
    try {
      setProcessando(true);
      setMensagemErro("");

      if (!novoAgendamento.clienteNome.trim()) {
        setMensagemErro("Por favor, digite o nome do cliente");
        return;
      }
      if (!novoAgendamento.clienteTelefone.trim()) {
        setMensagemErro("Por favor, digite o telefone");
        return;
      }
      if (!novoAgendamento.barbeiroId) {
        setMensagemErro("Por favor, selecione um barbeiro");
        return;
      }
      if (!novoAgendamento.servicoId) {
        setMensagemErro("Por favor, selecione um serviço");
        return;
      }

      // Buscar cliente pelo telefone primeiro (mais confiável que nome)
      const telefoneFormatado = novoAgendamento.clienteTelefone.replace(/\D/g, '');
      let clienteId: string | null = null;

      // Verificar se já existe cliente com esse telefone
      const { data: clientePorTelefone } = await supabaseSemTipagem
        .from('clientes')
        .select('id, nome')
        .eq('telefone', telefoneFormatado)
        .maybeSingle();

      const clientePorTelefoneNormalizado = (clientePorTelefone as any) || null;

      if (clientePorTelefoneNormalizado) {
        // Cliente existe com esse telefone - usar ele
        clienteId = clientePorTelefoneNormalizado.id;
        
        // Atualizar nome se for diferente
        if (
          String(clientePorTelefoneNormalizado.nome || '').toLowerCase() !==
          novoAgendamento.clienteNome.toLowerCase()
        ) {
          await supabaseSemTipagem
            .from('clientes')
            .update({ nome: novoAgendamento.clienteNome } as any)
            .eq('id', clienteId as string);
        }
      } else {
        // Criar novo cliente
        const { data: novoCliente, error: erroCliente } = await supabaseSemTipagem
          .from('clientes')
          .insert([
            {
              nome: novoAgendamento.clienteNome,
              telefone: telefoneFormatado,
              ativo: true,
            } as any,
          ])
          .select()
          .single();

        if (erroCliente) throw erroCliente;
        clienteId = novoCliente.id;
        
        // Atualizar lista de clientes local
        setClientes(prev => [...prev, novoCliente]);
      }

      // Criar data no timezone de Brasília e converter para UTC para salvar no banco
      const dataHoraLocal = `${novoAgendamento.data}T${novoAgendamento.hora}:00`;
      const dataHoraUTC = fromZonedTime(dataHoraLocal, TIMEZONE_BRASILIA);

      const { error: erroAgendamento } = await supabaseSemTipagem
        .from('agendamentos')
        .insert([
          {
            cliente_id: clienteId,
            barbeiro_id: novoAgendamento.barbeiroId,
            servico_id: novoAgendamento.servicoId,
            data_hora: dataHoraUTC.toISOString(),
            status: 'pendente',
          } as any,
        ]);

      if (erroAgendamento) throw erroAgendamento;

      setModalNovoAberto(false);
      buscarAgendamentos();
      setNovoAgendamento({
        clienteNome: "",
        clienteTelefone: "",
        data: format(new Date(), "yyyy-MM-dd"),
        hora: "09:00",
        barbeiroId: barbeiros.length > 0 ? barbeiros[0].id : "",
        servicoId: servicos.length > 0 ? servicos[0].id : "",
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setMensagemErro("Erro ao criar agendamento");
    } finally {
      setProcessando(false);
    }
  };

  const buscarAgendamentos = async () => {
    try {
      setCarregando(true);

      // Buscar a SEMANA inteira (segunda a sábado)
      const inicioSemanaStr = format(diasSemana[0], 'yyyy-MM-dd');
      const fimSemanaStr = format(diasSemana[5], 'yyyy-MM-dd'); // Índice 5 = sábado (6 dias: 0-5)

      const inicioSemanaLocal = `${inicioSemanaStr}T00:00:00`;
      const fimSemanaLocal = `${fimSemanaStr}T23:59:59`;

      const inicioSemanaUTC = fromZonedTime(inicioSemanaLocal, TIMEZONE_BRASILIA);
      const fimSemanaUTC = fromZonedTime(fimSemanaLocal, TIMEZONE_BRASILIA);

      const { data, error } = await supabaseSemTipagem
        .from('agendamentos')
        .select(`
          *,
          clientes (nome, telefone),
          barbeiros (nome),
          servicos (nome, preco, duracao)
        `)
        .gte('data_hora', inicioSemanaUTC.toISOString())
        .lte('data_hora', fimSemanaUTC.toISOString())
        .order('data_hora', { ascending: true });

      if (error) throw error;
      setAgendamentos(data || []);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    } finally {
      setCarregando(false);
    }
  };

  const agendamentosPorData = useMemo(() => {
    const mapa: Record<string, Agendamento[]> = {};
    for (const agendamento of agendamentos) {
      const dataUTC = parseISO(agendamento.data_hora);
      const dataBrasilia = toZonedTime(dataUTC, TIMEZONE_BRASILIA);
      const chave = format(dataBrasilia, 'yyyy-MM-dd');
      if (!mapa[chave]) mapa[chave] = [];
      mapa[chave].push(agendamento);
    }
    return mapa;
  }, [agendamentos]);

  // Calcular horários a exibir (compacto ou completo)
  const horariosExibir = useMemo(() => {
    if (!visualizacaoCompacta || agendamentos.length === 0) {
      return HORAS_DIA;
    }

    // Pegar primeira e última hora com agendamentos (convertendo para timezone de Brasília)
    const horasComAgendamentos = agendamentos.map(ag => {
      const dataUTC = parseISO(ag.data_hora);
      const dataBrasilia = toZonedTime(dataUTC, TIMEZONE_BRASILIA);
      return dataBrasilia.getHours();
    });

    const primeiraHora = Math.max(8, Math.min(...horasComAgendamentos) - 1);
    const ultimaHora = Math.min(19, Math.max(...horasComAgendamentos) + 1);

    return Array.from({ length: ultimaHora - primeiraHora + 1 }, (_, i) => primeiraHora + i);
  }, [agendamentos, visualizacaoCompacta]);

  // Calcular posição e altura do agendamento na grade
  const calcularPosicaoAgendamento = (dataHora: string, duracao: number) => {
    // Converter UTC para timezone de Brasília
    const dataUTC = parseISO(dataHora);
    const dataBrasilia = toZonedTime(dataUTC, TIMEZONE_BRASILIA);
    const hora = dataBrasilia.getHours();
    const minutos = dataBrasilia.getMinutes();
    
    const horaInicial = visualizacaoCompacta && horariosExibir.length > 0 ? horariosExibir[0] : 8;
    const top = ((hora - horaInicial) * ALTURA_HORA) + ((minutos / 60) * ALTURA_HORA);
    const height = (duracao / 60) * ALTURA_HORA;
    
    return { top, height };
  };

  const obterMinutosNoDia = useCallback((dataHora: string) => {
    const dataUTC = parseISO(dataHora);
    const dataBrasilia = toZonedTime(dataUTC, TIMEZONE_BRASILIA);
    return dataBrasilia.getHours() * 60 + dataBrasilia.getMinutes();
  }, []);

  const calcularLayoutAgendamentosDia = useCallback((agendamentosDia: Agendamento[]) => {
    const espacoVerticalEntreCards = 6;

    const eventos = agendamentosDia
      .map((agendamento) => {
        const inicioMin = obterMinutosNoDia(agendamento.data_hora);
        const duracaoMin = agendamento.servicos?.duracao || 40;
        const fimMin = inicioMin + duracaoMin;
        const pos = calcularPosicaoAgendamento(agendamento.data_hora, duracaoMin);
        return {
          agendamento,
          inicioMin,
          fimMin,
          top: pos.top,
          height: pos.height,
        };
      })
      .sort((a, b) => a.inicioMin - b.inicioMin);

    // Layout em colunas para evitar sobreposição (similar Google Calendar)
    type Coluna = { fimMin: number; itens: typeof eventos };
    const colunas: Coluna[] = [];

    const resultado: Record<
      string,
      {
        top: number;
        height: number;
        indiceColuna: number;
        totalColunas: number;
        paddingTop: number;
        paddingBottom: number;
      }
    > = {};

    // Primeiro passe: atribuir cada evento à primeira coluna disponível
    for (const evento of eventos) {
      let indiceColuna = colunas.findIndex((c) => c.fimMin <= evento.inicioMin);
      if (indiceColuna === -1) {
        colunas.push({ fimMin: evento.fimMin, itens: [evento] } as any);
        indiceColuna = colunas.length - 1;
      } else {
        colunas[indiceColuna].fimMin = evento.fimMin;
        (colunas[indiceColuna].itens as any).push(evento);
      }

      const alturaMinima = Math.max(evento.height, 110);
      resultado[evento.agendamento.id] = {
        top: evento.top,
        height: alturaMinima,
        indiceColuna,
        totalColunas: 1,
        paddingTop: espacoVerticalEntreCards,
        paddingBottom: espacoVerticalEntreCards,
      };
    }

    // Segundo passe: para cada evento, calcular quantas colunas ativas existem no seu intervalo
    // (assim ele divide largura apenas quando necessário)
    for (const evento of eventos) {
      const colunasAtivas = new Set<number>();
      for (let i = 0; i < colunas.length; i++) {
        const itens = (colunas[i].itens as any) as typeof eventos;
        for (const it of itens) {
          const sobrepoe = !(it.fimMin <= evento.inicioMin || it.inicioMin >= evento.fimMin);
          if (sobrepoe) {
            colunasAtivas.add(i);
            break;
          }
        }
      }

      const totalColunas = Math.max(1, colunasAtivas.size);
      const layoutAtual = resultado[evento.agendamento.id];
      resultado[evento.agendamento.id] = {
        ...layoutAtual,
        totalColunas,
      };
    }

    return resultado;
  }, [calcularPosicaoAgendamento, obterMinutosNoDia]);

  // Confirmar agendamento
  const confirmarAgendamento = async () => {
    if (!agendamentoSelecionado) return;
    
    try {
      const { error } = await supabaseSemTipagem
        .from('agendamentos')
        .update({ status: 'confirmado' } as any)
        .eq('id', agendamentoSelecionado.id);

      if (error) throw error;
      
      setModalDetalhesAberto(false);
      buscarAgendamentos();
    } catch (error) {
      console.error('Erro ao confirmar:', error);
    }
  };

  // Cancelar agendamento
  const cancelarAgendamento = async () => {
    if (!agendamentoSelecionado) return;
    
    try {
      const { error } = await supabaseSemTipagem
        .from('agendamentos')
        .update({ status: 'cancelado' } as any)
        .eq('id', agendamentoSelecionado.id);

      if (error) throw error;
      
      setModalDetalhesAberto(false);
      buscarAgendamentos();
    } catch (error) {
      console.error('Erro ao cancelar:', error);
    }
  };

  // Enviar WhatsApp
  const enviarWhatsApp = () => {
    if (!agendamentoSelecionado?.clientes?.telefone) return;
    
    // Converter UTC para timezone de Brasília para exibição
    const dataUTC = parseISO(agendamentoSelecionado.data_hora);
    const dataBrasilia = toZonedTime(dataUTC, TIMEZONE_BRASILIA);
    const mensagem = `Olá ${agendamentoSelecionado.clientes.nome}! Confirmando seu agendamento para ${format(dataBrasilia, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`;
    const telefone = agendamentoSelecionado.clientes.telefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  // Deletar agendamento
  const deletarAgendamento = async () => {
    if (!agendamentoSelecionado) return;
    
    if (!confirm('Tem certeza que deseja deletar este agendamento?')) return;
    
    try {
      // 1. Primeiro, deletar o histórico relacionado (se existir)
      const { error: erroHistorico } = await supabaseSemTipagem
        .from('historico_agendamentos')
        .delete()
        .eq('agendamento_id', agendamentoSelecionado.id);

      if (erroHistorico) {
        console.warn('Aviso ao deletar histórico:', erroHistorico);
        // Não bloquear se não houver histórico
      }

      // 2. Depois, deletar o agendamento
      const { error: erroAgendamento } = await supabaseSemTipagem
        .from('agendamentos')
        .delete()
        .eq('id', agendamentoSelecionado.id);

      if (erroAgendamento) throw erroAgendamento;
      
      setModalDetalhesAberto(false);
      buscarAgendamentos();
    } catch (error) {
      console.error('Erro ao deletar:', error);
      alert('Erro ao deletar agendamento. Tente novamente.');
    }
  };

  // Concluir todos os agendamentos do dia selecionado
  const concluirTodosAgendamentos = async () => {
    const chaveDiaSelecionado = format(diaSelecionado, 'yyyy-MM-dd');
    const agendamentosDia = agendamentosPorData[chaveDiaSelecionado] || [];
    const agendamentosParaConcluir = agendamentosDia.filter(
      ag => ag.status === 'confirmado' || ag.status === 'pendente'
    );

    if (agendamentosParaConcluir.length === 0) {
      alert('Não há agendamentos confirmados ou pendentes para concluir neste dia.');
      return;
    }

    setModalConcluirTodos(true);
  };

  const confirmarConcluirTodos = async () => {
    setProcessando(true);
    try {
      const chaveDiaSelecionado = format(diaSelecionado, 'yyyy-MM-dd');
      const agendamentosDia = agendamentosPorData[chaveDiaSelecionado] || [];
      const agendamentosParaConcluir = agendamentosDia.filter(
        ag => ag.status === 'confirmado' || ag.status === 'pendente'
      );

      const idsParaConcluir = agendamentosParaConcluir.map(ag => ag.id);

      // Atualizar todos os agendamentos para concluído
      const { error } = await supabaseSemTipagem
        .from('agendamentos')
        .update({ 
          status: 'concluido',
          concluido_em: new Date().toISOString()
        } as any)
        .in('id', idsParaConcluir);

      if (error) throw error;

      setModalConcluirTodos(false);
      buscarAgendamentos();
      
      alert(`✅ ${idsParaConcluir.length} agendamento(s) concluído(s) com sucesso!`);
    } catch (error) {
      console.error('Erro ao concluir agendamentos:', error);
      alert('Erro ao concluir agendamentos. Tente novamente.');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* Navegação de Semana */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => setDiaSelecionado(subDays(diaSelecionado, 7))}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Semana Anterior
        </button>
        
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={format(diaSelecionado, 'yyyy-MM-dd')}
            onChange={(e) => {
              if (!e.target.value) return;
              irParaSemana(new Date(`${e.target.value}T12:00:00`));
            }}
            className="hidden sm:block px-3 py-2 text-sm font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
          />
          <button
            onClick={() => irParaSemana(new Date())}
            className="px-6 py-2 text-sm font-bold bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
          >
            HOJE
          </button>
          
          {agendamentos.some(ag => ag.status === 'confirmado' || ag.status === 'pendente') && (
            <Button
              size="3"
              color="green"
              variant="soft"
              onClick={concluirTodosAgendamentos}
              className="whitespace-nowrap"
            >
              <CheckCircle className="w-4 h-4" />
              Concluir Todos
            </Button>
          )}
        </div>
        
        <button
          onClick={() => setDiaSelecionado(addDays(diaSelecionado, 7))}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          Próxima Semana
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grade Semanal (dias x horas) */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div ref={gradeScrollRef} className="overflow-auto overscroll-contain">
          <div className="min-w-[980px]">
            {/* Cabeçalho (dias) */}
            <div className="sticky top-0 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex">
                <div className="w-16 sm:w-20 flex-shrink-0 sticky left-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-r border-zinc-200 dark:border-zinc-800" />
                {diasSemana.map((dia, index) => {
                  const isHoje = isSameDay(dia, new Date());
                  const isSelecionado = isSameDay(dia, diaSelecionado);
                  return (
                    <button
                      key={index}
                      onClick={() => setDiaSelecionado(dia)}
                      className={`flex-shrink-0 w-[170px] sm:w-[200px] lg:w-[220px] xl:flex-1 xl:w-auto px-3 py-3 text-left border-r border-zinc-200 dark:border-zinc-800 transition-colors ${
                        isSelecionado
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-900 dark:text-white'
                      }`}
                    >
                      <div className={`text-xs font-semibold ${
                        isSelecionado ? 'text-white/90 dark:text-zinc-700' : 'text-zinc-500 dark:text-zinc-400'
                      }`}>
                        {DIAS_SEMANA[index]}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`text-lg font-bold leading-none ${
                          isSelecionado ? 'text-white dark:text-zinc-900' : 'text-zinc-900 dark:text-white'
                        }`}>
                          {format(dia, 'd')}
                        </div>
                        <div className={`text-sm font-medium ${
                          isSelecionado ? 'text-white/80 dark:text-zinc-700' : 'text-zinc-600 dark:text-zinc-300'
                        }`}>
                          {format(dia, 'MMM', { locale: ptBR })}
                        </div>
                        {isHoje && !isSelecionado && (
                          <div className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                            Hoje
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Corpo (horas + colunas) */}
            <div className="flex">
              {/* Coluna de horas */}
              <div className="w-16 sm:w-20 flex-shrink-0 sticky left-0 z-10 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
                {horariosExibir.map((hora) => (
                  <div
                    key={hora}
                    className="px-2 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800"
                    style={{ height: `${ALTURA_HORA}px` }}
                  >
                    {String(hora).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {/* Colunas dos dias */}
              {diasSemana.map((dia, index) => {
                const chaveDia = format(dia, 'yyyy-MM-dd');
                const agendamentosDia = agendamentosPorData[chaveDia] || [];
                const layoutAgendamentosDia = calcularLayoutAgendamentosDia(agendamentosDia);
                const isHoje = isSameDay(dia, new Date());
                const isSelecionado = isSameDay(dia, diaSelecionado);
                return (
                  <div
                    key={index}
                    className={`relative flex-shrink-0 w-[170px] sm:w-[200px] lg:w-[220px] xl:flex-1 xl:min-w-0 border-r border-zinc-200 dark:border-zinc-800 ${
                      isSelecionado
                        ? 'bg-zinc-50/80 dark:bg-zinc-800/30'
                        : 'bg-white dark:bg-zinc-900'
                    }`}
                  >
                    {/* Linhas de hora */}
                    {horariosExibir.map((hora) => (
                      <div
                        key={hora}
                        className="border-b border-zinc-100 dark:border-zinc-800"
                        style={{ height: `${ALTURA_HORA}px` }}
                      />
                    ))}

                    {/* Indicador de hoje */}
                    {isHoje && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-y-0 left-0 w-0.5 bg-zinc-900/30 dark:bg-white/25" />
                      </div>
                    )}

                    {/* Agendamentos do dia */}
                    <div className="absolute inset-0 px-2 py-1">
                      {agendamentosDia.map((agendamento) => {
                        const layout = layoutAgendamentosDia[agendamento.id];
                        const top = layout?.top ?? 0;
                        const alturaMinima = layout?.height ?? 110;
                        const indiceColuna = layout?.indiceColuna ?? 0;
                        const totalColunas = layout?.totalColunas ?? 1;
                        const paddingTop = layout?.paddingTop ?? 0;
                        const paddingBottom = layout?.paddingBottom ?? 0;

                        const larguraDisponivel = 100;
                        const larguraPorColuna = larguraDisponivel / totalColunas;
                        const leftPercent = indiceColuna * larguraPorColuna;
                        const widthPercent = larguraPorColuna;

                        const dataUTC = parseISO(agendamento.data_hora);
                        const dataBrasilia = toZonedTime(dataUTC, TIMEZONE_BRASILIA);
                        const horaInicio = format(dataBrasilia, 'HH:mm');
                        const duracaoMs = (agendamento.servicos?.duracao || 40) * 60000;
                        const dataFimBrasilia = new Date(dataBrasilia.getTime() + duracaoMs);
                        const horaFim = format(dataFimBrasilia, 'HH:mm');

                        const estilo =
                          ESTILOS_STATUS[agendamento.status as keyof typeof ESTILOS_STATUS] ||
                          ESTILOS_STATUS.pendente;

                        return (
                          <motion.button
                            key={agendamento.id}
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.18 }}
                            type="button"
                            onClick={() => {
                              setAgendamentoSelecionado(agendamento);
                              setModalDetalhesAberto(true);
                            }}
                            className={`absolute rounded-xl border border-zinc-200/70 dark:border-zinc-700/70 shadow-sm hover:shadow-md transition-all text-left overflow-hidden ${estilo.fundo} ${estilo.borda} border-l-4`}
                            style={{
                              top: `${top}px`,
                              height: `${Math.max(1, alturaMinima - paddingTop - paddingBottom)}px`,
                              minHeight: '110px',
                              left: `calc(${leftPercent}% + 8px)`,
                              width: `calc(${widthPercent}% - 16px)`,
                            }}
                          >
                            <div className="h-full p-2.5 flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${estilo.ponto}`} />
                                <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                                  {horaInicio}–{horaFim}
                                </span>
                                {agendamento.observacoes && (
                                  <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white/70 dark:bg-black/20 text-zinc-700 dark:text-zinc-200">
                                    Obs.
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className={`text-sm font-bold leading-snug truncate ${estilo.texto}`} title={agendamento.clientes?.nome || 'Cliente não informado'}>
                                  {agendamento.clientes?.nome || 'Cliente não informado'}
                                </div>
                                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300 truncate" title={agendamento.servicos?.nome || 'Serviço não informado'}>
                                  {agendamento.servicos?.nome || 'Serviço não informado'}
                                </div>
                              </div>

                              {agendamento.barbeiros?.nome && (
                                <div className="mt-auto pt-1.5 border-t border-zinc-900/10 dark:border-white/10 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 truncate" title={agendamento.barbeiros.nome}>
                                  {agendamento.barbeiros.nome}
                                </div>
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Botão flutuante de adicionar */}
      <button
        onClick={() => setModalNovoAberto(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-black dark:bg-white text-white dark:text-black rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center z-50"
      >
        <Plus className="w-6 h-6" />
      </button>

      {carregando && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zinc-900 dark:border-white"></div>
        </div>
      )}

      {/* Modal de Confirmação - Concluir Todos */}
      <AnimatePresence>
        {modalConcluirTodos && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !processando && setModalConcluirTodos(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-xl p-6 max-w-md w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                      Concluir Todos os Agendamentos
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {format(diaSelecionado, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    ⚠️ Esta ação irá marcar todos os agendamentos <strong>confirmados e pendentes</strong> deste dia como <strong>concluídos</strong>.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => setModalConcluirTodos(false)}
                    variant="soft"
                    color="gray"
                    size="3"
                    className="flex-1"
                    disabled={processando}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={confirmarConcluirTodos}
                    color="green"
                    size="3"
                    className="flex-1"
                    disabled={processando}
                  >
                    {processando ? 'Processando...' : 'Confirmar'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Detalhes do Agendamento */}
      {modalDetalhesAberto && agendamentoSelecionado && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[9999] p-4"
          style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}
          onClick={() => setModalDetalhesAberto(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-zinc-900 rounded-xl p-6 w-full max-w-md border border-zinc-200 dark:border-zinc-800 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                Detalhes do Agendamento
              </h3>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                agendamentoSelecionado.status === 'concluido' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                agendamentoSelecionado.status === 'cancelado' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                agendamentoSelecionado.status === 'confirmado' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400' :
                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
              }`}>
                {agendamentoSelecionado.status}
              </span>
              <button
                onClick={() => setModalDetalhesAberto(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
              </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Data e Hora */}
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
                <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400 mb-2">
                  <Calendar className="w-5 h-5" />
                  <span className="text-sm font-medium">Data e Hora</span>
                </div>
                <p className="text-lg font-bold text-zinc-900 dark:text-white ml-8">
                  {format(toZonedTime(parseISO(agendamentoSelecionado.data_hora), TIMEZONE_BRASILIA), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>

              {/* Cliente */}
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
                <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400 mb-2">
                  <User className="w-5 h-5" />
                  <span className="text-sm font-medium">Cliente</span>
                </div>
                <p className="text-lg font-bold text-zinc-900 dark:text-white ml-8">
                  {agendamentoSelecionado.clientes?.nome}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 ml-8">
                  {agendamentoSelecionado.clientes?.telefone || 'Sem telefone'}
                </p>
              </div>

              {/* Serviço */}
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
                <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400 mb-2">
                  <Scissors className="w-5 h-5" />
                  <span className="text-sm font-medium">Serviço</span>
                </div>
                <p className="text-lg font-bold text-zinc-900 dark:text-white ml-8">
                  {agendamentoSelecionado.servicos?.nome}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 ml-8">
                  R$ {agendamentoSelecionado.servicos?.preco?.toFixed(2)} • {agendamentoSelecionado.servicos?.duracao}min
                </p>
              </div>

              {/* Barbeiro */}
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
                <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400 mb-2">
                  <User className="w-5 h-5" />
                  <span className="text-sm font-medium">Barbeiro</span>
                </div>
                <p className="text-lg font-bold text-zinc-900 dark:text-white ml-8">
                  {agendamentoSelecionado.barbeiros?.nome}
                </p>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="mt-6 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={confirmarAgendamento}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                >
                  <CheckCircle className="w-5 h-5" />
                  Confirmar
                </button>
                <button
                  onClick={cancelarAgendamento}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                >
                  <XCircle className="w-5 h-5" />
                  Cancelar
                </button>
                <button
                  onClick={enviarWhatsApp}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
                >
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp
                </button>
              </div>
              
              <button
                onClick={deletarAgendamento}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-700 hover:bg-red-800 text-white rounded-lg transition-colors font-medium"
              >
                <Trash2 className="w-5 h-5" />
                Deletar Agendamento
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Novo Agendamento */}
      <AnimatePresence>
        {modalNovoAberto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-[9999] p-4 overflow-hidden"
            style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}
            onClick={() => !processando && setModalNovoAberto(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-6 sm:p-8 w-full max-w-md border border-zinc-200 dark:border-zinc-800 shadow-2xl max-h-[95vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-6">
                <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
                    Novo Agendamento
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                    Crie um novo agendamento para um cliente
                  </p>
                </div>

                <div className="space-y-4">
                  {mensagemErro && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-700 dark:text-red-400">{mensagemErro}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Nome do Cliente
                    </label>
                    <TextField.Root
                      placeholder="Digite o nome do cliente"
                      value={novoAgendamento.clienteNome}
                      onChange={(e) => setNovoAgendamento({ ...novoAgendamento, clienteNome: e.target.value })}
                      size="3"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Telefone (WhatsApp)
                    </label>
                    <TextField.Root
                      placeholder="(86) 98905-3279"
                      value={novoAgendamento.clienteTelefone}
                      onChange={(e) => setNovoAgendamento({ ...novoAgendamento, clienteTelefone: e.target.value })}
                      size="3"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Data
                    </label>
                    <Button
                      onClick={() => setModalDataAberto(true)}
                      variant="soft"
                      className="w-full text-left justify-between"
                      size="3"
                    >
                      <span>{format(parseISO(`${novoAgendamento.data}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })}</span>
                      <Calendar className="w-4 h-4" />
                    </Button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Hora
                    </label>
                    <Button
                      onClick={() => setModalHoraAberto(true)}
                      variant="soft"
                      className="w-full text-left justify-between"
                      size="3"
                    >
                      <div className="flex items-center gap-2">
                        <span>{novoAgendamento.hora}</span>
                        {agendamentosDataSelecionada.some(ag => {
                          const agDataUTC = parseISO(ag.data_hora);
                          const agDataBrasilia = toZonedTime(agDataUTC, TIMEZONE_BRASILIA);
                          const agHoraStr = format(agDataBrasilia, 'HH:mm');
                          return agHoraStr === novoAgendamento.hora;
                        }) && (
                          <span className="text-xs text-red-600 dark:text-red-400">(Ocupado)</span>
                        )}
                      </div>
                      <Clock className="w-4 h-4" />
                    </Button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Barbeiro
                    </label>
                    <Select.Root value={novoAgendamento.barbeiroId} onValueChange={(value) => setNovoAgendamento({ ...novoAgendamento, barbeiroId: value })}>
                      <Select.Trigger placeholder="Selecione um barbeiro" className="w-full" />
                      <Select.Content>
                        {barbeiros.map((barbeiro) => (
                          <Select.Item key={barbeiro.id} value={barbeiro.id}>
                            {barbeiro.nome}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Serviço
                    </label>
                    <Select.Root value={novoAgendamento.servicoId} onValueChange={(value) => setNovoAgendamento({ ...novoAgendamento, servicoId: value })}>
                      <Select.Trigger placeholder="Selecione um serviço" className="w-full" />
                      <Select.Content>
                        {servicos.map((servico) => (
                          <Select.Item key={servico.id} value={servico.id}>
                            {servico.nome} - R$ {servico.preco.toFixed(2)}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <Button
                    onClick={() => setModalNovoAberto(false)}
                    variant="soft"
                    className="flex-1"
                    size="3"
                    disabled={processando}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={salvarNovoAgendamento}
                    className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-black cursor-pointer"
                    size="3"
                    disabled={processando}
                  >
                    {processando ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white dark:border-black mr-2"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Criar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Seleção de Data */}
      <AnimatePresence>
        {modalDataAberto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-[9999] p-4"
            style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}
            onClick={() => setModalDataAberto(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-zinc-900 rounded-xl p-6 w-full max-w-sm border border-zinc-200 dark:border-zinc-800 shadow-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Selecione a Data
                </h3>
                
                <input
                  type="date"
                  value={novoAgendamento.data}
                  onChange={(e) => {
                    setNovoAgendamento({ ...novoAgendamento, data: e.target.value });
                    setModalDataAberto(false);
                  }}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-500"
                />

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 14 }, (_, i) => addDays(parseISO(`${novoAgendamento.data}T00:00:00`), i - 7)).map((dia) => (
                    <button
                      key={format(dia, 'yyyy-MM-dd')}
                      onClick={() => {
                        setNovoAgendamento({ ...novoAgendamento, data: format(dia, 'yyyy-MM-dd') });
                        setModalDataAberto(false);
                      }}
                      className={`p-2 rounded text-sm font-medium transition-all ${
                        format(dia, 'yyyy-MM-dd') === novoAgendamento.data
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {format(dia, 'd')}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={() => setModalDataAberto(false)}
                  variant="soft"
                  className="w-full"
                  size="2"
                >
                  Fechar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Seleção de Hora */}
      <AnimatePresence>
        {modalHoraAberto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-[9999] p-4"
            style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}
            onClick={() => setModalHoraAberto(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-zinc-900 rounded-xl p-6 w-full max-w-sm border border-zinc-200 dark:border-zinc-800 shadow-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Selecione a Hora
                </h3>

                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 33 }, (_, i) => {
                    const horas = 8 + Math.floor((i * 20) / 60);
                    const minutos = (i * 20) % 60;
                    const hora = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
                    
                    // Verificar se o horário está ocupado usando agendamentos da data selecionada
                    const horaOcupada = agendamentosDataSelecionada.some(ag => {
                      // Converter data UTC do banco para timezone de Brasília
                      const agDataUTC = parseISO(ag.data_hora);
                      const agDataBrasilia = toZonedTime(agDataUTC, TIMEZONE_BRASILIA);
                      const agHoraStr = format(agDataBrasilia, 'HH:mm');
                      
                      return agHoraStr === hora;
                    });

                    return (
                      <button
                        key={hora}
                        onClick={() => {
                          if (!horaOcupada) {
                            setNovoAgendamento({ ...novoAgendamento, hora });
                            setModalHoraAberto(false);
                          }
                        }}
                        disabled={horaOcupada}
                        className={`p-2 rounded text-sm font-medium transition-all ${
                          novoAgendamento.hora === hora
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                            : horaOcupada
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 cursor-not-allowed line-through'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {hora}
                      </button>
                    );
                  })}
                </div>

                <Button
                  onClick={() => setModalHoraAberto(false)}
                  variant="soft"
                  className="w-full"
                  size="2"
                >
                  Fechar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
