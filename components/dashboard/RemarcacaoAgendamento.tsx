"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, User, Phone, Edit2, Scissors, AlertCircle } from "lucide-react";
import { Button } from "@radix-ui/themes";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { ModalRemarcacao } from "./ModalRemarcacao";
import { Modal } from "@/components/Modal";

interface Agendamento {
  id: string;
  data_hora: string;
  status: string;
  clientes: {
    nome: string;
    telefone: string;
  };
  barbeiros: {
    id: string;
    nome: string;
  };
  servicos: {
    nome: string;
    preco: number;
    duracao: number;
  };
  foi_remarcado?: boolean;
  total_remarcacoes?: number;
  ultima_remarcacao?: any;
}

/**
 * Componente de Remarcação de Agendamentos
 * Permite alterar data/hora e notifica o cliente via WhatsApp
 */
export function RemarcacaoAgendamento() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Agendamento | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [agendamentosSelecionados, setAgendamentosSelecionados] = useState<string[]>([]);
  const [modoSelecao, setModoSelecao] = useState(false);
  
  // Estados para modal de feedback
  const [modalFeedbackAberto, setModalFeedbackAberto] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    type: "info" as "success" | "error" | "warning" | "info" | "confirm",
    onConfirm: undefined as (() => void) | undefined,
  });

  useEffect(() => {
    buscarAgendamentos();
  }, []);

  const buscarAgendamentos = async () => {
    try {
      // Buscar agendamentos com informação de remarcação
      const { data, error } = await supabase
        .from("agendamentos")
        .select(`
          id,
          data_hora,
          status,
          clientes (nome, telefone),
          barbeiros (id, nome),
          servicos (nome, preco, duracao)
        `)
        .in("status", ["pendente", "confirmado"])
        .gte("data_hora", new Date().toISOString())
        .order("data_hora");

      if (error) throw error;
      
      // Buscar histórico de remarcações para cada agendamento
      const agendamentosComHistorico = await Promise.all(
        (data || []).map(async (agendamento) => {
          const { data: historico } = await supabase
            .from("historico_agendamentos")
            .select("*")
            .eq("agendamento_id", agendamento.id)
            .order("data_alteracao", { ascending: false });
          
          return {
            ...agendamento,
            foi_remarcado: historico && historico.length > 0,
            total_remarcacoes: historico?.length || 0,
            ultima_remarcacao: historico?.[0]
          };
        })
      );
      
      setAgendamentos(agendamentosComHistorico as any);
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error);
    } finally {
      setCarregando(false);
    }
  };

  const toggleSelecao = (id: string) => {
    setAgendamentosSelecionados(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selecionarTodos = () => {
    if (agendamentosSelecionados.length === agendamentos.length) {
      setAgendamentosSelecionados([]);
    } else {
      setAgendamentosSelecionados(agendamentos.map(a => a.id));
    }
  };

  const deletarSelecionados = async () => {
    setModalConfig({
      title: "Confirmar Exclusão",
      message: `Deseja realmente deletar ${agendamentosSelecionados.length} agendamento(s)? Esta ação não pode ser desfeita.`,
      type: "confirm",
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('agendamentos')
            .delete()
            .in('id', agendamentosSelecionados);

          if (error) throw error;

          setAgendamentosSelecionados([]);
          setModoSelecao(false);
          buscarAgendamentos();
          
          setModalConfig({
            title: "Sucesso!",
            message: "Agendamentos deletados com sucesso!",
            type: "success",
            onConfirm: undefined,
          });
          setModalFeedbackAberto(true);
        } catch (error) {
          console.error('Erro ao deletar agendamentos:', error);
          setModalConfig({
            title: "Erro",
            message: "Erro ao deletar agendamentos. Tente novamente.",
            type: "error",
            onConfirm: undefined,
          });
          setModalFeedbackAberto(true);
        }
      },
    });
    setModalFeedbackAberto(true);
  };

  const abrirModal = (agendamento: Agendamento) => {
    if (modoSelecao) {
      toggleSelecao(agendamento.id);
    } else {
      setAgendamentoSelecionado(agendamento);
      setModalAberto(true);
    }
  };

  const fecharModal = () => {
    setModalAberto(false);
    setAgendamentoSelecionado(null);
  };

  const handleSucesso = () => {
    buscarAgendamentos();
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
            Remarcação de Agendamentos
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-1">
            Altere data/hora e notifique o cliente automaticamente
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <Calendar className="w-4 h-4" />
          <span>{agendamentos.length} agendamentos futuros</span>
        </div>
      </div>

      {/* Barra de Seleção Múltipla */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg">
        <button
          onClick={() => {
            setModoSelecao(!modoSelecao);
            setAgendamentosSelecionados([]);
          }}
          className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm font-medium w-full sm:w-auto"
        >
          {modoSelecao ? 'Cancelar Seleção' : 'Selecionar Múltiplos'}
        </button>

        {modoSelecao && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <span className="text-sm text-zinc-600 dark:text-zinc-400 text-center sm:text-left">
              {agendamentosSelecionados.length} selecionado(s)
            </span>
            <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={selecionarTodos}
                className="px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors w-full sm:w-auto"
            >
              {agendamentosSelecionados.length === agendamentos.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </button>
            {agendamentosSelecionados.length > 0 && (
              <button
                onClick={deletarSelecionados}
                  className="px-3 py-1.5 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors w-full sm:w-auto"
              >
                Deletar Selecionados
              </button>
            )}
            </div>
          </div>
        )}
      </div>

      {/* Alerta */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium mb-1">Notificação Automática via WhatsApp</p>
            <p className="text-blue-600 dark:text-blue-400">
              Ao remarcar um agendamento, o cliente receberá automaticamente uma mensagem no WhatsApp com os novos detalhes.
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Agendamentos */}
      {agendamentos.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
          Nenhum agendamento futuro encontrado
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {agendamentos.map((agendamento) => (
              <motion.div
                key={agendamento.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Checkbox para seleção múltipla */}
                  {modoSelecao && (
                    <input
                      type="checkbox"
                      checked={agendamentosSelecionados.includes(agendamento.id)}
                      onChange={() => toggleSelecao(agendamento.id)}
                      className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-2 focus:ring-zinc-900 cursor-pointer mt-1"
                    />
                  )}

                  <div className="flex-1 space-y-3 w-full">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                        <Calendar className="w-5 h-5 flex-shrink-0" />
                        <span className="font-semibold text-sm sm:text-base">
                          {format(parseISO(agendamento.data_hora), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          agendamento.status === "confirmado"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                        }`}
                      >
                        {agendamento.status}
                      </span>
                      {agendamento.foi_remarcado && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 flex items-center gap-1 whitespace-nowrap">
                          🔄 Remarcado {agendamento.total_remarcacoes}x
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{agendamento.clientes.nome}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Scissors className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{agendamento.servicos.nome}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span>{agendamento.servicos.duracao} min</span>
                      </div>
                    </div>
                  </div>

                  {!modoSelecao && (
                    <Button
                      onClick={() => abrirModal(agendamento)}
                      variant="soft"
                      className="cursor-pointer w-full sm:w-auto mt-4 sm:mt-0"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Remarcar
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal de Remarcação */}
      {agendamentoSelecionado && (
        <ModalRemarcacao
          agendamento={agendamentoSelecionado}
          aberto={modalAberto}
          onFechar={fecharModal}
          onSucesso={handleSucesso}
        />
      )}

      {/* Modal de Feedback */}
      <Modal
        isOpen={modalFeedbackAberto}
        onClose={() => setModalFeedbackAberto(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
      />
    </div>
  );
}
