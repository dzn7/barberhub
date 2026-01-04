"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Upload,
  X,
  Check,
  Loader2,
  Heart,
  Crop,
  RotateCw,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  Maximize,
  Tag,
} from "lucide-react";
import { Button, TextField, Select, Badge } from "@radix-ui/themes";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import {
  comprimirImagem,
  formatarTamanhoArquivo,
  criarPreviewUrl,
  revogarPreviewUrl,
} from "@/lib/compressao-imagem";

interface Trabalho {
  id: string;
  titulo: string;
  categoria: string;
  imagem_url: string;
  descricao: string | null;
  curtidas: number;
  ativo: boolean;
  criado_em: string;
}

interface NovoTrabalho {
  titulo: string;
  categoria: string;
  descricao: string;
}

interface Categoria {
  id: string;
  nome: string;
}

const ASPECT_RATIOS = [
  { label: "1:1", value: 1, icon: Square },
  { label: "4:3", value: 4 / 3, icon: RectangleHorizontal },
  { label: "16:9", value: 16 / 9, icon: RectangleHorizontal },
  { label: "3:4", value: 3 / 4, icon: RectangleVertical },
  { label: "9:16", value: 9 / 16, icon: RectangleVertical },
  { label: "Livre", value: undefined, icon: Maximize },
];

/**
 * Componente de Gestão de Trabalhos/Portfólio
 * Upload com compressão, crop e preview em tempo real
 */
