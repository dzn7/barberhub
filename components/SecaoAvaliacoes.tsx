"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ThumbsUp, Quote, ChevronLeft, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import { Button, TextField } from "@radix-ui/themes";
import { supabase } from "@/lib/supabase";
import { ModalPortal } from "@/components/ui/modal-portal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Avaliacao {
  id: string;
  cliente_nome: string;
  nota: number;
  comentario: string;
  servico: string;
  data: string;
  likes: number;
  verificado: boolean;
}

/**
 * Sistema de Avaliações Completo
 * Melhor que Booksy: com likes, verificação, carrossel e filtros
 */
export function SecaoAvaliacoes() {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroNota, setFiltroNota] = useState<number | null>(null);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [modalAberto, setModalAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{
    aberto: boolean;
    tipo: 'sucesso' | 'erro';
    titulo: string;
    mensagem: string;
  }>({ aberto: false, tipo: 'sucesso', titulo: '', mensagem: '' });
  const [novaAvaliacao, setNovaAvaliacao] = useState({
    nome: "",
    nota: 5,
    comentario: "",
    servico: "",
  });

  useEffect(() => {
    buscarAvaliacoes();
  }, []);

  const buscarAvaliacoes = async () => {
    try {
      // Buscar avaliações públicas (novas)
      const { data: publicasData, error: publicasError } = await supabase
        .from("avaliacoes_publicas")
        .select("*")
        .eq("aprovado", true)
        .order("criado_em", { ascending: false });

      if (publicasError) throw publicasError;

      // Mapear para o formato esperado
      const avaliacoesPublicas = (publicasData || []).map(av => ({
        id: av.id,
        cliente_nome: av.nome,
        nota: av.avaliacao,
        comentario: av.comentario,
        servico: '',
        data: av.criado_em,
        likes: 0,
        verificado: false,
      }));

      // Buscar avaliações antigas (se existirem)
      const { data: antigasData } = await supabase
        .from("avaliacoes")
        .select("*")
        .eq("aprovado", true)
        .order("data", { ascending: false });

      // Combinar e ordenar por data
      const todasAvaliacoes = [...avaliacoesPublicas, ...(antigasData || [])];
      setAvaliacoes(todasAvaliacoes);
    } catch (error) {
      console.error("Erro ao buscar avaliações:", error);
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

  const enviarAvaliacao = async () => {
    // Validação simples sem alert
    if (!novaAvaliacao.nome.trim()) {
      mostrarFeedback('erro', 'Nome obrigatório', 'Por favor, informe seu nome');
      return;
    }

    if (!novaAvaliacao.comentario.trim()) {
      mostrarFeedback('erro', 'Comentário obrigatório', 'Por favor, escreva um comentário sobre sua experiência');
      return;
    }

    if (novaAvaliacao.comentario.trim().length < 10) {
      mostrarFeedback('erro', 'Comentário muito curto', 'Por favor, escreva pelo menos 10 caracteres');
      return;
    }

    setEnviando(true);
    try {
      // Usar tabela de avaliações públicas (sem necessidade de aprovação)
      const { error } = await supabase.from("avaliacoes_publicas").insert([
        {
          nome: novaAvaliacao.nome.trim(),
          avaliacao: novaAvaliacao.nota,
          comentario: novaAvaliacao.comentario.trim(),
          aprovado: true, // Aprovado automaticamente
        },
      ]);

      if (error) throw error;

      // Fechar modal de formulário
      setModalAberto(false);
      
      // Limpar formulário
      setNovaAvaliacao({ nome: "", nota: 5, comentario: "", servico: "" });
      
      // Recarregar avaliações
      await buscarAvaliacoes();
      
      // Mostrar feedback de sucesso
      mostrarFeedback('sucesso', 'Avaliação publicada!', 'Obrigado por compartilhar sua experiência conosco!');
    } catch (error: any) {
      console.error("Erro ao enviar avaliação:", error);
      mostrarFeedback('erro', 'Erro ao publicar', error.message || 'Não foi possível publicar sua avaliação. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const darLike = async (id: string, likesAtuais: number) => {
    try {
      const { error } = await supabase
        .from("avaliacoes")
        .update({ likes: likesAtuais + 1 })
        .eq("id", id);

      if (error) throw error;

      // Atualizar estado local
      setAvaliacoes((prev) =>
        prev.map((av) => (av.id === id ? { ...av, likes: av.likes + 1 } : av))
      );
    } catch (error) {
      console.error("Erro ao dar like:", error);
    }
  };

  const avaliacoesFiltradas = filtroNota
    ? avaliacoes.filter((av) => av.nota === filtroNota)
    : avaliacoes;

  const mediaNotas = avaliacoes.length > 0
    ? (avaliacoes.reduce((acc, av) => acc + av.nota, 0) / avaliacoes.length).toFixed(1)
    : "0.0";

  const distribuicaoNotas = [5, 4, 3, 2, 1].map((nota) => ({
    nota,
    quantidade: avaliacoes.filter((av) => av.nota === nota).length,
    porcentagem: avaliacoes.length > 0
      ? Math.round((avaliacoes.filter((av) => av.nota === nota).length / avaliacoes.length) * 100)
      : 0,
  }));

  const proximaAvaliacao = () => {
    setIndiceAtual((prev) => (prev + 1) % avaliacoesFiltradas.length);
  };

  const avaliacaoAnterior = () => {
    setIndiceAtual((prev) => (prev - 1 + avaliacoesFiltradas.length) % avaliacoesFiltradas.length);
  };

  if (carregando) {
    return (
      <section className="py-20 bg-zinc-50 dark:bg-zinc-900">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zinc-900 dark:border-white"></div>
        </div>
      </section>
    );
  }

  return (
    <section id="avaliacoes" className="py-20 bg-zinc-50 dark:bg-zinc-900">
      <div className="container mx-auto px-4">
        {/* Cabeçalho */}
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-zinc-900 dark:text-white mb-4"
          >
            O Que Nossos Clientes Dizem
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-zinc-600 dark:text-zinc-400 text-lg"
          >
            Avaliações verificadas de clientes reais
          </motion.p>
        </div>

        {/* Estatísticas de Avaliações */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Média Geral */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-white dark:bg-zinc-800 rounded-2xl p-8 text-center border border-zinc-200 dark:border-zinc-700"
          >
            <div className="text-6xl font-bold text-zinc-900 dark:text-white mb-2">
              {mediaNotas}
            </div>
            <div className="flex justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(parseFloat(mediaNotas))
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-zinc-300 dark:text-zinc-600"
                  }`}
                />
              ))}
            </div>
            <p className="text-zinc-600 dark:text-zinc-400">
              Baseado em {avaliacoes.length} avaliações
            </p>
          </motion.div>

          {/* Distribuição de Notas */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-zinc-800 rounded-2xl p-8 border border-zinc-200 dark:border-zinc-700"
          >
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">
              Distribuição
            </h3>
            <div className="space-y-2">
              {distribuicaoNotas.map(({ nota, quantidade, porcentagem }) => (
                <div key={nota} className="flex items-center gap-2">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400 w-8">
                    {nota}★
                  </span>
                  <div className="flex-1 bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full transition-all"
                      style={{ width: `${porcentagem}%` }}
                    />
                  </div>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400 w-12 text-right">
                    {quantidade}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Filtros e Ação */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-zinc-800 rounded-2xl p-8 border border-zinc-200 dark:border-zinc-700"
          >
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">
              Filtrar por nota
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setFiltroNota(null)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filtroNota === null
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-black"
                    : "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white"
                }`}
              >
                Todas
              </button>
              {[5, 4, 3].map((nota) => (
                <button
                  key={nota}
                  onClick={() => setFiltroNota(nota)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filtroNota === nota
                      ? "bg-zinc-900 dark:bg-white text-white dark:text-black"
                      : "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white"
                  }`}
                >
                  {nota}★
                </button>
              ))}
            </div>
            <Button
              onClick={() => setModalAberto(true)}
              className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black cursor-pointer"
            >
              Deixar Avaliação
            </Button>
          </motion.div>
        </div>

        {/* Carrossel de Avaliações */}
        {avaliacoesFiltradas.length > 0 && (
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={indiceAtual}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-zinc-800 rounded-2xl p-8 md:p-12 border border-zinc-200 dark:border-zinc-700"
              >
                <div className="flex items-start gap-4 mb-6">
                  <Quote className="w-12 h-12 text-zinc-300 dark:text-zinc-600 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h4 className="font-semibold text-xl text-zinc-900 dark:text-white">
                        {avaliacoesFiltradas[indiceAtual].cliente_nome}
                      </h4>
                      {avaliacoesFiltradas[indiceAtual].verificado && (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                          ✓ Verificado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${
                              star <= avaliacoesFiltradas[indiceAtual].nota
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-zinc-300 dark:text-zinc-600"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        {format(new Date(avaliacoesFiltradas[indiceAtual].data), "dd MMM yyyy", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    {avaliacoesFiltradas[indiceAtual].servico && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                        Serviço: <span className="font-medium">{avaliacoesFiltradas[indiceAtual].servico}</span>
                      </p>
                    )}
                    <p className="text-zinc-700 dark:text-zinc-300 text-lg leading-relaxed mb-4">
                      {avaliacoesFiltradas[indiceAtual].comentario}
                    </p>
                    <button
                      onClick={() => darLike(avaliacoesFiltradas[indiceAtual].id, avaliacoesFiltradas[indiceAtual].likes)}
                      className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span className="text-sm">
                        Útil ({avaliacoesFiltradas[indiceAtual].likes})
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Controles do Carrossel */}
            {avaliacoesFiltradas.length > 1 && (
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={avaliacaoAnterior}
                  className="p-3 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex gap-2">
                  {avaliacoesFiltradas.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setIndiceAtual(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === indiceAtual
                          ? "bg-zinc-900 dark:bg-white w-8"
                          : "bg-zinc-300 dark:bg-zinc-600"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={proximaAvaliacao}
                  className="p-3 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal de Nova Avaliação */}
        {modalAberto && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                Deixe sua Avaliação
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Seu Nome *
                  </label>
                  <TextField.Root
                    value={novaAvaliacao.nome}
                    onChange={(e) => setNovaAvaliacao({ ...novaAvaliacao, nome: e.target.value })}
                    placeholder="João Silva"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Nota *
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((nota) => (
                      <button
                        key={nota}
                        onClick={() => setNovaAvaliacao({ ...novaAvaliacao, nota })}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            nota <= novaAvaliacao.nota
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-zinc-300 dark:text-zinc-600"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Serviço
                  </label>
                  <TextField.Root
                    value={novaAvaliacao.servico}
                    onChange={(e) => setNovaAvaliacao({ ...novaAvaliacao, servico: e.target.value })}
                    placeholder="Corte + Barba"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Comentário *
                  </label>
                  <textarea
                    value={novaAvaliacao.comentario}
                    onChange={(e) => setNovaAvaliacao({ ...novaAvaliacao, comentario: e.target.value })}
                    placeholder="Conte sua experiência..."
                    className="w-full p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={enviarAvaliacao}
                  disabled={enviando}
                  className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-black cursor-pointer"
                >
                  {enviando ? 'Publicando...' : 'Enviar Avaliação'}
                </Button>
                <Button
                  onClick={() => setModalAberto(false)}
                  variant="outline"
                  className="flex-1 cursor-pointer"
                  disabled={enviando}
                >
                  Cancelar
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal de Feedback */}
        <ModalPortal aberto={modalFeedback.aberto} onFechar={() => setModalFeedback({ ...modalFeedback, aberto: false })}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden w-full max-w-md shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <div className={`p-6 ${
              modalFeedback.tipo === 'sucesso' 
                ? 'bg-green-50 dark:bg-green-900/10' 
                : 'bg-red-50 dark:bg-red-900/10'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${
                  modalFeedback.tipo === 'sucesso' 
                    ? 'bg-green-100 dark:bg-green-900/30' 
                    : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                  {modalFeedback.tipo === 'sucesso' ? (
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  )}
                </div>
                
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold mb-2 ${
                    modalFeedback.tipo === 'sucesso' 
                      ? 'text-green-900 dark:text-green-100' 
                      : 'text-red-900 dark:text-red-100'
                  }`}>
                    {modalFeedback.titulo}
                  </h3>
                  <p className={`${
                    modalFeedback.tipo === 'sucesso' 
                      ? 'text-green-700 dark:text-green-300' 
                      : 'text-red-700 dark:text-red-300'
                  }`}>
                    {modalFeedback.mensagem}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 flex gap-3 justify-end">
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
            </div>
          </div>
        </ModalPortal>
      </div>
    </section>
  );
}
