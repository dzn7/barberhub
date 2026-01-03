"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ChevronLeft, ChevronRight, X, Loader2, MessageCircle, Send, User, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ImagemOtimizada } from "./ImagemOtimizada";
import { useAutenticacao } from "@/contexts/AutenticacaoContext";

interface Trabalho {
  id: string;
  titulo: string;
  categoria: string;
  imagem_url: string;
  descricao: string | null;
  curtidas: number;
}

interface Comentario {
  id: string;
  nome: string;
  comentario: string;
  criado_em: string;
}

/**
 * Seção de Portfólio Dinâmico
 * Busca trabalhos do banco de dados com cache inteligente
 */
export function SecaoPortfolio() {
  const { usuario } = useAutenticacao();
  const [trabalhos, setTrabalhos] = useState<Trabalho[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [categoriaAtiva, setCategoriaAtiva] = useState("Todos");
  const [trabalhoExpandido, setTrabalhoExpandido] = useState<Trabalho | null>(null);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [curtindo, setCurtindo] = useState(false);
  
  // Estados para comentários
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [carregandoComentarios, setCarregandoComentarios] = useState(false);
  const [novoComentario, setNovoComentario] = useState({ nome: "", texto: "" });
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [deletandoComentario, setDeletandoComentario] = useState<string | null>(null);
  const [mostrarComentarios, setMostrarComentarios] = useState(false);

  useEffect(() => {
    buscarTrabalhos();
  }, []);

  const buscarTrabalhos = async () => {
    try {
      const { data, error } = await supabase
        .from("trabalhos")
        .select("id, titulo, categoria, imagem_url, descricao, curtidas")
        .eq("ativo", true)
        .order("criado_em", { ascending: false })
        .limit(20);

      if (error) throw error;
      setTrabalhos(data || []);
    } catch (error) {
      console.error("Erro ao buscar trabalhos:", error);
    } finally {
      setCarregando(false);
    }
  };

  const darCurtida = async (trabalho: Trabalho) => {
    // Verificar se já curtiu (localStorage)
    const curtidos = JSON.parse(localStorage.getItem("trabalhosCurtidos") || "[]");
    if (curtidos.includes(trabalho.id)) return;
    if (curtindo) return;

    setCurtindo(true);
    
    // Atualizar estado local IMEDIATAMENTE (feedback instantâneo)
    const novasCurtidas = trabalho.curtidas + 1;
    setTrabalhos((prev) =>
      prev.map((t) =>
        t.id === trabalho.id ? { ...t, curtidas: novasCurtidas } : t
      )
    );
    
    // Atualizar trabalho expandido também
    if (trabalhoExpandido?.id === trabalho.id) {
      setTrabalhoExpandido({ ...trabalhoExpandido, curtidas: novasCurtidas });
    }

    // Salvar no localStorage imediatamente
    localStorage.setItem(
      "trabalhosCurtidos",
      JSON.stringify([...curtidos, trabalho.id])
    );

    try {
      // Atualizar no banco em background
      await supabase
        .from("trabalhos")
        .update({ curtidas: novasCurtidas } as any)
        .eq("id", trabalho.id);
    } catch (error) {
      console.error("Erro ao curtir:", error);
      // Reverter em caso de erro
      setTrabalhos((prev) =>
        prev.map((t) =>
          t.id === trabalho.id ? { ...t, curtidas: trabalho.curtidas } : t
        )
      );
      localStorage.setItem("trabalhosCurtidos", JSON.stringify(curtidos));
    } finally {
      setCurtindo(false);
    }
  };

  const jaCurtiu = (id: string): boolean => {
    if (typeof window === "undefined") return false;
    const curtidos = JSON.parse(localStorage.getItem("trabalhosCurtidos") || "[]");
    return curtidos.includes(id);
  };

  // Buscar comentários de um trabalho
  const buscarComentarios = async (trabalhoId: string) => {
    setCarregandoComentarios(true);
    try {
      const { data, error } = await supabase
        .from("comentarios_trabalhos")
        .select("id, nome, comentario, criado_em")
        .eq("trabalho_id", trabalhoId)
        .eq("aprovado", true)
        .order("criado_em", { ascending: false })
        .limit(50);

      if (error) throw error;
      setComentarios(data || []);
    } catch (error) {
      console.error("Erro ao buscar comentários:", error);
    } finally {
      setCarregandoComentarios(false);
    }
  };

  // Enviar comentário
  const enviarComentario = async () => {
    if (!trabalhoExpandido) return;
    if (!novoComentario.nome.trim()) {
      alert("Por favor, informe seu nome");
      return;
    }
    if (!novoComentario.texto.trim()) {
      alert("Por favor, escreva um comentário");
      return;
    }

    setEnviandoComentario(true);
    try {
      const { data, error } = await supabase
        .from("comentarios_trabalhos")
        .insert({
          trabalho_id: trabalhoExpandido.id,
          nome: novoComentario.nome.trim(),
          comentario: novoComentario.texto.trim(),
          aprovado: true,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Adicionar ao estado local
      setComentarios((prev) => [data as Comentario, ...prev]);
      setNovoComentario({ nome: novoComentario.nome, texto: "" });
    } catch (error) {
      console.error("Erro ao enviar comentário:", error);
      alert("Erro ao enviar comentário. Tente novamente.");
    } finally {
      setEnviandoComentario(false);
    }
  };

  // Deletar comentário (admin)
  const deletarComentario = async (comentarioId: string) => {
    if (!usuario) return;
    
    setDeletandoComentario(comentarioId);
    try {
      const { error } = await supabase
        .from("comentarios_trabalhos")
        .delete()
        .eq("id", comentarioId);

      if (error) throw error;

      // Remover do estado local
      setComentarios((prev) => prev.filter((c) => c.id !== comentarioId));
    } catch (error) {
      console.error("Erro ao deletar comentário:", error);
      alert("Erro ao deletar comentário.");
    } finally {
      setDeletandoComentario(null);
    }
  };

  // Formatar data do comentário
  const formatarData = (dataStr: string): string => {
    const data = new Date(dataStr);
    const agora = new Date();
    const diffMs = agora.getTime() - data.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "agora";
    if (diffMin < 60) return `${diffMin}min`;
    if (diffHoras < 24) return `${diffHoras}h`;
    if (diffDias < 7) return `${diffDias}d`;
    return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  // Carregar comentários quando abrir trabalho
  useEffect(() => {
    if (trabalhoExpandido) {
      buscarComentarios(trabalhoExpandido.id);
      setMostrarComentarios(false);
    } else {
      setComentarios([]);
    }
  }, [trabalhoExpandido]);

  // Categorias únicas
  const categorias = ["Todos", ...new Set(trabalhos.map((t) => t.categoria))];

  // Filtrar por categoria
  const trabalhosFiltrados =
    categoriaAtiva === "Todos"
      ? trabalhos
      : trabalhos.filter((t) => t.categoria === categoriaAtiva);

  // Navegação do lightbox
  const anterior = () => {
    if (!trabalhoExpandido) return;
    const idx = trabalhosFiltrados.findIndex((t) => t.id === trabalhoExpandido.id);
    const novoIdx = idx > 0 ? idx - 1 : trabalhosFiltrados.length - 1;
    setTrabalhoExpandido(trabalhosFiltrados[novoIdx]);
  };

  const proximo = () => {
    if (!trabalhoExpandido) return;
    const idx = trabalhosFiltrados.findIndex((t) => t.id === trabalhoExpandido.id);
    const novoIdx = idx < trabalhosFiltrados.length - 1 ? idx + 1 : 0;
    setTrabalhoExpandido(trabalhosFiltrados[novoIdx]);
  };

  // Fechar com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTrabalhoExpandido(null);
      if (e.key === "ArrowLeft") anterior();
      if (e.key === "ArrowRight") proximo();
    };

    if (trabalhoExpandido) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [trabalhoExpandido]);

  if (carregando) {
    return (
      <section className="py-20 bg-white dark:bg-zinc-950">
        <div className="container mx-auto px-4 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-zinc-400 mx-auto" />
        </div>
      </section>
    );
  }

  if (trabalhos.length === 0) {
    return null;
  }

  return (
    <section id="portfolio" className="py-20 bg-white dark:bg-zinc-950">
      <div className="container mx-auto px-4">
        {/* Cabeçalho */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full mb-4">
            Nosso Trabalho
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
            Portfólio de Cortes
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Confira alguns dos nossos melhores trabalhos e transformações
          </p>
        </motion.div>

        {/* Filtros de Categoria */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categorias.map((categoria) => (
            <button
              key={categoria}
              onClick={() => setCategoriaAtiva(categoria)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                categoriaAtiva === categoria
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {categoria}
            </button>
          ))}
        </div>

        {/* Grid de Trabalhos */}
        <motion.div
          layout
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4"
        >
          <AnimatePresence mode="popLayout">
            {trabalhosFiltrados.map((trabalho, index) => (
              <motion.div
                key={trabalho.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group relative cursor-pointer rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800"
              >
                <div className="aspect-square">
                  <ImagemOtimizada
                    src={trabalho.imagem_url}
                    alt={trabalho.titulo}
                    aspectRatio="square"
                    className="transition-transform duration-500 group-hover:scale-110"
                  />
                </div>

                {/* Barra inferior sempre visível */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 md:p-4">
                  <h3 className="text-white font-semibold text-sm md:text-base line-clamp-1">
                    {trabalho.titulo}
                  </h3>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-zinc-300 text-xs md:text-sm">
                      {trabalho.categoria}
                    </span>
                    <div className="flex items-center gap-3">
                      {/* Curtidas - sempre visível */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          darCurtida(trabalho);
                        }}
                        className="flex items-center gap-1 text-white hover:scale-110 transition-transform"
                      >
                        <Heart
                          className={`w-4 h-4 md:w-5 md:h-5 ${
                            jaCurtiu(trabalho.id) ? "fill-red-500 text-red-500" : ""
                          }`}
                        />
                        <span className="text-xs md:text-sm font-medium">{trabalho.curtidas}</span>
                      </button>
                      {/* Comentários - sempre visível */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTrabalhoExpandido(trabalho);
                        }}
                        className="flex items-center gap-1 text-white hover:scale-110 transition-transform"
                      >
                        <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Clique para expandir */}
                <div 
                  className="absolute inset-0"
                  onClick={() => setTrabalhoExpandido(trabalho)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Lightbox - Estilo Instagram */}
        <AnimatePresence>
          {trabalhoExpandido && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-[60]"
              onClick={() => setTrabalhoExpandido(null)}
            >
              {/* Container principal - Desktop: lado a lado, Mobile: empilhado */}
              <div className="h-full w-full flex flex-col md:flex-row">
                {/* Lado esquerdo - Imagem */}
                <div className="flex-1 relative flex items-center justify-center bg-black">
                  {/* Botão Fechar - Mobile */}
                  <button
                    onClick={() => setTrabalhoExpandido(null)}
                    className="absolute top-4 right-4 md:hidden p-2 text-white/80 hover:text-white transition-colors z-20"
                  >
                    <X className="w-6 h-6" />
                  </button>

                  {/* Navegação */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      anterior();
                    }}
                    className="absolute left-2 md:left-4 p-2 text-white/80 hover:text-white transition-colors z-10"
                  >
                    <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      proximo();
                    }}
                    className="absolute right-2 md:right-4 p-2 text-white/80 hover:text-white transition-colors z-10"
                  >
                    <ChevronRight className="w-8 h-8 md:w-10 md:h-10" />
                  </button>

                  {/* Imagem */}
                  <motion.img
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    src={trabalhoExpandido.imagem_url}
                    alt={trabalhoExpandido.titulo}
                    className="max-w-full max-h-full object-contain"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Lado direito - Informações e Comentários (estilo Instagram) */}
                <motion.div
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 100, opacity: 0 }}
                  className="w-full md:w-[340px] lg:w-[380px] bg-white dark:bg-zinc-900 flex flex-col h-[45vh] md:h-full md:max-h-full border-l border-zinc-200 dark:border-zinc-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header - Info do post */}
                  <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src="/assets/logo.PNG"
                          alt="Barbearia BR99"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <h3 className="font-bold text-zinc-900 dark:text-white text-sm line-clamp-1">
                            {trabalhoExpandido.titulo}
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {trabalhoExpandido.categoria}
                          </p>
                        </div>
                      </div>
                      {/* Botão Fechar - Desktop */}
                      <button
                        onClick={() => setTrabalhoExpandido(null)}
                        className="hidden md:flex p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Ações - Curtir e Comentar */}
                  <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-4 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        darCurtida(trabalhoExpandido);
                      }}
                      disabled={jaCurtiu(trabalhoExpandido.id) || curtindo}
                      className="flex items-center gap-1.5 group"
                    >
                      <Heart
                        className={`w-5 h-5 transition-all ${
                          jaCurtiu(trabalhoExpandido.id)
                            ? "fill-red-500 text-red-500"
                            : "text-zinc-600 dark:text-zinc-400 group-hover:text-red-500"
                        }`}
                      />
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {trabalhoExpandido.curtidas}
                      </span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <MessageCircle className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {comentarios.length}
                      </span>
                    </div>
                  </div>

                  {/* Comentários - Scrollable */}
                  <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
                    {carregandoComentarios ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                      </div>
                    ) : comentarios.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          Nenhum comentário ainda.
                        </p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          Seja o primeiro a comentar!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {comentarios.map((comentario) => (
                          <div key={comentario.id} className="flex gap-3 group/comment">
                            {/* Avatar */}
                            <div className="w-7 h-7 rounded-full bg-zinc-800 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                              <span className="text-zinc-200 text-xs font-medium">
                                {comentario.nome.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-baseline gap-2">
                                  <span className="font-semibold text-sm text-zinc-900 dark:text-white">
                                    {comentario.nome}
                                  </span>
                                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                                    {formatarData(comentario.criado_em)}
                                  </span>
                                </div>
                                {/* Botão deletar - apenas admin */}
                                {usuario && (
                                  <button
                                    onClick={() => deletarComentario(comentario.id)}
                                    disabled={deletandoComentario === comentario.id}
                                    className="opacity-0 group-hover/comment:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all"
                                    title="Deletar comentário"
                                  >
                                    {deletandoComentario === comentario.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </button>
                                )}
                              </div>
                              <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-0.5 break-words">
                                {comentario.comentario}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Input de comentário - Fixo no bottom */}
                  <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0">
                    <div className="space-y-2">
                      {/* Campo de nome */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={novoComentario.nome}
                          onChange={(e) => setNovoComentario({ ...novoComentario, nome: e.target.value })}
                          placeholder="Seu nome"
                          className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-500 px-3 py-2 rounded-lg border-0 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all"
                        />
                        {novoComentario.nome.trim().length >= 2 && (
                          <button
                            onClick={() => setNovoComentario({ nome: "", texto: "" })}
                            className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 px-2"
                          >
                            Limpar
                          </button>
                        )}
                      </div>
                      
                      {/* Campo de comentário */}
                      {novoComentario.nome.trim().length >= 2 && (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={novoComentario.texto}
                            onChange={(e) => setNovoComentario({ ...novoComentario, texto: e.target.value })}
                            placeholder="Escreva um comentário..."
                            className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-500 px-3 py-2 rounded-lg border-0 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !enviandoComentario && novoComentario.texto.trim()) {
                                enviarComentario();
                              }
                            }}
                          />
                          <button
                            onClick={enviarComentario}
                            disabled={enviandoComentario || !novoComentario.texto.trim()}
                            className={`p-2 rounded-lg transition-all flex-shrink-0 ${
                              novoComentario.texto.trim()
                                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100"
                                : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed"
                            }`}
                          >
                            {enviandoComentario ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}
                      
                      {/* Dica */}
                      {novoComentario.nome.trim().length < 2 && (
                        <p className="text-xs text-zinc-500">Mínimo 2 caracteres para comentar</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
