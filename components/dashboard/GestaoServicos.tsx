"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, Edit2, Save, X, DollarSign, Clock, TrendingUp, TrendingDown, Plus, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button, TextField, TextArea } from "@radix-ui/themes";
import { useToast } from "@/hooks/useToast";
import { useTerminologia } from "@/hooks/useTerminologia";
import { ModalPortal } from "@/components/ui/modal-portal";

interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao: number;
  descricao: string | null;
  preco_anterior: number | null;
  data_alteracao_preco: string | null;
  ativo: boolean;
  categoria?: string;
  ordem_exibicao?: number;
}

interface NovoServicoForm {
  nome: string;
  descricao: string;
  preco: string;
  duracao: string;
  categoria: string;
}

/**
 * Componente de Gestão de Serviços
 * Permite criar, editar e gerenciar serviços
 */
export function GestaoServicos() {
  const { tenant } = useAuth();
  const { estabelecimento, terminologia } = useTerminologia();
  const preposicaoEstabelecimento = terminologia.estabelecimento.artigo === "a" ? "da" : "do";
  const { toast } = useToast();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [valores, setValores] = useState<{ [key: string]: Partial<Servico> }>({});
  const [salvando, setSalvando] = useState(false);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [novoServico, setNovoServico] = useState<NovoServicoForm>({
    nome: "",
    descricao: "",
    preco: "",
    duracao: "30",
    categoria: "geral",
  });
  const [servicoParaExcluir, setServicoParaExcluir] = useState<Servico | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const buscarServicos = useCallback(async () => {
    if (!tenant?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("servicos")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("nome");

      if (error) throw error;
      setServicos(data || []);
    } catch (error) {
      toast({ tipo: "erro", mensagem: "Erro ao buscar serviços" });
    } finally {
      setCarregando(false);
    }
  }, [tenant?.id, toast]);

  useEffect(() => {
    buscarServicos();
  }, [buscarServicos]);

  const iniciarEdicao = (servico: Servico) => {
    setEditando(servico.id);
    setValores({
      ...valores,
      [servico.id]: {
        nome: servico.nome,
        preco: servico.preco,
        duracao: servico.duracao,
        descricao: servico.descricao,
      },
    });
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setValores({});
  };

  const salvarServico = async (servicoId: string) => {
    setSalvando(true);
    try {
      const servicoAtual = servicos.find((s) => s.id === servicoId);
      const novosValores = valores[servicoId];

      if (!servicoAtual || !novosValores) return;

      // Preparar dados para atualização
      const dadosAtualizacao: any = {
        nome: novosValores.nome,
        preco: novosValores.preco,
        duracao: novosValores.duracao,
        descricao: novosValores.descricao,
      };

      // Se o preço mudou, salvar o anterior
      if (novosValores.preco !== servicoAtual.preco) {
        dadosAtualizacao.preco_anterior = servicoAtual.preco;
        dadosAtualizacao.data_alteracao_preco = new Date().toISOString();
        dadosAtualizacao.alterado_por = localStorage.getItem("admin_email") || "admin";
      }

      const { error } = await supabase
        .from("servicos")
        .update(dadosAtualizacao)
        .eq("id", servicoId)
        .eq("tenant_id", tenant?.id);

      if (error) throw error;

      await buscarServicos();
      setEditando(null);
      setValores({});

      toast({ tipo: "sucesso", mensagem: "Serviço atualizado com sucesso!" });
    } catch (error) {
      toast({ tipo: "erro", mensagem: "Erro ao salvar serviço" });
    } finally {
      setSalvando(false);
    }
  };

  const calcularVariacao = (servico: Servico) => {
    if (!servico.preco_anterior) return null;
    const variacao = ((servico.preco - servico.preco_anterior) / servico.preco_anterior) * 100;
    return variacao;
  };

  const excluirServico = async () => {
    if (!servicoParaExcluir || !tenant?.id) return;

    setExcluindo(true);
    try {
      // Verificar se existem agendamentos vinculados a este serviço
      const { data: agendamentosVinculados, error: erroConsulta } = await supabase
        .from("agendamentos")
        .select("id")
        .eq("servico_id", servicoParaExcluir.id)
        .eq("tenant_id", tenant.id)
        .limit(1);

      if (erroConsulta) throw erroConsulta;

      if (agendamentosVinculados && agendamentosVinculados.length > 0) {
        toast({ 
          tipo: "erro", 
          mensagem: "Não é possível excluir: existem agendamentos vinculados a este serviço" 
        });
        setServicoParaExcluir(null);
        return;
      }

      const { error } = await supabase
        .from("servicos")
        .delete()
        .eq("id", servicoParaExcluir.id)
        .eq("tenant_id", tenant.id);

      if (error) throw error;

      await buscarServicos();
      setServicoParaExcluir(null);
      toast({ tipo: "sucesso", mensagem: "Serviço excluído com sucesso!" });
    } catch (error) {
      console.error("Erro ao excluir serviço:", error);
      toast({ tipo: "erro", mensagem: "Erro ao excluir serviço" });
    } finally {
      setExcluindo(false);
    }
  };

  const criarNovoServico = async () => {
    if (!tenant?.id) {
      toast({ tipo: "erro", mensagem: "Erro: tenant não encontrado" });
      return;
    }

    if (!novoServico.nome.trim()) {
      toast({ tipo: "erro", mensagem: "Nome do serviço é obrigatório" });
      return;
    }

    const precoNumerico = parseFloat(novoServico.preco.replace(',', '.')) || 0;
    const duracaoNumerica = parseInt(novoServico.duracao) || 0;

    if (precoNumerico <= 0) {
      toast({ tipo: "erro", mensagem: "Preço deve ser maior que zero" });
      return;
    }

    if (duracaoNumerica <= 0) {
      toast({ tipo: "erro", mensagem: "Duração deve ser maior que zero" });
      return;
    }

    setSalvando(true);
    try {
      const { data: servicosExistentes } = await supabase
        .from("servicos")
        .select("ordem_exibicao")
        .eq("tenant_id", tenant.id)
        .order("ordem_exibicao", { ascending: false })
        .limit(1);

      const proximaOrdem = servicosExistentes && servicosExistentes.length > 0 
        ? (servicosExistentes[0].ordem_exibicao || 0) + 1 
        : 1;

      const { error } = await supabase
        .from("servicos")
        .insert([{
          tenant_id: tenant.id,
          nome: novoServico.nome.trim(),
          descricao: novoServico.descricao.trim() || novoServico.nome.trim(),
          preco: precoNumerico,
          duracao: duracaoNumerica,
          categoria: novoServico.categoria,
          ordem_exibicao: proximaOrdem,
          ativo: true,
        }])
        .select()
        .single();

      if (error) throw error;

      await buscarServicos();

      setNovoServico({
        nome: "",
        descricao: "",
        preco: "",
        duracao: "30",
        categoria: "geral",
      });
      setModalNovoAberto(false);

      toast({ tipo: "sucesso", mensagem: "Serviço criado com sucesso!" });
    } catch (error) {
      toast({ tipo: "erro", mensagem: "Erro ao criar serviço" });
    } finally {
      setSalvando(false);
    }
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Gestão de Serviços
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Crie e edite serviços {preposicaoEstabelecimento} {estabelecimento().toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Scissors className="w-4 h-4" />
            <span>{servicos.length} serviços</span>
          </div>
          <Button
            onClick={() => setModalNovoAberto(true)}
            className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Serviço
          </Button>
        </div>
      </div>

      {/* Modal de Novo Serviço */}
      <ModalPortal aberto={modalNovoAberto} onFechar={() => setModalNovoAberto(false)}>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-900 p-6">
            <button
              onClick={() => setModalNovoAberto(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <Scissors className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Novo Serviço</h2>
                <p className="text-sm text-white/60">
                  Adicione um serviço {preposicaoEstabelecimento} {estabelecimento().toLowerCase()}
                </p>
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="p-6 space-y-5">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Nome do Serviço <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={novoServico.nome}
                onChange={(e) => setNovoServico({ ...novoServico, nome: e.target.value })}
                placeholder="Ex: Corte Degradê"
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Descrição <span className="text-zinc-400 font-normal">(opcional)</span>
              </label>
              <textarea
                value={novoServico.descricao}
                onChange={(e) => setNovoServico({ ...novoServico, descricao: e.target.value })}
                placeholder="Descreva o serviço para seus clientes..."
                rows={3}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all resize-none"
              />
            </div>

            {/* Preço e Duração */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Preço <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={novoServico.preco}
                    onChange={(e) => {
                      const valor = e.target.value.replace(/[^0-9.,]/g, '');
                      setNovoServico({ ...novoServico, preco: valor });
                    }}
                    placeholder="0,00"
                    className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Duração <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={novoServico.duracao}
                    onChange={(e) => {
                      const valor = e.target.value.replace(/[^0-9]/g, '');
                      setNovoServico({ ...novoServico, duracao: valor });
                    }}
                    placeholder="30"
                    className="w-full pl-12 pr-12 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">min</span>
                </div>
              </div>
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Categoria
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { valor: 'geral', label: 'Geral', emoji: '✂️' },
                  { valor: 'popular', label: 'Popular', emoji: '⭐' },
                  { valor: 'premium', label: 'Premium', emoji: '👑' },
                  { valor: 'outros', label: 'Outros', emoji: '📦' },
                ].map((cat) => (
                  <button
                    key={cat.valor}
                    type="button"
                    onClick={() => setNovoServico({ ...novoServico, categoria: cat.valor })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      novoServico.categoria === cat.valor
                        ? 'border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <span className="text-lg">{cat.emoji}</span>
                    <span className="text-xs font-medium">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 pt-0">
            <button
              onClick={() => setModalNovoAberto(false)}
              className="flex-1 px-4 py-3 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={criarNovoServico}
              disabled={salvando || !novoServico.nome.trim()}
              className="flex-1 px-4 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {salvando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Criar Serviço
                </>
              )}
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* Modal de Confirmação de Exclusão */}
      <ModalPortal aberto={!!servicoParaExcluir} onFechar={() => setServicoParaExcluir(null)}>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-red-600 to-red-500 p-6">
            <button
              onClick={() => setServicoParaExcluir(null)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Excluir Serviço</h2>
                <p className="text-sm text-white/60">Esta ação não pode ser desfeita</p>
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="p-6">
            <p className="text-zinc-700 dark:text-zinc-300 mb-2">
              Tem certeza que deseja excluir o serviço:
            </p>
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-4 mb-6">
              <p className="font-semibold text-zinc-900 dark:text-white text-lg">
                {servicoParaExcluir?.nome}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                R$ {servicoParaExcluir?.preco.toFixed(2)} • {servicoParaExcluir?.duracao} min
              </p>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              ⚠️ Se houver agendamentos vinculados a este serviço, a exclusão será bloqueada.
            </p>
          </div>

          {/* Ações */}
          <div className="flex gap-3 p-6 pt-0">
            <button
              onClick={() => setServicoParaExcluir(null)}
              disabled={excluindo}
              className="flex-1 py-3 px-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={excluirServico}
              disabled={excluindo}
              className="flex-1 py-3 px-4 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {excluindo ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </>
              )}
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* Lista de Serviços */}
      <div className="grid gap-4">
        <AnimatePresence>
          {servicos.map((servico) => {
            const estaEditando = editando === servico.id;
            const valoresEdicao = valores[servico.id] || servico;
            const variacao = calcularVariacao(servico);

            return (
              <motion.div
                key={servico.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6"
              >
                {estaEditando ? (
                  // Modo de Edição
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          Nome do Serviço
                        </label>
                        <input
                          type="text"
                          value={valoresEdicao.nome || ''}
                          onChange={(e) =>
                            setValores({
                              ...valores,
                              [servico.id]: { ...valoresEdicao, nome: e.target.value },
                            })
                          }
                          placeholder="Nome do serviço"
                          className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          Preço (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={valoresEdicao.preco || ''}
                          onChange={(e) => {
                            const valor = e.target.value;
                            setValores({
                              ...valores,
                              [servico.id]: {
                                ...valoresEdicao,
                                preco: valor === '' ? 0 : parseFloat(valor),
                              },
                            });
                          }}
                          className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          Duração (minutos)
                        </label>
                        <input
                          type="number"
                          value={valoresEdicao.duracao || ''}
                          onChange={(e) => {
                            const valor = e.target.value;
                            setValores({
                              ...valores,
                              [servico.id]: {
                                ...valoresEdicao,
                                duracao: valor === '' ? 0 : parseInt(valor),
                              },
                            });
                          }}
                          className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={cancelarEdicao}
                        variant="soft"
                        className="cursor-pointer"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => salvarServico(servico.id)}
                        disabled={salvando}
                        className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 cursor-pointer"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {salvando ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Modo de Visualização
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                          {servico.nome}
                        </h3>
                        {variacao !== null && (
                          <span
                            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                              variacao > 0
                                ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                            }`}
                          >
                            {variacao > 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {Math.abs(variacao).toFixed(1)}%
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-semibold text-zinc-900 dark:text-white">
                            R$ {servico.preco.toFixed(2)}
                          </span>
                          {servico.preco_anterior && (
                            <span className="line-through text-xs">
                              R$ {servico.preco_anterior.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{servico.duracao} min</span>
                        </div>
                      </div>

                      {servico.data_alteracao_preco && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
                          Última alteração:{" "}
                          {new Date(servico.data_alteracao_preco).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => iniciarEdicao(servico)}
                        variant="soft"
                        className="cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        onClick={() => setServicoParaExcluir(servico)}
                        variant="soft"
                        color="red"
                        className="cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
