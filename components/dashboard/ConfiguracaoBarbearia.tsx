"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Store, Palette, Upload, Trash2, Check, X, Save, Loader2,
  Eye, RefreshCw, ImageIcon, Link as LinkIcon, Phone, Mail,
  MapPin, Instagram, Globe, Clock
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface ConfiguracaoBarbeariaProps {
  onSalvar?: () => void;
}

// Paletas sofisticadas e elegantes - design monocromático profissional
const CORES_PREDEFINIDAS = [
  { nome: "Obsidian", descricao: "Elegância clássica", primaria: "#09090b", secundaria: "#fafafa", destaque: "#fafafa" },
  { nome: "Grafite", descricao: "Minimalismo moderno", primaria: "#18181b", secundaria: "#f4f4f5", destaque: "#a1a1aa" },
  { nome: "Midnight", descricao: "Sofisticação noturna", primaria: "#0c0a09", secundaria: "#fafaf9", destaque: "#a8a29e" },
  { nome: "Slate", descricao: "Profissional discreto", primaria: "#0f172a", secundaria: "#f8fafc", destaque: "#94a3b8" },
  { nome: "Charcoal", descricao: "Neutro atemporal", primaria: "#171717", secundaria: "#fafafa", destaque: "#d4d4d4" },
  { nome: "Onyx", descricao: "Contraste marcante", primaria: "#0a0a0a", secundaria: "#ffffff", destaque: "#737373" },
];

