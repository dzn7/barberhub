"use client";

import { useState } from "react";
import { CalendarioAgendamentos } from "./CalendarioAgendamentos";
import { CalendarioSemanal } from "./CalendarioSemanal";
import { Calendar, List } from "lucide-react";

/**
 * Componente de Gestão de Agendamentos
 * Visualização em calendário estilo Google Calendar ou Grade Semanal
 */
export function GestaoAgendamentos() {
  const [visualizacao, setVisualizacao] = useState<'lista' | 'semanal'>('lista');

  return (
    <div className="space-y-4">
      {/* Toggle de Visualização */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setVisualizacao('lista')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            visualizacao === 'lista'
              ? 'bg-zinc-900 dark:bg-white text-white dark:text-black'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          }`}
        >
          <List className="w-4 h-4" />
          Lista
        </button>
        <button
          onClick={() => setVisualizacao('semanal')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            visualizacao === 'semanal'
              ? 'bg-zinc-900 dark:bg-white text-white dark:text-black'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Grade Semanal
        </button>
      </div>

      {/* Renderizar visualização selecionada */}
      {visualizacao === 'lista' ? <CalendarioAgendamentos /> : <CalendarioSemanal />}
    </div>
  );
}

/**
 * Componente legado mantido para referência
 * Pode ser removido após validação
 */
export function GestaoAgendamentosLegado() {
  const [termoBusca, setTermoBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroData, setFiltroData] = useState("hoje");
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [modalMensagem, setModalMensagem] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<any>(null);
  const [mensagemCustom, setMensagemCustom] = useState("");
  const [agendamentosSelecionados, setAgendamentosSelecionados] = useState<string[]>([]);
  const [modoSelecao, setModoSelecao] = useState(false);
  
  // Estados para modais
  const [modalAberto, setModalAberto] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    type: "info" as "success" | "error" | "warning" | "info" | "confirm",
    onConfirm: undefined as (() => void) | undefined,
  });

  // Buscar agendamentos do Supabase
  useEffect(() => {
    buscarAgendamentos();
  }, []);

  const buscarAgendamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          clientes (nome, telefone),
          barbeiros (nome),
          servicos (nome, preco)
        `)
        .order('data_hora', { ascending: true });

      if (error) throw error;

      console.log('Agendamentos carregados:', data);
      setAgendamentos(data || []);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    } finally {
      setCarregando(false);
    }
  };

  // Funções de seleção múltipla
  const toggleSelecao = (id: string) => {
    setAgendamentosSelecionados(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selecionarTodos = (agendamentosFiltrados: any[]) => {
    if (agendamentosSelecionados.length === agendamentosFiltrados.length) {
      setAgendamentosSelecionados([]);
    } else {
      setAgendamentosSelecionados(agendamentosFiltrados.map((a: any) => a.id));
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
          setModalAberto(true);
        } catch (error) {
          console.error('Erro ao deletar agendamentos:', error);
          setModalConfig({
            title: "Erro",
            message: "Erro ao deletar agendamentos. Tente novamente.",
            type: "error",
            onConfirm: undefined,
          });
          setModalAberto(true);
        }
      },
    });
    setModalAberto(true);
  };

  // Enviar lembrete via WhatsApp
  const enviarLembrete = async (agendamento: any) => {
    if (!agendamento.clientes?.telefone) {
      setModalConfig({
        title: "Erro",
        message: "Cliente sem telefone cadastrado!",
        type: "error",
        onConfirm: undefined,
      });
      setModalAberto(true);
      return;
    }

    setModalConfig({
      title: "Enviar Lembrete",
      message: `Enviar lembrete via WhatsApp para ${agendamento.clientes.nome}?`,
      type: "confirm",
      onConfirm: async () => {
        await executarEnvioLembrete(agendamento);
      },
    });
    setModalAberto(true);
  };

  const executarEnvioLembrete = async (agendamento: any) => {

    setProcessandoId(agendamento.id);
    try {
      const response = await fetch(`${BOT_URL}/api/mensagens/lembrete-agendamento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agendamentoId: agendamento.id })
      });

      const resultado = await response.json();

      if (resultado.sucesso) {
        setModalConfig({
          title: "Sucesso!",
          message: "Lembrete enviado com sucesso via WhatsApp!",
          type: "success",
          onConfirm: undefined,
        });
      } else {
        setModalConfig({
          title: "Erro",
          message: `Erro ao enviar: ${resultado.erro}`,
          type: "error",
          onConfirm: undefined,
        });
      }
      setModalAberto(true);
    } catch (error) {
      console.error('Erro:', error);
      setModalConfig({
        title: "Erro de Conexão",
        message: "Bot não está conectado. Verifique se está rodando.",
        type: "error",
        onConfirm: undefined,
      });
      setModalAberto(true);
    } finally {
      setProcessandoId(null);
    }
  };

  // Abrir modal para enviar mensagem customizada
  const abrirModalMensagem = (agendamento: any) => {
    setAgendamentoSelecionado(agendamento);
    setMensagemCustom('');
    setModalMensagem(true);
  };

  // Enviar mensagem customizada
  const enviarMensagemCustom = async () => {
    if (!mensagemCustom.trim()) {
      setModalConfig({
        title: "Erro",
        message: "Digite uma mensagem!",
        type: "error",
        onConfirm: undefined,
      });
      setModalAberto(true);
      return;
    }

    if (!agendamentoSelecionado?.clientes?.telefone) {
      setModalConfig({
        title: "Erro",
        message: "Cliente sem telefone!",
        type: "error",
        onConfirm: undefined,
      });
      setModalAberto(true);
      return;
    }

    setProcessandoId(agendamentoSelecionado.id);
    try {
      const response = await fetch(`${BOT_URL}/api/mensagens/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero: agendamentoSelecionado.clientes.telefone,
          mensagem: mensagemCustom
        })
      });

      const resultado = await response.json();

      if (resultado.sucesso) {
        setModalMensagem(false);
        setMensagemCustom('');
        setModalConfig({
          title: "Sucesso!",
          message: "Mensagem enviada com sucesso via WhatsApp!",
          type: "success",
          onConfirm: undefined,
        });
        setModalAberto(true);
      } else {
        setModalConfig({
          title: "Erro",
          message: `Erro: ${resultado.erro}`,
          type: "error",
          onConfirm: undefined,
        });
        setModalAberto(true);
      }
    } catch (error) {
      console.error('Erro:', error);
      setModalConfig({
        title: "Erro de Conexão",
        message: "Bot não está conectado. Verifique se está rodando.",
        type: "error",
        onConfirm: undefined,
      });
      setModalAberto(true);
    } finally {
      setProcessandoId(null);
    }
  };

  const confirmarAgendamento = async (id: string) => {
    setProcessandoId(id);
    try {
      console.log('Tentando confirmar agendamento:', id);
      
      const { data, error } = await supabase
        .from('agendamentos')
        .update({ status: 'confirmado' })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Erro SQL:', error);
        throw error;
      }

      console.log('Agendamento confirmado com sucesso:', data);
      
      // Atualizar estado local imediatamente
      setAgendamentos(prev => 
        prev.map(ag => 
          ag.id === id ? { ...ag, status: 'confirmado' } : ag
        )
      );
      
      // Recarregar para garantir sincronização
      setTimeout(() => {
        buscarAgendamentos();
      }, 1000);
      
    } catch (error: any) {
      console.error('Erro ao confirmar agendamento:', error);
      setModalConfig({
        title: "Erro",
        message: `Erro ao confirmar: ${error.message}`,
        type: "error",
        onConfirm: undefined,
      });
      setModalAberto(true);
    } finally {
      setProcessandoId(null);
    }
  };

  const concluirAgendamento = async (id: string) => {
    setProcessandoId(id);
    try {
      console.log('Tentando concluir agendamento:', id);
      
      const { data, error } = await supabase
        .from('agendamentos')
        .update({ status: 'concluido' })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Erro SQL:', error);
        throw error;
      }

      console.log('Agendamento concluído com sucesso:', data);
      
      // Atualizar estado local imediatamente
      setAgendamentos(prev => 
        prev.map(ag => 
          ag.id === id ? { ...ag, status: 'concluido' } : ag
        )
      );
      
      // Recarregar para garantir sincronização
      setTimeout(() => {
        buscarAgendamentos();
      }, 1000);
      
    } catch (error: any) {
      console.error('Erro ao concluir agendamento:', error);
      setModalConfig({
        title: "Erro",
        message: `Erro ao concluir: ${error.message}`,
        type: "error",
        onConfirm: undefined,
      });
      setModalAberto(true);
    } finally {
      setProcessandoId(null);
    }
  };

  const apagarAgendamento = async (id: string, clienteNome: string) => {
    setModalConfig({
      title: "Confirmar Exclusão",
      message: `Tem certeza que deseja apagar permanentemente o agendamento de ${clienteNome}? Esta ação não pode ser desfeita.`,
      type: "confirm",
      onConfirm: async () => {
        await executarExclusao(id);
      },
    });
    setModalAberto(true);
  };

  const executarExclusao = async (id: string) => {
    setProcessandoId(id);
    try {
      console.log('Tentando apagar agendamento:', id);
      
      // Deletar forçadamente usando match
      const { data, error } = await supabase
        .from('agendamentos')
        .delete({ count: 'exact' })
        .match({ id: id })
        .select();

      if (error) {
        console.error('Erro SQL:', error);
        throw error;
      }

      console.log('Agendamento apagado com sucesso. Registros afetados:', data?.length || 0);
      
      if (data && data.length > 0) {
        // Remover imediatamente do estado local
        setAgendamentos(prev => prev.filter(ag => ag.id !== id));
      } else {
        console.warn('Nenhum registro foi deletado');
      }
      
      // Recarregar para sincronizar
      await buscarAgendamentos();
      
    } catch (error: any) {
      console.error('Erro ao apagar agendamento:', error);
      setModalConfig({
        title: "Erro",
        message: `Erro ao apagar: ${error.message}`,
        type: "error",
        onConfirm: undefined,
      });
      setModalAberto(true);
      // Tentar recarregar mesmo com erro
      await buscarAgendamentos();
    } finally {
      setProcessandoId(null);
    }
  };

  // Dados de exemplo para fallback
  const agendamentosExemplo = [
    {
      id: "1",
      clienteNome: "João Silva",
      clienteTelefone: "(86) 98765-1234",
      barbeiroNome: "Carlos Silva",
      servicoNome: "Corte Degradê",
      servicoPreco: 25,
      dataHora: new Date(2025, 9, 11, 10, 0),
      status: "confirmado" as const,
    },
    {
      id: "2",
      clienteNome: "Pedro Santos",
      clienteTelefone: "(86) 98765-5678",
      barbeiroNome: "Roberto Santos",
      servicoNome: "Corte + Barba",
      servicoPreco: 40,
      dataHora: new Date(2025, 9, 11, 14, 30),
      status: "pendente" as const,
    },
  ];

  const agendamentosFiltrados = agendamentos.filter((ag) => {
    const clienteNome = ag.clientes?.nome || '';
    const clienteTelefone = ag.clientes?.telefone || '';
    const matchBusca = clienteNome.toLowerCase().includes(termoBusca.toLowerCase()) ||
                       clienteTelefone.includes(termoBusca);
    const matchStatus = filtroStatus === "todos" || ag.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const getStatusColor = (status: string) => {
    const cores = {
      pendente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
      confirmado: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
      concluido: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      cancelado: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
    };
    return cores[status as keyof typeof cores] || cores.pendente;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pendente: "Pendente",
      confirmado: "Confirmado",
      concluido: "Concluído",
      cancelado: "Cancelado",
      nao_compareceu: "Não Compareceu",
    };
    return labels[status as keyof typeof labels] || status;
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Gestão de Agendamentos
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Visualize e gerencie todos os agendamentos
        </p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Hoje</span>
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            {agendamentos.length}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Pendentes</span>
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            {agendamentos.filter(a => a.status === "pendente").length}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Confirmados</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            {agendamentos.filter(a => a.status === "confirmado").length}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Receita Prevista</span>
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            R$ {agendamentos.reduce((sum, a) => sum + (a.servicos?.preco || 0), 0).toFixed(2)}
          </p>
        </motion.div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <TextField.Root
              placeholder="Buscar por nome ou telefone..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
            >
              <TextField.Slot>
                <Search className="w-4 h-4" />
              </TextField.Slot>
            </TextField.Root>
          </div>

          <Select.Root value={filtroStatus} onValueChange={setFiltroStatus}>
            <Select.Trigger className="w-40" placeholder="Status" />
            <Select.Content>
              <Select.Item value="todos">Todos</Select.Item>
              <Select.Item value="pendente">Pendentes</Select.Item>
              <Select.Item value="confirmado">Confirmados</Select.Item>
              <Select.Item value="concluido">Concluídos</Select.Item>
              <Select.Item value="cancelado">Cancelados</Select.Item>
            </Select.Content>
          </Select.Root>

          <Select.Root value={filtroData} onValueChange={setFiltroData}>
            <Select.Trigger className="w-40" placeholder="Período" />
            <Select.Content>
              <Select.Item value="hoje">Hoje</Select.Item>
              <Select.Item value="semana">Esta Semana</Select.Item>
              <Select.Item value="mes">Este Mês</Select.Item>
              <Select.Item value="todos">Todos</Select.Item>
            </Select.Content>
          </Select.Root>
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
              onClick={() => selecionarTodos(agendamentosFiltrados)}
                className="px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors w-full sm:w-auto"
            >
              {agendamentosSelecionados.length === agendamentosFiltrados.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </button>
            {agendamentosSelecionados.length > 0 && (
              <button
                onClick={deletarSelecionados}
                  className="px-3 py-1.5 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Trash2 className="w-4 h-4" />
                Deletar Selecionados
              </button>
            )}
            </div>
          </div>
        )}
      </div>

      {/* Tabela de Agendamentos */}
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              {modoSelecao && (
                <th className="px-6 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={agendamentosSelecionados.length === agendamentosFiltrados.length && agendamentosFiltrados.length > 0}
                    onChange={() => selecionarTodos(agendamentosFiltrados)}
                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 cursor-pointer"
                  />
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                Data/Hora
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                Barbeiro
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                Serviço
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                Valor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {agendamentosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  Nenhum agendamento encontrado
                </td>
              </tr>
            ) : (
                agendamentosFiltrados.map((agendamento) => (
                  <tr key={agendamento.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    {modoSelecao && (
                      <td className="px-6 py-4 w-12">
                        <input
                          type="checkbox"
                          checked={agendamentosSelecionados.includes(agendamento.id)}
                          onChange={() => toggleSelecao(agendamento.id)}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900 dark:text-zinc-100">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-zinc-400" />
                        {format(new Date(agendamento.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {agendamento.clientes?.nome || 'N/A'}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                          <Phone className="w-3 h-3" />
                          {agendamento.clientes?.telefone || 'N/A'}
                          {agendamento.clientes?.telefone && (
                            <a
                              href={`https://wa.me/55${agendamento.clientes.telefone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 transition-colors"
                              title="Enviar WhatsApp"
                            >
                              <WhatsAppIcon size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900 dark:text-zinc-100">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-zinc-400" />
                        {agendamento.barbeiros?.nome || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900 dark:text-zinc-100">
                      {agendamento.servicos?.nome || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      R$ {(agendamento.servicos?.preco || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(agendamento.status)}`}>
                        {getStatusLabel(agendamento.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        {agendamento.status === "pendente" && (
                          <Button 
                            size="1" 
                            variant="soft" 
                            className="cursor-pointer"
                            onClick={() => confirmarAgendamento(agendamento.id)}
                            disabled={processandoId === agendamento.id}
                          >
                            {processandoId === agendamento.id ? 'Confirmando...' : 'Confirmar'}
                          </Button>
                        )}
                        {agendamento.status === "confirmado" && (
                          <Button 
                            size="1" 
                            variant="soft" 
                            color="green" 
                            className="cursor-pointer"
                            onClick={() => concluirAgendamento(agendamento.id)}
                            disabled={processandoId === agendamento.id}
                          >
                            {processandoId === agendamento.id ? 'Concluindo...' : 'Concluir'}
                          </Button>
                        )}
                        
                        {/* Botões WhatsApp */}
                        {(agendamento.status === "pendente" || agendamento.status === "confirmado") && agendamento.clientes?.telefone && (
                          <>
                            <Button 
                              size="1" 
                              variant="soft" 
                              color="blue"
                              className="cursor-pointer"
                              onClick={() => enviarLembrete(agendamento)}
                              disabled={processandoId === agendamento.id}
                              title="Enviar Lembrete"
                            >
                              <Bell className="w-3 h-3" />
                            </Button>
                            <Button 
                              size="1" 
                              variant="soft" 
                              color="green"
                              className="cursor-pointer"
                              onClick={() => abrirModalMensagem(agendamento)}
                              disabled={processandoId === agendamento.id}
                              title="Enviar Mensagem"
                            >
                              <MessageCircle className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                        
                        {/* Botão de apagar - sempre visível */}
                        <Button 
                          size="1" 
                          variant="soft" 
                          color="red" 
                          className="cursor-pointer"
                          onClick={() => apagarAgendamento(agendamento.id, agendamento.clientes?.nome || 'Cliente')}
                          disabled={processandoId === agendamento.id}
                        >
                          {processandoId === agendamento.id ? (
                            'Apagando...'
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Mensagem Customizada */}
      <Dialog.Root open={modalMensagem} onOpenChange={setModalMensagem}>
        <Dialog.Content style={{ maxWidth: 500 }}>
          <Dialog.Title>Enviar Mensagem via WhatsApp</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Enviar mensagem para {agendamentoSelecionado?.clientes?.nome}
          </Dialog.Description>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Telefone
              </label>
              <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <Phone className="w-4 h-4" />
                {agendamentoSelecionado?.clientes?.telefone}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Mensagem *
              </label>
              <TextArea
                value={mensagemCustom}
                onChange={(e) => setMensagemCustom(e.target.value)}
                placeholder="Digite sua mensagem aqui..."
                rows={6}
                className="w-full"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {mensagemCustom.length} caracteres
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                💡 <strong>Dica:</strong> A mensagem será enviada imediatamente via WhatsApp
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              onClick={enviarMensagemCustom}
              disabled={!mensagemCustom.trim() || processandoId === agendamentoSelecionado?.id}
              className="flex-1 cursor-pointer"
            >
              {processandoId === agendamentoSelecionado?.id ? 'Enviando...' : '📤 Enviar Mensagem'}
            </Button>
            <Button
              variant="soft"
              onClick={() => setModalMensagem(false)}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      {/* Modal Customizado */}
      <Modal
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
      />
    </div>
  );
}
