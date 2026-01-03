"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, Edit2, Save, X, DollarSign, Clock, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button, TextField, TextArea, Dialog } from "@radix-ui/themes";
import { useToast } from "@/hooks/useToast";

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
  preco: number;
  duracao: number;
  categoria: string;
}

/**
 * Componente de Gestão de Serviços
 * Permite criar, editar e gerenciar serviços
 */
export function GestaoServicos() {
  const { tenant } = useAuth();
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
    preco: 0,
    duracao: 30,
    categoria: "geral",
  });

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

  const criarNovoServico = async () => {
    if (!tenant?.id) {
      toast({ tipo: "erro", mensagem: "Erro: tenant não encontrado" });
      return;
    }

    if (!novoServico.nome.trim()) {
      toast({ tipo: "erro", mensagem: "Nome do serviço é obrigatório" });
      return;
    }

    if (novoServico.preco <= 0) {
      toast({ tipo: "erro", mensagem: "Preço deve ser maior que zero" });
      return;
    }

    if (novoServico.duracao <= 0) {
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
          preco: novoServico.preco,
          duracao: novoServico.duracao,
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
        preco: 0,
        duracao: 30,
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
            Crie e edite serviços da barbearia
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
      <Dialog.Root open={modalNovoAberto} onOpenChange={setModalNovoAberto}>
        <Dialog.Content style={{ maxWidth: 500 }}>
          <Dialog.Title>Criar Novo Serviço</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Preencha as informações do novo serviço
          </Dialog.Description>

          <div className="space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Nome do Serviço <span className="text-red-500">*</span>
              </label>
              <TextField.Root
                value={novoServico.nome}
                onChange={(e) => setNovoServico({ ...novoServico, nome: e.target.value })}
                placeholder="Ex: Corte Degradê"
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Descrição
              </label>
              <TextArea
                value={novoServico.descricao}
                onChange={(e) => setNovoServico({ ...novoServico, descricao: e.target.value })}
                placeholder="Descreva o serviço..."
                rows={3}
              />
            </div>

            {/* Preço e Duração */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Preço (R$) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <TextField.Root
                    type="number"
                    step="0.01"
                    min="0"
                    value={novoServico.preco}
                    onChange={(e) => setNovoServico({ ...novoServico, preco: parseFloat(e.target.value) || 0 })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Duração (min) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <TextField.Root
                    type="number"
                    min="1"
                    value={novoServico.duracao}
                    onChange={(e) => setNovoServico({ ...novoServico, duracao: parseInt(e.target.value) || 30 })}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Categoria
              </label>
              <select
                value={novoServico.categoria}
                onChange={(e) => setNovoServico({ ...novoServico, categoria: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
              >
                <option value="geral">Geral</option>
                <option value="popular">Popular</option>
                <option value="premium">Premium</option>
                <option value="outros">Outros</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6 justify-end">
            <Dialog.Close>
              <Button variant="soft" className="cursor-pointer">
                Cancelar
              </Button>
            </Dialog.Close>
            <Button
              onClick={criarNovoServico}
              disabled={salvando}
              className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 cursor-pointer"
            >
              {salvando ? "Criando..." : "Criar Serviço"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>

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
                        <TextField.Root
                          value={valoresEdicao.nome}
                          onChange={(e) =>
                            setValores({
                              ...valores,
                              [servico.id]: { ...valoresEdicao, nome: e.target.value },
                            })
                          }
                          placeholder="Nome do serviço"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          Preço (R$)
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <TextField.Root
                            type="number"
                            step="0.01"
                            value={valoresEdicao.preco}
                            onChange={(e) =>
                              setValores({
                                ...valores,
                                [servico.id]: {
                                  ...valoresEdicao,
                                  preco: parseFloat(e.target.value),
                                },
                              })
                            }
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          Duração (minutos)
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <TextField.Root
                            type="number"
                            value={valoresEdicao.duracao}
                            onChange={(e) =>
                              setValores({
                                ...valores,
                                [servico.id]: {
                                  ...valoresEdicao,
                                  duracao: parseInt(e.target.value),
                                },
                              })
                            }
                            className="pl-10"
                          />
                        </div>
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

                    <Button
                      onClick={() => iniciarEdicao(servico)}
                      variant="soft"
                      className="cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
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
