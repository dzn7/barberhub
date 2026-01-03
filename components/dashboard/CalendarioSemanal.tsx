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
const DIAS_SEMANA = ['DOM.', 'SEG.', 'TER.', 'QUA.', 'QUI.', 'SEX.', 'SÁB.'];
const ALTURA_HORA = 80; // Altura em pixels de cada hora (otimizada para melhor visualização)

const CORES_STATUS = {
  pendente: 'bg-yellow-600',
  confirmado: 'bg-teal-600',
  concluido: 'bg-green-600',
  cancelado: 'bg-red-600',
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

  // Calcular semana do dia selecionado
  const diasSemana = useMemo(() => {
    const inicioDaSemana = startOfWeek(diaSelecionado, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(inicioDaSemana, i));
  }, [diaSelecionado]);

  // Buscar agendamentos do dia selecionado
  useEffect(() => {
    buscarAgendamentos();
  }, [diaSelecionado]);

  // Carregar dados do formulário
  useEffect(() => {
    carregarDadosFormulario();
  }, []);

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

      const { data: agendamentosData, error } = await supabase
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
        supabase.from('barbeiros').select('id, nome').eq('ativo', true),
        supabase.from('servicos').select('id, nome, preco').eq('ativo', true),
        supabase.from('clientes').select('id, nome, telefone').eq('ativo', true),
      ]);

      if (barbeirosRes.data) setBarbeiros(barbeirosRes.data);
      if (servicosRes.data) setServicos(servicosRes.data);
      if (clientesRes.data) setClientes(clientesRes.data);

      if (barbeirosRes.data && barbeirosRes.data.length > 0) {
        setNovoAgendamento(prev => ({ ...prev, barbeiroId: barbeirosRes.data[0].id }));
      }
      if (servicosRes.data && servicosRes.data.length > 0) {
        setNovoAgendamento(prev => ({ ...prev, servicoId: servicosRes.data[0].id }));
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
      const { data: clientePorTelefone } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('telefone', telefoneFormatado)
        .maybeSingle();

      if (clientePorTelefone) {
        // Cliente existe com esse telefone - usar ele
        clienteId = clientePorTelefone.id;
        
        // Atualizar nome se for diferente
        if (clientePorTelefone.nome.toLowerCase() !== novoAgendamento.clienteNome.toLowerCase()) {
          await supabase
            .from('clientes')
            .update({ nome: novoAgendamento.clienteNome })
            .eq('id', clienteId);
        }
      } else {
        // Criar novo cliente
        const { data: novoCliente, error: erroCliente } = await supabase
          .from('clientes')
          .insert([{ 
            nome: novoAgendamento.clienteNome, 
            telefone: telefoneFormatado, 
            ativo: true 
          }])
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

      const { error: erroAgendamento } = await supabase
        .from('agendamentos')
        .insert([{
          cliente_id: clienteId,
          barbeiro_id: novoAgendamento.barbeiroId,
          servico_id: novoAgendamento.servicoId,
          data_hora: dataHoraUTC.toISOString(),
          status: 'pendente',
        }]);

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
      
      // Criar datas no timezone de Brasília
      const dataStr = format(diaSelecionado, 'yyyy-MM-dd');
      const inicioLocal = `${dataStr}T00:00:00`;
      const fimLocal = `${dataStr}T23:59:59`;
      
      // Converter para UTC para buscar no banco
      const inicioUTC = fromZonedTime(inicioLocal, TIMEZONE_BRASILIA);
      const fimUTC = fromZonedTime(fimLocal, TIMEZONE_BRASILIA);

      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          clientes (nome, telefone),
          barbeiros (nome),
          servicos (nome, preco, duracao)
        `)
        .gte('data_hora', inicioUTC.toISOString())
        .lte('data_hora', fimUTC.toISOString())
        .order('data_hora', { ascending: true });

      if (error) throw error;
      setAgendamentos(data || []);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    } finally {
      setCarregando(false);
    }
  };

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

  // Confirmar agendamento
  const confirmarAgendamento = async () => {
    if (!agendamentoSelecionado) return;
    
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: 'confirmado' })
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
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: 'cancelado' })
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
      const { error: erroHistorico } = await supabase
        .from('historico_agendamentos')
        .delete()
        .eq('agendamento_id', agendamentoSelecionado.id);

      if (erroHistorico) {
        console.warn('Aviso ao deletar histórico:', erroHistorico);
        // Não bloquear se não houver histórico
      }

      // 2. Depois, deletar o agendamento
      const { error: erroAgendamento } = await supabase
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
    const agendamentosParaConcluir = agendamentos.filter(
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
      const agendamentosParaConcluir = agendamentos.filter(
        ag => ag.status === 'confirmado' || ag.status === 'pendente'
      );

      const idsParaConcluir = agendamentosParaConcluir.map(ag => ag.id);

      // Atualizar todos os agendamentos para concluído
      const { error } = await supabase
        .from('agendamentos')
        .update({ 
          status: 'concluido',
          concluido_em: new Date().toISOString()
        })
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
          <button
            onClick={() => setDiaSelecionado(new Date())}
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

      {/* Seletor de Dias da Semana */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-4">
          {diasSemana.map((dia, index) => {
            const isHoje = isSameDay(dia, new Date());
            const isSelecionado = isSameDay(dia, diaSelecionado);
            
            return (
              <button
                key={index}
                onClick={() => setDiaSelecionado(dia)}
                className={`p-2 sm:p-3 text-center rounded-lg transition-all ${
                  isSelecionado
                    ? 'bg-zinc-900 dark:bg-white'
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <div className={`text-[10px] sm:text-xs font-semibold mb-1 ${
                  isSelecionado ? 'text-white dark:text-black' : 'text-zinc-500 dark:text-zinc-400'
                }`}>
                  {DIAS_SEMANA[index]}
                </div>
                <div className={`text-xl sm:text-2xl font-bold ${
                  isSelecionado
                    ? 'text-white dark:text-black'
                    : isHoje
                    ? 'bg-black dark:bg-white text-white dark:text-black rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center mx-auto'
                    : 'text-zinc-900 dark:text-white'
                }`}>
                  {format(dia, 'd')}
                </div>
              </button>
            );
          })}
        </div>

        {/* Grade de Horários - APENAS UM DIA */}
        <div className="relative border-t border-zinc-200 dark:border-zinc-800 pt-4 overflow-x-auto">
          <div className="flex min-w-[400px]">
            {/* Coluna de horas */}
            <div className="w-16 sm:w-20 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800">
              {horariosExibir.map((hora) => (
                <div
                  key={hora}
                  className="px-1.5 sm:px-2 py-1 text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800"
                  style={{ height: `${ALTURA_HORA}px` }}
                >
                  {String(hora).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Coluna do dia selecionado */}
            <div className="flex-1 relative">
              {/* Linhas de hora */}
              {horariosExibir.map((hora) => (
                <div
                  key={hora}
                  className="border-b border-zinc-100 dark:border-zinc-800"
                  style={{ height: `${ALTURA_HORA}px` }}
                />
              ))}

              {/* Agendamentos */}
              <div className="absolute inset-0 px-1 sm:px-2">
                {agendamentos.map((agendamento) => {
                  const { top, height } = calcularPosicaoAgendamento(
                    agendamento.data_hora,
                    agendamento.servicos?.duracao || 40
                  );
                  const cor = CORES_STATUS[agendamento.status as keyof typeof CORES_STATUS] || CORES_STATUS.pendente;
                  const alturaMinima = Math.max(height, 75);
                  
                  // Converter UTC para timezone de Brasília para exibição
                  const dataUTC = parseISO(agendamento.data_hora);
                  const dataBrasilia = toZonedTime(dataUTC, TIMEZONE_BRASILIA);
                  const horaInicio = format(dataBrasilia, 'HH:mm');
                  const duracaoMs = (agendamento.servicos?.duracao || 40) * 60000;
                  const dataFimBrasilia = new Date(dataBrasilia.getTime() + duracaoMs);
                  const horaFim = format(dataFimBrasilia, 'HH:mm');
                  const temEspacoParaBarbeiro = alturaMinima >= 110;

                  return (
                    <motion.div
                      key={agendamento.id}
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => {
                        setAgendamentoSelecionado(agendamento);
                        setModalDetalhesAberto(true);
                      }}
                      className={`absolute left-1 right-1 sm:left-2 sm:right-2 ${cor} rounded-lg text-white shadow-lg cursor-pointer overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-200 border-l-4 ${
                        agendamento.status === 'confirmado' ? 'border-teal-300' :
                        agendamento.status === 'concluido' ? 'border-green-300' :
                        agendamento.status === 'cancelado' ? 'border-red-300' :
                        'border-yellow-300'
                      }`}
                      style={{
                        top: `${top}px`,
                        height: `${alturaMinima}px`,
                        minHeight: '75px',
                      }}
                    >
                      <div className="h-full flex flex-col p-2.5 sm:p-3 relative">
                        {/* Badge de status no canto superior direito */}
                        <div className="absolute top-2 right-2 z-10">
                          <div className={`w-2 h-2 rounded-full shadow-sm ${
                            agendamento.status === 'confirmado' ? 'bg-teal-200' :
                            agendamento.status === 'concluido' ? 'bg-green-200' :
                            agendamento.status === 'cancelado' ? 'bg-red-200' :
                            'bg-yellow-200'
                          }`} />
                      </div>

                        {/* Cabeçalho com horário */}
                        <div className="flex items-center gap-1.5 mb-2 flex-shrink-0 pr-6">
                          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-90 flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-bold leading-none">
                            {horaInicio} - {horaFim}
                          </span>
                          {agendamento.observacoes && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0 ml-auto" title="Tem observações" />
                          )}
                      </div>

                        {/* Conteúdo principal */}
                        <div className="flex-1 min-h-0 flex flex-col gap-1.5 pr-1">
                          {/* Nome do cliente */}
                          <div className="flex items-start gap-1.5 min-h-0">
                            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-90 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p 
                                className="text-sm sm:text-base font-semibold leading-snug text-white break-words"
                                style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: temEspacoParaBarbeiro ? 2 : 1,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  wordBreak: 'break-word',
                                }}
                                title={agendamento.clientes?.nome || 'Cliente não informado'}
                              >
                                {agendamento.clientes?.nome || 'Cliente não informado'}
                              </p>
                            </div>
                          </div>

                          {/* Serviço */}
                          <div className="flex items-start gap-1.5 min-h-0">
                            <Scissors className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-85 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p 
                                className="text-xs sm:text-sm opacity-95 leading-snug text-white break-words"
                                style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: temEspacoParaBarbeiro ? 2 : 1,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  wordBreak: 'break-word',
                                }}
                                title={agendamento.servicos?.nome || 'Serviço não informado'}
                              >
                                {agendamento.servicos?.nome || 'Serviço não informado'}
                              </p>
                            </div>
                          </div>

                          {/* Barbeiro (apenas se houver espaço suficiente e não for redundante) */}
                          {temEspacoParaBarbeiro && agendamento.barbeiros?.nome && (
                            <div className="flex items-center gap-1.5 mt-auto pt-1 flex-shrink-0 border-t border-white/20">
                              <div className="w-1.5 h-1.5 rounded-full bg-white/50 flex-shrink-0" />
                              <span 
                                className="text-xs opacity-75 text-white truncate"
                                title={agendamento.barbeiros.nome}
                              >
                                {agendamento.barbeiros.nome}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
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