export function GestaoTrabalhos() {
  const [trabalhos, setTrabalhos] = useState<Trabalho[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalCropAberto, setModalCropAberto] = useState(false);
  const [editando, setEditando] = useState<Trabalho | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  // Estados do formulário
  const [novoTrabalho, setNovoTrabalho] = useState<NovoTrabalho>({
    titulo: "",
    categoria: "",
    descricao: "",
  });

  // Estados de upload e crop
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imagemParaCrop, setImagemParaCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [infoCompressao, setInfoCompressao] = useState<{
    original: number;
    comprimido: number;
    reducao: number;
  } | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(1);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [modalCategoriaAberto, setModalCategoriaAberto] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);

  useEffect(() => {
    buscarTrabalhos();
    buscarCategorias();
  }, []);

  // Limpar URLs ao desmontar
  useEffect(() => {
    return () => {
      if (previewUrl) revogarPreviewUrl(previewUrl);
      if (imagemParaCrop) revogarPreviewUrl(imagemParaCrop);
    };
  }, []);

  const buscarTrabalhos = async () => {
    try {
      const { data, error } = await supabase
        .from("trabalhos")
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setTrabalhos(data || []);
    } catch (error) {
      console.error("Erro ao buscar trabalhos:", error);
      mostrarMensagem("erro", "Erro ao carregar trabalhos");
    } finally {
      setCarregando(false);
    }
  };

  const buscarCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from("categorias_trabalhos")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      setCategorias(data || []);
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
    }
  };

  const criarCategoria = async () => {
    if (!novaCategoria.trim()) {
      mostrarMensagem("erro", "Digite o nome da categoria");
      return;
    }

    setSalvandoCategoria(true);
    try {
      const { data, error } = await supabase
        .from("categorias_trabalhos")
        .insert([{ nome: novaCategoria.trim() }])
        .select()
        .single();

      if (error) throw error;

      setCategorias((prev) => [...prev, data]);
      setNovoTrabalho({ ...novoTrabalho, categoria: data.nome });
      setNovaCategoria("");
      setModalCategoriaAberto(false);
      mostrarMensagem("sucesso", "Categoria criada!");
    } catch (error: any) {
      console.error("Erro ao criar categoria:", error);
      if (error.code === "23505") {
        mostrarMensagem("erro", "Categoria já existe");
      } else {
        mostrarMensagem("erro", "Erro ao criar categoria");
      }
    } finally {
      setSalvandoCategoria(false);
    }
  };

  const mostrarMensagem = (tipo: "sucesso" | "erro", texto: string) => {
    setMensagem({ tipo, texto });
    setTimeout(() => setMensagem(null), 4000);
  };

  const abrirModalNovo = () => {
    setEditando(null);
    setNovoTrabalho({ titulo: "", categoria: categorias[0]?.nome || "", descricao: "" });
    setArquivoSelecionado(null);
    setPreviewUrl(null);
    setInfoCompressao(null);
    setAspectRatio(1);
    setModalAberto(true);
  };

  const abrirModalEditar = (trabalho: Trabalho) => {
    setEditando(trabalho);
    setNovoTrabalho({
      titulo: trabalho.titulo,
      categoria: trabalho.categoria,
      descricao: trabalho.descricao || "",
    });
    setPreviewUrl(trabalho.imagem_url);
    setArquivoSelecionado(null);
    setInfoCompressao(null);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEditando(null);
    if (previewUrl && !editando) {
      revogarPreviewUrl(previewUrl);
    }
    setPreviewUrl(null);
    setArquivoSelecionado(null);
    setInfoCompressao(null);
  };

  // Manipular seleção de arquivo
  const handleArquivoSelecionado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    // Validar tipo
    if (!arquivo.type.startsWith("image/")) {
      mostrarMensagem("erro", "Selecione um arquivo de imagem");
      return;
    }

    // Criar preview para crop
    const url = criarPreviewUrl(arquivo);
    setImagemParaCrop(url);
    setModalCropAberto(true);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  // Callback do crop
  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Criar imagem cortada
  const criarImagemCortada = async (): Promise<Blob | null> => {
    if (!imagemParaCrop || !croppedAreaPixels) return null;

    const image = new Image();
    image.src = imagemParaCrop;

    return new Promise((resolve) => {
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(null);
          return;
        }

        const { width, height, x, y } = croppedAreaPixels;

        canvas.width = width;
        canvas.height = height;

        // Aplicar rotação
        ctx.translate(width / 2, height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-width / 2, -height / 2);

        ctx.drawImage(
          image,
          x,
          y,
          width,
          height,
          0,
          0,
          width,
          height
        );

        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          "image/jpeg",
          0.95
        );
      };
    });
  };

  // Confirmar crop e comprimir
  const confirmarCrop = async () => {
    try {
      const blobCortado = await criarImagemCortada();
      if (!blobCortado) {
        mostrarMensagem("erro", "Erro ao processar imagem");
        return;
      }

      // Converter blob para File
      const arquivoCortado = new File([blobCortado], "imagem.jpg", {
        type: "image/jpeg",
      });

      // Comprimir imagem
      const resultado = await comprimirImagem(arquivoCortado);

      setArquivoSelecionado(resultado.arquivoComprimido);
      setInfoCompressao({
        original: resultado.tamanhoOriginal,
        comprimido: resultado.tamanhoComprimido,
        reducao: resultado.percentualReducao,
      });

      // Criar preview da imagem comprimida
      if (previewUrl) revogarPreviewUrl(previewUrl);
      const novoPreview = criarPreviewUrl(resultado.arquivoComprimido);
      setPreviewUrl(novoPreview);

      // Fechar modal de crop
      setModalCropAberto(false);
      if (imagemParaCrop) revogarPreviewUrl(imagemParaCrop);
      setImagemParaCrop(null);
    } catch (error) {
      console.error("Erro ao processar imagem:", error);
      mostrarMensagem("erro", "Erro ao processar imagem");
    }
  };

  // Cancelar crop
  const cancelarCrop = () => {
    setModalCropAberto(false);
    if (imagemParaCrop) revogarPreviewUrl(imagemParaCrop);
    setImagemParaCrop(null);
  };

  // Upload para Cloudflare R2
  const fazerUpload = async (arquivo: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("arquivo", arquivo);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const resultado = await response.json();

      if (!response.ok) {
        throw new Error(resultado.erro || "Erro no upload");
      }

      return resultado.url;
    } catch (error: any) {
      console.error("Erro no upload:", error);
      throw error;
    }
  };

  // Salvar trabalho
  const salvarTrabalho = async () => {
    if (!novoTrabalho.titulo.trim()) {
      mostrarMensagem("erro", "Informe o título do trabalho");
      return;
    }

    if (!editando && !arquivoSelecionado) {
      mostrarMensagem("erro", "Selecione uma imagem");
      return;
    }

    setEnviando(true);

    try {
      let imagemUrl = editando?.imagem_url || "";

      // Upload da nova imagem se houver
      if (arquivoSelecionado) {
        const url = await fazerUpload(arquivoSelecionado);
        if (!url) throw new Error("Falha no upload");
        imagemUrl = url;
      }

      if (editando) {
        // Atualizar existente
        const { error } = await supabase
          .from("trabalhos")
          .update({
            titulo: novoTrabalho.titulo.trim(),
            categoria: novoTrabalho.categoria,
            descricao: novoTrabalho.descricao.trim() || null,
            imagem_url: imagemUrl,
          })
          .eq("id", editando.id);

        if (error) throw error;
        mostrarMensagem("sucesso", "Trabalho atualizado com sucesso!");
      } else {
        // Criar novo
        const { error } = await supabase.from("trabalhos").insert([
          {
            titulo: novoTrabalho.titulo.trim(),
            categoria: novoTrabalho.categoria,
            descricao: novoTrabalho.descricao.trim() || null,
            imagem_url: imagemUrl,
            curtidas: 0,
            ativo: true,
          },
        ]);

        if (error) throw error;
        mostrarMensagem("sucesso", "Trabalho adicionado com sucesso!");
      }

      fecharModal();
      buscarTrabalhos();
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      mostrarMensagem("erro", `Erro ao salvar: ${error.message}`);
    } finally {
      setEnviando(false);
    }
  };

  // Toggle ativo/inativo
  const toggleAtivo = async (trabalho: Trabalho) => {
    try {
      const { error } = await supabase
        .from("trabalhos")
        .update({ ativo: !trabalho.ativo })
        .eq("id", trabalho.id);

      if (error) throw error;

      setTrabalhos((prev) =>
        prev.map((t) => (t.id === trabalho.id ? { ...t, ativo: !t.ativo } : t))
      );
      mostrarMensagem("sucesso", trabalho.ativo ? "Trabalho ocultado" : "Trabalho visível");
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      mostrarMensagem("erro", "Erro ao atualizar status");
    }
  };

  // Deletar trabalho
  const deletarTrabalho = async (trabalho: Trabalho) => {
    if (!confirm(`Deseja realmente excluir "${trabalho.titulo}"?`)) return;

    try {
      // Deletar imagem do R2
      if (trabalho.imagem_url.includes("portfolio/")) {
        const nomeArquivo = trabalho.imagem_url.split("/").pop();
        if (nomeArquivo) {
          await fetch(`/api/upload?arquivo=portfolio/${nomeArquivo}`, {
            method: "DELETE",
          });
        }
      }

      const { error } = await supabase
        .from("trabalhos")
        .delete()
        .eq("id", trabalho.id);

      if (error) throw error;

      setTrabalhos((prev) => prev.filter((t) => t.id !== trabalho.id));
      mostrarMensagem("sucesso", "Trabalho excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar:", error);
      mostrarMensagem("erro", "Erro ao excluir trabalho");
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-zinc-400 mx-auto mb-4" />
          <p className="text-zinc-600 dark:text-zinc-400">Carregando portfólio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mensagem de feedback */}
      <AnimatePresence>
        {mensagem && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-lg ${
              mensagem.tipo === "sucesso"
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
            }`}
          >
            {mensagem.texto}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Gestão de Portfólio
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            {trabalhos.length} {trabalhos.length === 1 ? "trabalho" : "trabalhos"} cadastrados
          </p>
        </div>

        <Button onClick={abrirModalNovo} className="cursor-pointer">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Trabalho
        </Button>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Total</span>
            <ImageIcon className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            {trabalhos.length}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Visíveis</span>
            <Eye className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            {trabalhos.filter((t) => t.ativo).length}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Ocultos</span>
            <EyeOff className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            {trabalhos.filter((t) => !t.ativo).length}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Curtidas</span>
            <Heart className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            {trabalhos.reduce((sum, t) => sum + t.curtidas, 0)}
          </p>
        </motion.div>
      </div>

      {/* Grid de trabalhos */}
      {trabalhos.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <ImageIcon className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
            Nenhum trabalho cadastrado
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            Adicione fotos dos seus melhores cortes e trabalhos
          </p>
          <Button onClick={abrirModalNovo} className="cursor-pointer">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Primeiro Trabalho
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {trabalhos.map((trabalho) => (
            <motion.div
              key={trabalho.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`group relative bg-white dark:bg-zinc-900 rounded-xl border overflow-hidden ${
                trabalho.ativo
                  ? "border-zinc-200 dark:border-zinc-800"
                  : "border-zinc-300 dark:border-zinc-700 opacity-60"
              }`}
            >
              {/* Imagem */}
              <div className="aspect-square relative overflow-hidden">
                <img
                  src={trabalho.imagem_url}
                  alt={trabalho.titulo}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                
                {/* Overlay com ações */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="1"
                    variant="soft"
                    onClick={() => abrirModalEditar(trabalho)}
                    className="cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="1"
                    variant="soft"
                    color={trabalho.ativo ? "gray" : "green"}
                    onClick={() => toggleAtivo(trabalho)}
                    className="cursor-pointer"
                  >
                    {trabalho.ativo ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="1"
                    variant="soft"
                    color="red"
                    onClick={() => deletarTrabalho(trabalho)}
                    className="cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Badge de status */}
                {!trabalho.ativo && (
                  <div className="absolute top-2 right-2">
                    <Badge color="gray" size="1">Oculto</Badge>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="font-semibold text-zinc-900 dark:text-white truncate">
                  {trabalho.titulo}
                </h3>
                <div className="flex items-center justify-between mt-1">
                  <Badge color="gray" size="1">{trabalho.categoria}</Badge>
                  <div className="flex items-center gap-1 text-sm text-zinc-500">
                    <Heart className="w-3 h-3" />
                    {trabalho.curtidas}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de Adicionar/Editar */}
      <AnimatePresence>
        {modalAberto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={fecharModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                  {editando ? "Editar Trabalho" : "Novo Trabalho"}
                </h3>
                <button
                  onClick={fecharModal}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Upload de imagem */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Imagem *
                  </label>
                  
                  {previewUrl ? (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full aspect-video object-cover rounded-lg"
                      />
                      <button
                        onClick={() => {
                          if (previewUrl && !editando?.imagem_url) {
                            revogarPreviewUrl(previewUrl);
                          }
                          setPreviewUrl(null);
                          setArquivoSelecionado(null);
                          setInfoCompressao(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      
                      {infoCompressao && (
                        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-700 dark:text-green-400">
                          Comprimido: {formatarTamanhoArquivo(infoCompressao.original)} → {formatarTamanhoArquivo(infoCompressao.comprimido)} ({infoCompressao.reducao}% menor)
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                      <Upload className="w-10 h-10 text-zinc-400 mb-2" />
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        Clique para selecionar
                      </span>
                      <span className="text-xs text-zinc-500 mt-1">
                        JPEG, PNG, WebP (máx. 10MB)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleArquivoSelecionado}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Título *
                  </label>
                  <TextField.Root
                    value={novoTrabalho.titulo}
                    onChange={(e) => setNovoTrabalho({ ...novoTrabalho, titulo: e.target.value })}
                    placeholder="Ex: Degradê Moderno"
                  />
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Categoria
                  </label>
                  <div className="flex gap-2">
                    <Select.Root
                      value={novoTrabalho.categoria}
                      onValueChange={(value) => setNovoTrabalho({ ...novoTrabalho, categoria: value })}
                    >
                      <Select.Trigger className="flex-1" />
                      <Select.Content>
                        {categorias.map((cat: Categoria) => (
                          <Select.Item key={cat.id} value={cat.nome}>
                            {cat.nome}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                    <Button
                      type="button"
                      variant="soft"
                      onClick={() => setModalCategoriaAberto(true)}
                      className="cursor-pointer"
                    >
                      <Tag className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={novoTrabalho.descricao}
                    onChange={(e) => setNovoTrabalho({ ...novoTrabalho, descricao: e.target.value })}
                    placeholder="Detalhes sobre o trabalho..."
                    rows={3}
                    className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white resize-none"
                  />
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="soft"
                    color="gray"
                    onClick={fecharModal}
                    className="flex-1 cursor-pointer"
                    disabled={enviando}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={salvarTrabalho}
                    className="flex-1 cursor-pointer"
                    disabled={enviando}
                  >
                    {enviando ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        {editando ? "Salvar" : "Adicionar"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Crop */}
      <AnimatePresence>
        {modalCropAberto && imagemParaCrop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[60] flex flex-col"
          >
            {/* Área do Crop */}
            <div className="flex-1 relative">
              <Cropper
                image={imagemParaCrop}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspectRatio}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            {/* Controles */}
            <div className="bg-zinc-900 p-4 space-y-4">
              {/* Seletor de Proporção */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <span className="text-sm text-zinc-400 whitespace-nowrap">Proporção:</span>
                {ASPECT_RATIOS.map((ratio) => {
                  const Icon = ratio.icon;
                  return (
                    <button
                      key={ratio.label}
                      onClick={() => setAspectRatio(ratio.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap ${
                        aspectRatio === ratio.value
                          ? "bg-white text-black"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {ratio.label}
                    </button>
                  );
                })}
              </div>

              {/* Zoom */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-400 w-16">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-zinc-400 w-12">{zoom.toFixed(1)}x</span>
              </div>

              {/* Rotação */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-400 w-16">Rotação</span>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-zinc-400 w-12">{rotation}°</span>
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <Button
                  variant="soft"
                  color="gray"
                  onClick={cancelarCrop}
                  className="flex-1 cursor-pointer"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={confirmarCrop}
                  className="flex-1 cursor-pointer"
                >
                  <Crop className="w-4 h-4 mr-2" />
                  Aplicar Corte
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Nova Categoria */}
      <AnimatePresence>
        {modalCategoriaAberto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
            onClick={() => setModalCategoriaAberto(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                Nova Categoria
              </h3>

              <div className="space-y-4">
                <TextField.Root
                  value={novaCategoria}
                  onChange={(e) => setNovaCategoria(e.target.value)}
                  placeholder="Nome da categoria"
                />

                <div className="flex gap-2">
                  <Button
                    variant="soft"
                    color="gray"
                    onClick={() => setModalCategoriaAberto(false)}
                    className="flex-1 cursor-pointer"
                    disabled={salvandoCategoria}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={criarCategoria}
                    className="flex-1 cursor-pointer"
                    disabled={salvandoCategoria}
                  >
                    {salvandoCategoria ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
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
    </div>
  );
}