export function ConfiguracaoBarbearia({ onSalvar }: ConfiguracaoBarbeariaProps) {
  const { tenant, atualizarTenant } = useAuth();
  const inputFileRef = useRef<HTMLInputElement>(null);
  
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [uploadando, setUploadando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  
  const [dados, setDados] = useState({
    nome: "",
    logo_url: "",
    cor_primaria: "#18181b",
    cor_secundaria: "#f4f4f5",
    cor_destaque: "#a1a1aa",
    telefone: "",
    whatsapp: "",
    email: "",
    endereco: "",
    cidade: "",
    estado: "",
    instagram: "",
  });

  // Carregar dados do tenant
  useEffect(() => {
    if (tenant) {
      setDados({
        nome: tenant.nome || "",
        logo_url: tenant.logo_url || "",
        cor_primaria: tenant.cor_primaria || "#18181b",
        cor_secundaria: tenant.cor_secundaria || "#f4f4f5",
        cor_destaque: tenant.cor_destaque || "#a1a1aa",
        telefone: tenant.telefone || "",
        whatsapp: tenant.whatsapp || "",
        email: tenant.email || "",
        endereco: tenant.endereco || "",
        cidade: tenant.cidade || "",
        estado: tenant.estado || "",
        instagram: tenant.instagram || "",
      });
    }
  }, [tenant]);

  // Upload de logo com deleção da anterior
  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenant) return;

    setUploadando(true);
    setMensagem(null);

    try {
      // Se já existe uma logo, deletar do R2
      if (dados.logo_url) {
        try {
          await fetch(`/api/upload?url=${encodeURIComponent(dados.logo_url)}`, {
            method: "DELETE",
          });
        } catch (err) {
          console.warn("Erro ao deletar logo anterior:", err);
        }
      }

      // Upload da nova logo
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tenant_id", tenant.id);
      formData.append("tipo", "logo");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setDados((prev) => ({ ...prev, logo_url: data.url }));
      setMensagem({ tipo: "sucesso", texto: "Logo atualizada com sucesso!" });
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      setMensagem({ tipo: "erro", texto: error.message || "Erro ao fazer upload da logo" });
    } finally {
      setUploadando(false);
      if (inputFileRef.current) {
        inputFileRef.current.value = "";
      }
    }
  };

  // Remover logo
  const handleRemoverLogo = async () => {
    if (!dados.logo_url) return;

    setUploadando(true);
    try {
      await fetch(`/api/upload?url=${encodeURIComponent(dados.logo_url)}`, {
        method: "DELETE",
      });
      setDados((prev) => ({ ...prev, logo_url: "" }));
      setMensagem({ tipo: "sucesso", texto: "Logo removida com sucesso!" });
    } catch (error) {
      console.error("Erro ao remover logo:", error);
      setMensagem({ tipo: "erro", texto: "Erro ao remover logo" });
    } finally {
      setUploadando(false);
    }
  };

  // Aplicar paleta predefinida
  const aplicarPaleta = (paleta: typeof CORES_PREDEFINIDAS[0]) => {
    setDados((prev) => ({
      ...prev,
      cor_primaria: paleta.primaria,
      cor_secundaria: paleta.secundaria,
      cor_destaque: paleta.destaque,
    }));
  };

  // Salvar configurações
  const handleSalvar = async () => {
    if (!tenant) return;

    setSalvando(true);
    setMensagem(null);

    try {
      const { error } = await supabase
        .from("tenants")
        .update({
          nome: dados.nome,
          logo_url: dados.logo_url || null,
          cor_primaria: dados.cor_primaria,
          cor_secundaria: dados.cor_secundaria,
          cor_destaque: dados.cor_destaque,
          telefone: dados.telefone || null,
          whatsapp: dados.whatsapp || null,
          email: dados.email,
          endereco: dados.endereco || null,
          cidade: dados.cidade || null,
          estado: dados.estado || null,
          instagram: dados.instagram || null,
        })
        .eq("id", tenant.id);

      if (error) throw error;

      // Atualizar contexto
      if (atualizarTenant) {
        await atualizarTenant({
          ...tenant,
          ...dados,
        });
      }

      setMensagem({ tipo: "sucesso", texto: "Configurações salvas com sucesso!" });
      onSalvar?.();
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      setMensagem({ tipo: "erro", texto: error.message || "Erro ao salvar configurações" });
    } finally {
      setSalvando(false);
    }
  };

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Mensagem de feedback */}
      <AnimatePresence>
        {mensagem && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl flex items-center gap-3 ${
              mensagem.tipo === "sucesso"
                ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800"
            }`}
          >
            {mensagem.tipo === "sucesso" ? (
              <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <X className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            )}
            <span className={mensagem.tipo === "sucesso" 
              ? "text-emerald-700 dark:text-emerald-300" 
              : "text-rose-700 dark:text-rose-300"
            }>
              {mensagem.texto}
            </span>
            <button
              onClick={() => setMensagem(null)}
              className="ml-auto p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Coluna Esquerda - Logo e Cores */}
        <div className="space-y-6">
          {/* Logo */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Logo da Barbearia
            </h3>

            <div className="flex flex-col items-center gap-4">
              {/* Preview da Logo */}
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center">
                {dados.logo_url ? (
                  <Image
                    src={dados.logo_url}
                    alt="Logo"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <Store className="w-12 h-12 text-zinc-400" />
                )}
                {uploadando && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                )}
              </div>

              {/* Botões de ação */}
              <div className="flex gap-2">
                <button
                  onClick={() => inputFileRef.current?.click()}
                  disabled={uploadando}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {dados.logo_url ? "Trocar" : "Enviar"}
                </button>
                {dados.logo_url && (
                  <button
                    onClick={handleRemoverLogo}
                    disabled={uploadando}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-xl hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remover
                  </button>
                )}
              </div>
              <input
                ref={inputFileRef}
                type="file"
                accept="image/*"
                onChange={handleUploadLogo}
                className="hidden"
              />
              <p className="text-xs text-zinc-500 text-center">
                Formatos: JPG, PNG, WebP • Máx: 5MB
              </p>
            </div>
          </div>

          {/* Paletas de Cores */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Estilos Visuais
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CORES_PREDEFINIDAS.map((paleta, index) => {
                const selecionada = dados.cor_primaria === paleta.primaria &&
                  dados.cor_secundaria === paleta.secundaria &&
                  dados.cor_destaque === paleta.destaque;
                return (
                  <button
                    key={index}
                    onClick={() => aplicarPaleta(paleta)}
                    className={`relative p-4 rounded-xl border-2 transition-all hover:scale-[1.02] bg-zinc-50 dark:bg-zinc-800 ${
                      selecionada
                        ? "border-zinc-900 dark:border-white"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
                    }`}
                  >
                    {selecionada && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-4 h-4 text-zinc-900 dark:text-white" />
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-8 h-8 rounded-lg border border-zinc-300 dark:border-zinc-600"
                        style={{ backgroundColor: paleta.primaria }}
                      />
                      <div
                        className="w-8 h-8 rounded-lg border border-zinc-300 dark:border-zinc-600"
                        style={{ backgroundColor: paleta.secundaria }}
                      />
                    </div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white text-left">
                      {paleta.nome}
                    </p>
                    <p className="text-xs text-zinc-500 text-left">
                      {paleta.descricao}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cores Personalizadas */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              Cores Personalizadas
            </h3>

            <div className="space-y-4">
              {/* Cor Primária */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Cor Primária (Fundo/Cabeçalho)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={dados.cor_primaria}
                    onChange={(e) => setDados({ ...dados, cor_primaria: e.target.value })}
                    className="w-12 h-12 rounded-xl cursor-pointer border-2 border-zinc-200 dark:border-zinc-700"
                  />
                  <input
                    type="text"
                    value={dados.cor_primaria}
                    onChange={(e) => setDados({ ...dados, cor_primaria: e.target.value })}
                    className="flex-1 px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white font-mono text-sm"
                  />
                </div>
              </div>

              {/* Cor Secundária */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Cor Secundária (Texto/Fundo Cards)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={dados.cor_secundaria}
                    onChange={(e) => setDados({ ...dados, cor_secundaria: e.target.value })}
                    className="w-12 h-12 rounded-xl cursor-pointer border-2 border-zinc-200 dark:border-zinc-700"
                  />
                  <input
                    type="text"
                    value={dados.cor_secundaria}
                    onChange={(e) => setDados({ ...dados, cor_secundaria: e.target.value })}
                    className="flex-1 px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white font-mono text-sm"
                  />
                </div>
              </div>

              {/* Cor de Destaque */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Cor de Destaque (Botões/Links)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={dados.cor_destaque}
                    onChange={(e) => setDados({ ...dados, cor_destaque: e.target.value })}
                    className="w-12 h-12 rounded-xl cursor-pointer border-2 border-zinc-200 dark:border-zinc-700"
                  />
                  <input
                    type="text"
                    value={dados.cor_destaque}
                    onChange={(e) => setDados({ ...dados, cor_destaque: e.target.value })}
                    className="flex-1 px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Preview das cores */}
            <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: dados.cor_primaria }}>
              <p className="text-sm font-medium" style={{ color: dados.cor_secundaria }}>
                Preview do visual
              </p>
              <button
                className="mt-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: dados.cor_destaque, color: dados.cor_primaria }}
              >
                Botão de Exemplo
              </button>
            </div>
          </div>
        </div>

        {/* Coluna Direita - Dados e Contato */}
        <div className="space-y-6">
          {/* Dados Básicos */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <Store className="w-5 h-5" />
              Dados da Barbearia
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Nome da Barbearia
                </label>
                <input
                  type="text"
                  value={dados.nome}
                  onChange={(e) => setDados({ ...dados, nome: e.target.value })}
                  placeholder="Ex: Barbearia Premium"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="email"
                    value={dados.email}
                    onChange={(e) => setDados({ ...dados, email: e.target.value })}
                    placeholder="contato@barbearia.com"
                    className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Contato
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={dados.telefone}
                  onChange={(e) => setDados({ ...dados, telefone: e.target.value })}
                  placeholder="(00) 0000-0000"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={dados.whatsapp}
                  onChange={(e) => setDados({ ...dados, whatsapp: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Instagram
                </label>
                <div className="relative">
                  <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={dados.instagram}
                    onChange={(e) => setDados({ ...dados, instagram: e.target.value })}
                    placeholder="@suabarbearia"
                    className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Endereço
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  value={dados.endereco}
                  onChange={(e) => setDados({ ...dados, endereco: e.target.value })}
                  placeholder="Rua, número, bairro"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={dados.cidade}
                    onChange={(e) => setDados({ ...dados, cidade: e.target.value })}
                    placeholder="Cidade"
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Estado
                  </label>
                  <input
                    type="text"
                    value={dados.estado}
                    onChange={(e) => setDados({ ...dados, estado: e.target.value })}
                    placeholder="UF"
                    maxLength={2}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Link do Site */}
          <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-700 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <Globe className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Seu Site Está no Ar!</h3>
            </div>
            <p className="text-zinc-300 text-sm mb-4">
              Compartilhe o link abaixo com seus clientes para que eles possam agendar online.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-2 bg-white/10 rounded-xl font-mono text-sm truncate">
                {typeof window !== 'undefined' ? window.location.origin : ''}/{tenant.slug}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/${tenant.slug}`);
                  setMensagem({ tipo: "sucesso", texto: "Link copiado!" });
                }}
                className="px-4 py-2 bg-white text-zinc-900 rounded-xl font-medium hover:bg-zinc-100 transition-colors"
              >
                Copiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Botão Salvar */}
      <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <button
          onClick={handleSalvar}
          disabled={salvando}
          className="flex items-center gap-2 px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {salvando ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Salvar Alterações
            </>
          )}
        </button>
      </div>
    </div>
  );
}
