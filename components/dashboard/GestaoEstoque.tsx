"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Plus, AlertTriangle, TrendingDown, TrendingUp, Trash2, CheckCircle, XCircle, AlertCircle, X } from "lucide-react";
import { Button, TextField, TextArea } from "@radix-ui/themes";
import { supabase } from "@/lib/supabase";
import { ModalPortal } from "@/components/ui/modal-portal";
import type { Produto } from "@/types";

interface NovoProdutoForm {
  nome: string;
  descricao: string;
  categoria: string;
  quantidadeEstoque: number;
  quantidadeMinima: number;
  precoCompra: number;
  precoVenda: number;
  fornecedor: string;
}

interface ModalFeedback {
  aberto: boolean;
  tipo: 'sucesso' | 'erro' | 'confirmacao';
  titulo: string;
  mensagem: string;
  onConfirmar?: () => void;
}

/**
 * Componente de Gestão de Estoque
 * Controle completo de produtos e movimentações
 */
export function GestaoEstoque() {
  const [modalAberto, setModalAberto] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [produtoParaDeletar, setProdutoParaDeletar] = useState<string | null>(null);
  const [modalFeedback, setModalFeedback] = useState<ModalFeedback>({
    aberto: false,
    tipo: 'sucesso',
    titulo: '',
    mensagem: '',
  });
  const [novoProduto, setNovoProduto] = useState<NovoProdutoForm>({
    nome: "",
    descricao: "",
    categoria: "pomada",
    quantidadeEstoque: 0,
    quantidadeMinima: 5,
    precoCompra: 0,
    precoVenda: 0,
    fornecedor: "",
  });

  useEffect(() => {
    buscarProdutos();
  }, []);

  const buscarProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      
      // Mapear snake_case do banco para camelCase do TypeScript
      const produtosMapeados = (data || []).map((p: any) => ({
        id: p.id,
        nome: p.nome,
        descricao: p.descricao,
        categoria: p.categoria,
        quantidadeEstoque: p.quantidade_estoque,
        quantidadeMinima: p.quantidade_minima,
        precoCompra: p.preco_compra,
        precoVenda: p.preco_venda,
        fornecedor: p.fornecedor,
        ativo: p.ativo,
        criadoEm: p.criado_em,
        atualizadoEm: p.atualizado_em,
      }));
      
      setProdutos(produtosMapeados);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
    } finally {
      setCarregando(false);
    }
  };

  const mostrarFeedback = (tipo: 'sucesso' | 'erro', titulo: string, mensagem: string) => {
    setModalFeedback({
      aberto: true,
      tipo,
      titulo,
      mensagem,
    });
  };

  const criarProduto = async () => {
    if (!novoProduto.nome.trim()) {
      mostrarFeedback('erro', 'Campo obrigatório', 'Nome do produto é obrigatório');
      return;
    }

    if (novoProduto.precoCompra <= 0 || novoProduto.precoVenda <= 0) {
      mostrarFeedback('erro', 'Valores inválidos', 'Preços devem ser maiores que zero');
      return;
    }

    if (novoProduto.precoVenda <= novoProduto.precoCompra) {
      mostrarFeedback('erro', 'Margem inválida', 'Preço de venda deve ser maior que o preço de compra');
      return;
    }

    setSalvando(true);
    try {
      const { data, error } = await supabase
        .from("produtos")
        .insert([{
          nome: novoProduto.nome.trim(),
          descricao: novoProduto.descricao.trim() || null,
          categoria: novoProduto.categoria,
          quantidade_estoque: novoProduto.quantidadeEstoque,
          quantidade_minima: novoProduto.quantidadeMinima,
          preco_compra: novoProduto.precoCompra,
          preco_venda: novoProduto.precoVenda,
          fornecedor: novoProduto.fornecedor.trim() || null,
          ativo: true,
        }])
        .select()
        .single();

      if (error) throw error;

      await buscarProdutos();
      
      setNovoProduto({
        nome: "",
        descricao: "",
        categoria: "pomada",
        quantidadeEstoque: 0,
        quantidadeMinima: 5,
        precoCompra: 0,
        precoVenda: 0,
        fornecedor: "",
      });
      
      setModalAberto(false);
      mostrarFeedback('sucesso', 'Produto cadastrado', 'Produto criado com sucesso!');
    } catch (error: any) {
      console.error("Erro ao criar produto:", error);
      mostrarFeedback('erro', 'Erro ao criar produto', error.message || 'Erro desconhecido');
    } finally {
      setSalvando(false);
    }
  };

  const confirmarDelecao = (produtoId: string, produtoNome: string) => {
    setModalFeedback({
      aberto: true,
      tipo: 'confirmacao',
      titulo: 'Confirmar exclusão',
      mensagem: `Tem certeza que deseja excluir o produto "${produtoNome}"?`,
      onConfirmar: () => deletarProduto(produtoId),
    });
  };

  const deletarProduto = async (produtoId: string) => {
    setSalvando(true);
    try {
      const { error } = await supabase
        .from("produtos")
        .update({ ativo: false })
        .eq("id", produtoId);

      if (error) throw error;

      await buscarProdutos();
      setModalFeedback({ aberto: false, tipo: 'sucesso', titulo: '', mensagem: '' });
      mostrarFeedback('sucesso', 'Produto removido', 'Produto excluído com sucesso!');
    } catch (error: any) {
      console.error("Erro ao deletar produto:", error);
      mostrarFeedback('erro', 'Erro ao excluir', error.message || 'Erro desconhecido');
    } finally {
      setSalvando(false);
    }
  };

  const produtosEstoqueBaixo = produtos.filter(
    p => (p.quantidadeEstoque || 0) <= (p.quantidadeMinima || 0)
  );

  const valorTotalEstoque = produtos.reduce(
    (total, p) => total + ((p.precoVenda || 0) * (p.quantidadeEstoque || 0)), 
    0
  );

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
            Gestão de Estoque
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Controle de produtos e movimentações
          </p>
        </div>
        <Button
          onClick={() => setModalAberto(true)}
          className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {/* Modal de Novo Produto */}
      <ModalPortal aberto={modalAberto} onFechar={() => setModalAberto(false)}>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-xl shadow-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Cadastrar Novo Produto</h2>
            <button onClick={() => setModalAberto(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            Preencha as informações do produto para estoque
          </p>

          <div className="space-y-4">
            {/* Nome e Categoria */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Nome do Produto <span className="text-red-500">*</span>
                </label>
                <TextField.Root
                  value={novoProduto.nome}
                  onChange={(e) => setNovoProduto({ ...novoProduto, nome: e.target.value })}
                  placeholder="Ex: Pomada Modeladora"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Categoria <span className="text-red-500">*</span>
                </label>
                <select
                  value={novoProduto.categoria}
                  onChange={(e) => setNovoProduto({ ...novoProduto, categoria: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                >
                  <option value="pomada">Pomada</option>
                  <option value="shampoo">Shampoo</option>
                  <option value="condicionador">Condicionador</option>
                  <option value="cera">Cera</option>
                  <option value="gel">Gel</option>
                  <option value="oleo">Óleo</option>
                  <option value="navalhete">Navalhete</option>
                  <option value="tesoura">Tesoura</option>
                  <option value="maquina">Máquina</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Descrição
              </label>
              <TextArea
                value={novoProduto.descricao}
                onChange={(e) => setNovoProduto({ ...novoProduto, descricao: e.target.value })}
                placeholder="Descreva o produto..."
                rows={2}
              />
            </div>

            {/* Fornecedor */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Fornecedor
              </label>
              <TextField.Root
                value={novoProduto.fornecedor}
                onChange={(e) => setNovoProduto({ ...novoProduto, fornecedor: e.target.value })}
                placeholder="Nome do fornecedor"
              />
            </div>

            {/* Preços */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Preço de Compra (R$) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={novoProduto.precoCompra || ''}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setNovoProduto({ ...novoProduto, precoCompra: valor === '' ? 0 : parseFloat(valor) });
                  }}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Preço de Venda (R$) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={novoProduto.precoVenda || ''}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setNovoProduto({ ...novoProduto, precoVenda: valor === '' ? 0 : parseFloat(valor) });
                  }}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                />
              </div>
            </div>

            {/* Quantidades */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Quantidade Inicial
                </label>
                <input
                  type="number"
                  min="0"
                  value={novoProduto.quantidadeEstoque || ''}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setNovoProduto({ ...novoProduto, quantidadeEstoque: valor === '' ? 0 : parseInt(valor) });
                  }}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Quantidade Mínima
                </label>
                <input
                  type="number"
                  min="1"
                  value={novoProduto.quantidadeMinima || ''}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setNovoProduto({ ...novoProduto, quantidadeMinima: valor === '' ? 5 : parseInt(valor) });
                  }}
                  placeholder="5"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                />
              </div>
            </div>

            {/* Margem de Lucro */}
            {novoProduto.precoCompra > 0 && novoProduto.precoVenda > 0 && (
              <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Margem de Lucro: {' '}
                  <span className={`font-semibold ${
                    novoProduto.precoVenda > novoProduto.precoCompra 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {(((novoProduto.precoVenda - novoProduto.precoCompra) / novoProduto.precoCompra) * 100).toFixed(1)}%
                  </span>
                  {' '}(R$ {(novoProduto.precoVenda - novoProduto.precoCompra).toFixed(2)})
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6 justify-end">
            <button onClick={() => setModalAberto(false)} className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
              Cancelar
            </button>
            <button
              onClick={criarProduto}
              disabled={salvando}
              className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {salvando ? "Cadastrando..." : "Cadastrar Produto"}
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Total de Produtos</span>
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            {produtos.length}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Estoque Baixo</span>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            {produtosEstoqueBaixo.length}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Valor em Estoque</span>
            <Package className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            R$ {valorTotalEstoque.toFixed(2)}
          </p>
        </motion.div>
      </div>

      {/* Lista de Produtos - Layout Responsivo */}
      {produtos.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <p className="text-zinc-500 dark:text-zinc-400">
            Nenhum produto cadastrado
          </p>
        </div>
      ) : (
        <>
          {/* Versão Mobile - Cards */}
          <div className="block md:hidden space-y-4">
            {produtos.map((produto) => (
              <motion.div
                key={produto.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4"
              >
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-white">{produto.nome}</h3>
                    {produto.descricao && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{produto.descricao}</p>
                    )}
                    <span className="inline-block mt-2 px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400">
                      {produto.categoria}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Estoque:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`font-medium ${
                          (produto.quantidadeEstoque || 0) <= (produto.quantidadeMinima || 0)
                            ? 'text-red-600'
                            : 'text-zinc-900 dark:text-zinc-100'
                        }`}>
                          {produto.quantidadeEstoque || 0}
                        </span>
                        {(produto.quantidadeEstoque || 0) <= (produto.quantidadeMinima || 0) && (
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Preço Venda:</span>
                      <p className="font-medium text-zinc-900 dark:text-white mt-1">R$ {(produto.precoVenda || 0).toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Preço Compra:</span>
                    <p className="text-sm text-zinc-900 dark:text-white">R$ {(produto.precoCompra || 0).toFixed(2)}</p>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="2" 
                      variant="soft" 
                      className="flex-1 cursor-pointer"
                      title="Entrada de estoque"
                    >
                      <TrendingUp className="w-4 h-4 mr-1" />
                      Entrada
                    </Button>
                    <Button 
                      size="2" 
                      variant="soft" 
                      color="gray" 
                      className="flex-1 cursor-pointer"
                      title="Saída de estoque"
                    >
                      <TrendingDown className="w-4 h-4 mr-1" />
                      Saída
                    </Button>
                    <Button 
                      size="2" 
                      variant="soft" 
                      color="red" 
                      className="cursor-pointer"
                      onClick={() => confirmarDelecao(produto.id, produto.nome)}
                      title="Excluir produto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Versão Desktop - Tabela */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
              <table className="w-full min-w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800">
              <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Produto
                </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Categoria
                </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Estoque
                </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Preço Compra
                </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Preço Venda
                </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {produtos.map((produto) => (
                  <tr key={produto.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                      <td className="px-4 lg:px-6 py-4 text-sm text-zinc-900 dark:text-zinc-100">
                      <div>
                        <div className="font-medium">{produto.nome}</div>
                        {produto.descricao && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {produto.descricao}
                          </div>
                        )}
                      </div>
                    </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-zinc-900 dark:text-zinc-100">
                      {produto.categoria}
                    </td>
                      <td className="px-4 lg:px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${
                          (produto.quantidadeEstoque || 0) <= (produto.quantidadeMinima || 0)
                            ? 'text-red-600'
                            : 'text-zinc-900 dark:text-zinc-100'
                        }`}>
                          {produto.quantidadeEstoque || 0}
                        </span>
                        {(produto.quantidadeEstoque || 0) <= (produto.quantidadeMinima || 0) && (
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                    </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-zinc-900 dark:text-zinc-100">
                      R$ {(produto.precoCompra || 0).toFixed(2)}
                    </td>
                      <td className="px-4 lg:px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      R$ {(produto.precoVenda || 0).toFixed(2)}
                    </td>
                      <td className="px-4 lg:px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <Button 
                          size="1" 
                          variant="soft" 
                          className="cursor-pointer"
                          title="Entrada de estoque"
                        >
                          <TrendingUp className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="1" 
                          variant="soft" 
                          color="gray" 
                          className="cursor-pointer"
                          title="Saída de estoque"
                        >
                          <TrendingDown className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="1" 
                          variant="soft" 
                          color="red" 
                          className="cursor-pointer"
                          onClick={() => confirmarDelecao(produto.id, produto.nome)}
                          title="Excluir produto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* Modal de Feedback */}
      <ModalPortal aberto={modalFeedback.aberto} onFechar={() => setModalFeedback({ ...modalFeedback, aberto: false })}>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden w-full max-w-md shadow-2xl border border-zinc-200 dark:border-zinc-800">
          <div className={`p-6 ${
            modalFeedback.tipo === 'sucesso' 
              ? 'bg-green-50 dark:bg-green-900/10' 
              : modalFeedback.tipo === 'erro'
              ? 'bg-red-50 dark:bg-red-900/10'
              : 'bg-zinc-50 dark:bg-zinc-900/10'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-full ${
                modalFeedback.tipo === 'sucesso' 
                  ? 'bg-green-100 dark:bg-green-900/30' 
                  : modalFeedback.tipo === 'erro'
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-zinc-100 dark:bg-zinc-800'
              }`}>
                {modalFeedback.tipo === 'sucesso' && (
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                )}
                {modalFeedback.tipo === 'erro' && (
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                )}
                {modalFeedback.tipo === 'confirmacao' && (
                  <AlertCircle className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                )}
              </div>
              
              <div className="flex-1">
                <h3 className={`text-lg font-semibold mb-2 ${
                  modalFeedback.tipo === 'sucesso' 
                    ? 'text-green-900 dark:text-green-100' 
                    : modalFeedback.tipo === 'erro'
                    ? 'text-red-900 dark:text-red-100'
                    : 'text-zinc-900 dark:text-zinc-100'
                }`}>
                  {modalFeedback.titulo}
                </h3>
                <p className={`${
                  modalFeedback.tipo === 'sucesso' 
                    ? 'text-green-700 dark:text-green-300' 
                    : modalFeedback.tipo === 'erro'
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-zinc-700 dark:text-zinc-300'
                }`}>
                  {modalFeedback.mensagem}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-zinc-900 flex gap-3 justify-end">
            {modalFeedback.tipo === 'confirmacao' ? (
              <>
                <button
                  onClick={() => setModalFeedback({ ...modalFeedback, aberto: false })}
                  className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => modalFeedback.onConfirmar?.()}
                  disabled={salvando}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {salvando ? 'Excluindo...' : 'Confirmar Exclusão'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setModalFeedback({ ...modalFeedback, aberto: false })}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  modalFeedback.tipo === 'sucesso'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                Entendi
              </button>
            )}
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
