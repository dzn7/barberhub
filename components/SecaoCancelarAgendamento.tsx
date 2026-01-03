"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, User, Scissors, XCircle, AlertTriangle, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button, Badge } from "@radix-ui/themes";
import { format, parseISO, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";

interface AgendamentoLocal {
  id: string;
  data_hora: string;
  barbeiro_nome: string;
  servico_nome: string;
  servico_preco: number;
  cliente_nome: string;
  cliente_telefone: string;
  status: string;
  criado_em: string;
}

/**
 * Seção para cancelar agendamentos sem precisar de login
 * Utiliza dados salvos no localStorage
 */
export function SecaoCancelarAgendamento() {
  const [agendamentos, setAgendamentos] = useState<AgendamentoLocal[]>([]);
  const [expandido, setExpandido] = useState(false);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [modalConfirmacao, setModalConfirmacao] = useState<AgendamentoLocal | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [mensagemErro, setMensagemErro] = useState("");

  // Carregar agendamentos do localStorage e sincronizar com banco
  useEffect(() => {
    carregarAgendamentos();
  }, []);

  const carregarAgendamentos = async () => {
    try {
      const salvos = JSON.parse(localStorage.getItem('meusAgendamentos') || '[]') as AgendamentoLocal[];
      
      if (salvos.length === 0) {
        setAgendamentos([]);
        return;
      }

      // Buscar status atualizado do banco para cada agendamento
      const idsAgendamentos = salvos.map(a => a.id);
      
      const { data: dadosBanco, error } = await supabase
        .from('agendamentos')
        .select('id, status, data_hora')
        .in('id', idsAgendamentos);

      if (error) {
        console.error('Erro ao sincronizar agendamentos:', error);
        setAgendamentos(salvos);
        return;
      }

      // Atualizar status local com dados do banco
      const agendamentosAtualizados = salvos.map(agLocal => {
        const dadoBanco = dadosBanco?.find((d: { id: string }) => d.id === agLocal.id);
        if (dadoBanco) {
          return {
            ...agLocal,
            status: dadoBanco.status,
            data_hora: dadoBanco.data_hora,
          };
        }
        return agLocal;
      });

      // Filtrar apenas agendamentos que ainda existem no banco e não são muito antigos
      const agendamentosValidos = agendamentosAtualizados.filter(ag => {
        const dadoBanco = dadosBanco?.find((d: { id: string }) => d.id === ag.id);
        if (!dadoBanco) return false;
        
        // Remover agendamentos concluídos ou cancelados há mais de 24h
        const dataAgendamento = parseISO(ag.data_hora);
        const agora = new Date();
        const diferencaHoras = (agora.getTime() - dataAgendamento.getTime()) / (1000 * 60 * 60);
        
        if ((ag.status === 'concluido' || ag.status === 'cancelado') && diferencaHoras > 24) {
          return false;
        }
        
        return true;
      });

      // Salvar lista atualizada no localStorage
      localStorage.setItem('meusAgendamentos', JSON.stringify(agendamentosValidos));
      setAgendamentos(agendamentosValidos);
      
    } catch (erro) {
      console.error('Erro ao carregar agendamentos:', erro);
      const salvos = JSON.parse(localStorage.getItem('meusAgendamentos') || '[]');
      setAgendamentos(salvos);
    }
  };

  const cancelarAgendamento = async (agendamento: AgendamentoLocal) => {
    setProcessandoId(agendamento.id);
    setMensagemErro("");
    
    try {
      // Atualizar status no banco de dados
      const { error: erroUpdate } = await supabase
        .from('agendamentos')
        .update({ 
          status: 'cancelado',
          cancelado_em: new Date().toISOString(),
          motivo_cancelamento: 'Cancelado pelo cliente via site'
        })
        .eq('id', agendamento.id);

      if (erroUpdate) {
        throw erroUpdate;
      }

      // Enviar notificação via WhatsApp para a barbearia
      try {
        const dataFormatada = format(parseISO(agendamento.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        const mensagemCancelamento = `*Agendamento Cancelado*\n\n` +
          `Cliente: ${agendamento.cliente_nome}\n` +
          `Telefone: ${agendamento.cliente_telefone}\n` +
          `Data: ${dataFormatada}\n` +
          `Servico: ${agendamento.servico_nome}\n` +
          `Barbeiro: ${agendamento.barbeiro_nome}\n\n` +
          `_Cancelado pelo cliente via site_`;

        await fetch('/api/whatsapp/enviar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            telefone: '86994156652', // Número da barbearia para notificação
            mensagem: mensagemCancelamento 
          })
        });
      } catch (erroWhatsApp) {
        console.warn('Aviso: Não foi possível enviar notificação WhatsApp:', erroWhatsApp);
        // Não bloquear cancelamento por falha no WhatsApp
      }

      // Atualizar localStorage
      const agendamentosAtualizados = agendamentos.map(ag => 
        ag.id === agendamento.id ? { ...ag, status: 'cancelado' } : ag
      );
      localStorage.setItem('meusAgendamentos', JSON.stringify(agendamentosAtualizados));
      setAgendamentos(agendamentosAtualizados);

      setMensagemSucesso("Agendamento cancelado com sucesso!");
      setModalConfirmacao(null);
      
      setTimeout(() => setMensagemSucesso(""), 4000);
      
    } catch (erro: any) {
      console.error('Erro ao cancelar agendamento:', erro);
      setMensagemErro(`Erro ao cancelar: ${erro.message || 'Tente novamente'}`);
    } finally {
      setProcessandoId(null);
    }
  };

  const removerDoHistorico = (id: string) => {
    const agendamentosAtualizados = agendamentos.filter(ag => ag.id !== id);
    localStorage.setItem('meusAgendamentos', JSON.stringify(agendamentosAtualizados));
    setAgendamentos(agendamentosAtualizados);
  };

  const obterCorStatus = (status: string) => {
    switch (status) {
      case 'pendente': return 'yellow';
      case 'confirmado': return 'blue';
      case 'concluido': return 'green';
      case 'cancelado': return 'red';
      default: return 'gray';
    }
  };

  const obterLabelStatus = (status: string) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'confirmado': return 'Confirmado';
      case 'concluido': return 'Concluído';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  // Filtrar agendamentos que podem ser cancelados (pendentes ou confirmados, e não passados)
  const agendamentosCancelaveis = agendamentos.filter(ag => {
    if (ag.status === 'cancelado' || ag.status === 'concluido') return false;
    const dataAgendamento = parseISO(ag.data_hora);
    return !isPast(dataAgendamento);
  });

  const agendamentosPassadosOuCancelados = agendamentos.filter(ag => {
    if (ag.status === 'cancelado' || ag.status === 'concluido') return true;
    const dataAgendamento = parseISO(ag.data_hora);
    return isPast(dataAgendamento);
  });

  // Não exibir seção se não houver agendamentos
  if (agendamentos.length === 0) {
    return null;
  }

  return (
    <section id="meus-agendamentos" className="py-12 bg-white dark:bg-black">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Mensagens de feedback */}
        <AnimatePresence>
          {mensagemSucesso && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
            >
              <p className="text-green-700 dark:text-green-400 font-medium text-center">
                {mensagemSucesso}
              </p>
            </motion.div>
          )}
          
          {mensagemErro && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            >
              <p className="text-red-700 dark:text-red-400 font-medium text-center">
                {mensagemErro}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cabeçalho da seção */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div 
            className="cursor-pointer bg-zinc-900 dark:bg-zinc-100 p-5 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.005]"
            onClick={() => setExpandido(!expandido)}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="p-3 bg-white/10 dark:bg-zinc-900/20 rounded-lg">
                  <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-white dark:text-zinc-900" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white dark:text-zinc-900">
                      Meus Agendamentos
                    </h2>
                    {agendamentosCancelaveis.length > 0 && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500 rounded-full">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        <span className="text-white font-bold text-xs">{agendamentosCancelaveis.length}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-300 dark:text-zinc-600">
                    {agendamentosCancelaveis.length > 0 
                      ? `${agendamentosCancelaveis.length} agendamento(s) ativo(s)`
                      : 'Visualize seu historico'
                    }
                  </p>
                </div>
              </div>
              
              <Button
                size="3"
                className="w-full sm:w-auto bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold cursor-pointer transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandido(!expandido);
                }}
              >
                {expandido ? (
                  <>
                    <ChevronUp className="w-5 h-5 mr-2" />
                    Ocultar
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-5 h-5 mr-2" />
                    Ver Agendamentos
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Lista de agendamentos */}
        <AnimatePresence>
          {expandido && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Agendamentos ativos */}
              {agendamentosCancelaveis.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide px-2">
                    Agendamentos Ativos
                  </h3>
                  {agendamentosCancelaveis.map((agendamento) => (
                    <motion.div
                      key={agendamento.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge color={obterCorStatus(agendamento.status)} size="2">
                              {obterLabelStatus(agendamento.status)}
                            </Badge>
                            <span className="text-xs text-zinc-500 dark:text-zinc-500">
                              #{agendamento.id.slice(0, 8)}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                              <Calendar className="w-4 h-4 text-zinc-500" />
                              <span>
                                {format(parseISO(agendamento.data_hora), "dd 'de' MMMM", { locale: ptBR })}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                              <Clock className="w-4 h-4 text-zinc-500" />
                              <span>
                                {format(parseISO(agendamento.data_hora), "HH:mm", { locale: ptBR })}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                              <Scissors className="w-4 h-4 text-zinc-500" />
                              <span>{agendamento.servico_nome}</span>
                            </div>

                            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                              <User className="w-4 h-4 text-zinc-500" />
                              <span>{agendamento.barbeiro_nome}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <div className="text-xl font-bold text-zinc-900 dark:text-white text-right">
                            R$ {agendamento.servico_preco.toFixed(2)}
                          </div>
                          <Button
                            color="red"
                            variant="soft"
                            className="cursor-pointer"
                            onClick={() => setModalConfirmacao(agendamento)}
                            disabled={processandoId === agendamento.id}
                          >
                            {processandoId === agendamento.id ? (
                              "Cancelando..."
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 mr-2" />
                                Cancelar
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Histórico de agendamentos */}
              {agendamentosPassadosOuCancelados.length > 0 && (
                <div className="space-y-3 mt-6">
                  <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide px-2">
                    Histórico Recente
                  </h3>
                  {agendamentosPassadosOuCancelados.slice(0, 3).map((agendamento) => (
                    <div
                      key={agendamento.id}
                      className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 opacity-75"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge color={obterCorStatus(agendamento.status)} size="1">
                            {obterLabelStatus(agendamento.status)}
                          </Badge>
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">
                            {format(parseISO(agendamento.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">
                            • {agendamento.servico_nome}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="1"
                          color="gray"
                          className="cursor-pointer"
                          onClick={() => removerDoHistorico(agendamento.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {agendamentos.length === 0 && (
                <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                  Nenhum agendamento encontrado
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de confirmação de cancelamento */}
        <AnimatePresence>
          {modalConfirmacao && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => !processandoId && setModalConfirmacao(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-md w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                      <AlertTriangle className="w-7 h-7 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                        Cancelar Agendamento?
                      </h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Esta ação não pode ser desfeita
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">Data:</span>
                      <span className="font-medium text-zinc-900 dark:text-white">
                        {format(parseISO(modalConfirmacao.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">Serviço:</span>
                      <span className="font-medium text-zinc-900 dark:text-white">
                        {modalConfirmacao.servico_nome}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">Barbeiro:</span>
                      <span className="font-medium text-zinc-900 dark:text-white">
                        {modalConfirmacao.barbeiro_nome}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      Ao cancelar, o horario ficara disponivel para outros clientes.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      variant="soft"
                      color="gray"
                      size="3"
                      className="flex-1 cursor-pointer"
                      onClick={() => setModalConfirmacao(null)}
                      disabled={processandoId !== null}
                    >
                      Manter Agendamento
                    </Button>
                    <Button
                      color="red"
                      size="3"
                      className="flex-1 cursor-pointer"
                      onClick={() => cancelarAgendamento(modalConfirmacao)}
                      disabled={processandoId !== null}
                    >
                      {processandoId ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2" />
                          Cancelando...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-2" />
                          Confirmar Cancelamento
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
