"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Trash2,
  Check,
  X,
  Search,
  Filter,
  Loader2,
  Image as ImageIcon,
  User,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Comentario {
  id: string;
  trabalho_id: string;
  nome: string;
  comentario: string;
  aprovado: boolean;
  criado_em: string;
  trabalho?: {
    titulo: string;
    imagem_url: string;
  };
}

type FiltroStatus = "todos" | "aprovados" | "pendentes";

export function GestaoComentarios() {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [busca, setBusca] = useState("");
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [modalConfirmacao, setModalConfirmacao] = useState<{
    tipo: "aprovar" | "deletar";
    comentario: Comentario;
  } | null>(null);

  // Buscar comentários
  const buscarComentarios = async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from("comentarios_trabalhos")
        .select(`
          id,
          trabalho_id,
          nome,
          comentario,
          aprovado,
          criado_em,
          trabalhos (titulo, imagem_url)
        `)
        .order("criado_em", { ascending: false });

      if (error) throw error;

      const comentariosFormatados = (data || []).map((c: any) => ({
        ...c,
        trabalho: c.trabalhos,
      }));

      setComentarios(comentariosFormatados);
    } catch (error) {
      console.error("Erro ao buscar comentários:", error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarComentarios();
  }, []);

  // Aprovar comentário
  const aprovarComentario = async (id: string) => {
    setProcessandoId(id);
    try {
      const { error } = await supabase
        .from("comentarios_trabalhos")
        .update({ aprovado: true } as any)
        .eq("id", id);

      if (error) throw error;

      setComentarios((prev) =>
        prev.map((c) => (c.id === id ? { ...c, aprovado: true } : c))
      );
      setModalConfirmacao(null);
    } catch (error) {
      console.error("Erro ao aprovar comentário:", error);
      alert("Erro ao aprovar comentário");
    } finally {
      setProcessandoId(null);
    }
  };

  // Deletar comentário
  const deletarComentario = async (id: string) => {
    setProcessandoId(id);
    try {
      const { error } = await supabase
        .from("comentarios_trabalhos")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setComentarios((prev) => prev.filter((c) => c.id !== id));
      setModalConfirmacao(null);
    } catch (error) {
      console.error("Erro ao deletar comentário:", error);
      alert("Erro ao deletar comentário");
    } finally {
      setProcessandoId(null);
    }
  };

  // Filtrar comentários
  const comentariosFiltrados = comentarios.filter((c) => {
    // Filtro de status
    if (filtroStatus === "aprovados" && !c.aprovado) return false;
    if (filtroStatus === "pendentes" && c.aprovado) return false;

    // Filtro de busca
    if (busca) {
      const termoBusca = busca.toLowerCase();
      return (
        c.nome.toLowerCase().includes(termoBusca) ||
        c.comentario.toLowerCase().includes(termoBusca) ||
        c.trabalho?.titulo?.toLowerCase().includes(termoBusca)
      );
    }

    return true;
  });

  // Estatísticas
  const totalComentarios = comentarios.length;
  const comentariosAprovados = comentarios.filter((c) => c.aprovado).length;
  const comentariosPendentes = comentarios.filter((c) => !c.aprovado).length;

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-600 dark:text-zinc-400">Carregando comentários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Gestão de Comentários
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Gerencie os comentários do portfólio
          </p>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
              <MessageCircle className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Total</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {totalComentarios}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Aprovados</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {comentariosAprovados}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
              <Clock className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Pendentes</p>
              <p className="text-2xl font-bold text-zinc-600 dark:text-zinc-400">
                {comentariosPendentes}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Busca */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, comentário ou trabalho..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-zinc-500 dark:focus:border-zinc-500 outline-none transition-colors"
          />
        </div>

        {/* Filtro de status */}
        <div className="flex gap-2">
          {(["todos", "aprovados", "pendentes"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFiltroStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtroStatus === status
                  ? "bg-white text-black dark:bg-zinc-100"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {status === "todos" && "Todos"}
              {status === "aprovados" && "Aprovados"}
              {status === "pendentes" && "Pendentes"}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de comentários */}
      {comentariosFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <MessageCircle className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 dark:text-zinc-400">
            {busca
              ? "Nenhum comentário encontrado para esta busca"
              : "Nenhum comentário ainda"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {comentariosFiltrados.map((comentario) => (
              <motion.div
                key={comentario.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4"
              >
                <div className="flex gap-4">
                  {/* Imagem do trabalho */}
                  {comentario.trabalho?.imagem_url ? (
                    <img
                      src={comentario.trabalho.imagem_url}
                      alt={comentario.trabalho.titulo}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-6 h-6 text-zinc-400" />
                    </div>
                  )}

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {comentario.nome.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-semibold text-zinc-900 dark:text-white">
                            {comentario.nome}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              comentario.aprovado
                                ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            }`}
                          >
                            {comentario.aprovado ? "Aprovado" : "Pendente"}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                          em <span className="font-medium">{comentario.trabalho?.titulo || "Trabalho removido"}</span>
                        </p>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-2">
                        {!comentario.aprovado && (
                          <button
                            onClick={() =>
                              setModalConfirmacao({
                                tipo: "aprovar",
                                comentario,
                              })
                            }
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Aprovar"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() =>
                            setModalConfirmacao({
                              tipo: "deletar",
                              comentario,
                            })
                          }
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Deletar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Comentário */}
                    <p className="text-zinc-700 dark:text-zinc-300 mt-2">
                      {comentario.comentario}
                    </p>

                    {/* Data */}
                    <p className="text-xs text-zinc-400 mt-2 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(comentario.criado_em), "dd 'de' MMMM 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal de confirmação */}
      <AnimatePresence>
        {modalConfirmacao && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setModalConfirmacao(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div
                  className={`w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center ${
                    modalConfirmacao.tipo === "aprovar"
                      ? "bg-green-100 dark:bg-green-900/30"
                      : "bg-red-100 dark:bg-red-900/30"
                  }`}
                >
                  {modalConfirmacao.tipo === "aprovar" ? (
                    <Check className="w-6 h-6 text-green-600" />
                  ) : (
                    <Trash2 className="w-6 h-6 text-red-600" />
                  )}
                </div>

                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
                  {modalConfirmacao.tipo === "aprovar"
                    ? "Aprovar comentário?"
                    : "Deletar comentário?"}
                </h3>

                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                  {modalConfirmacao.tipo === "aprovar"
                    ? "O comentário será exibido publicamente no portfólio."
                    : "Esta ação não pode ser desfeita."}
                </p>

                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 mb-4 text-left">
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    <span className="font-semibold">{modalConfirmacao.comentario.nome}:</span>{" "}
                    {modalConfirmacao.comentario.comentario}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setModalConfirmacao(null)}
                    className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (modalConfirmacao.tipo === "aprovar") {
                        aprovarComentario(modalConfirmacao.comentario.id);
                      } else {
                        deletarComentario(modalConfirmacao.comentario.id);
                      }
                    }}
                    disabled={processandoId === modalConfirmacao.comentario.id}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      modalConfirmacao.tipo === "aprovar"
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-red-600 text-white hover:bg-red-700"
                    }`}
                  >
                    {processandoId === modalConfirmacao.comentario.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : modalConfirmacao.tipo === "aprovar" ? (
                      "Aprovar"
                    ) : (
                      "Deletar"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
