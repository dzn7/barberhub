"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Store, Palette, Upload, Trash2, Check, X, Save, Loader2,
  Eye, ImageIcon, Phone, Mail,
  MapPin, Instagram, Globe, Smartphone, Type, Search
} from "lucide-react";
import { PreviewSite } from "@/components/configuracao/PreviewSite";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTerminologia } from "@/hooks/useTerminologia";
import { TipoNegocio, ehTipoNegocioFeminino } from "@/lib/tipos-negocio";
import { obterClasseFonte as obterClasseFonteUtil } from "@/lib/fontes";

interface ConfiguracaoBarbeariaProps {
  onSalvar?: () => void;
}

// Paletas sofisticadas e elegantes - design monocromático profissional
const CORES_BARBEARIA = [
  // Tons escuros clássicos
  { nome: "Obsidian", descricao: "Elegância clássica", primaria: "#09090b", secundaria: "#fafafa", destaque: "#fafafa" },
  { nome: "Grafite", descricao: "Minimalismo moderno", primaria: "#18181b", secundaria: "#f4f4f5", destaque: "#a1a1aa" },
  { nome: "Midnight", descricao: "Sofisticação noturna", primaria: "#0c0a09", secundaria: "#fafaf9", destaque: "#a8a29e" },
  { nome: "Slate", descricao: "Profissional discreto", primaria: "#0f172a", secundaria: "#f8fafc", destaque: "#94a3b8" },
  { nome: "Charcoal", descricao: "Neutro atemporal", primaria: "#171717", secundaria: "#fafafa", destaque: "#d4d4d4" },
  { nome: "Onyx", descricao: "Contraste marcante", primaria: "#0a0a0a", secundaria: "#ffffff", destaque: "#737373" },
  // Tons com cor
  { nome: "Navy", descricao: "Azul profundo", primaria: "#0c1929", secundaria: "#f0f9ff", destaque: "#38bdf8" },
  { nome: "Forest", descricao: "Verde floresta", primaria: "#052e16", secundaria: "#f0fdf4", destaque: "#4ade80" },
  { nome: "Wine", descricao: "Vinho elegante", primaria: "#1c0a0a", secundaria: "#fef2f2", destaque: "#f87171" },
  { nome: "Royal", descricao: "Roxo real", primaria: "#1e1033", secundaria: "#faf5ff", destaque: "#a78bfa" },
  { nome: "Copper", descricao: "Cobre vintage", primaria: "#1c1210", secundaria: "#fffbeb", destaque: "#f59e0b" },
  { nome: "Ocean", descricao: "Oceano profundo", primaria: "#0c1a1f", secundaria: "#ecfeff", destaque: "#22d3d8" },
  // Tons claros
  { nome: "Snow", descricao: "Branco neve", primaria: "#ffffff", secundaria: "#18181b", destaque: "#71717a" },
  { nome: "Pearl", descricao: "Pérola suave", primaria: "#fafafa", secundaria: "#27272a", destaque: "#a1a1aa" },
  { nome: "Cream", descricao: "Creme clássico", primaria: "#fffbeb", secundaria: "#292524", destaque: "#a8a29e" },
  { nome: "Mint", descricao: "Menta fresca", primaria: "#f0fdf4", secundaria: "#14532d", destaque: "#22c55e" },
];

// Paletas especiais para Nail Designers - tons femininos e sofisticados
const CORES_NAIL_DESIGNER = [
  // Tons rosados e nude
  { nome: "Rose Gold", descricao: "Elegância rosé", primaria: "#2d1f1f", secundaria: "#fff5f5", destaque: "#e8a4a4" },
  { nome: "Blush", descricao: "Rosa delicado", primaria: "#1f1a1a", secundaria: "#fdf2f8", destaque: "#f9a8d4" },
  { nome: "Nude", descricao: "Nude sofisticado", primaria: "#292524", secundaria: "#fef7f0", destaque: "#d4a574" },
  { nome: "Mauve", descricao: "Malva elegante", primaria: "#1c1a1e", secundaria: "#faf5ff", destaque: "#c4b5fd" },
  { nome: "Dusty Rose", descricao: "Rosa antigo", primaria: "#1a1516", secundaria: "#fff1f2", destaque: "#fb7185" },
  { nome: "Champagne", descricao: "Champanhe luxuoso", primaria: "#1c1a15", secundaria: "#fefce8", destaque: "#fbbf24" },
  // Tons elegantes
  { nome: "Burgundy", descricao: "Bordô clássico", primaria: "#1a0a0a", secundaria: "#fef2f2", destaque: "#be123c" },
  { nome: "Plum", descricao: "Ameixa refinada", primaria: "#1a0f1a", secundaria: "#fdf4ff", destaque: "#a855f7" },
  { nome: "Berry", descricao: "Frutas vermelhas", primaria: "#1c0e12", secundaria: "#fdf2f8", destaque: "#db2777" },
  { nome: "Terracotta", descricao: "Terracota chic", primaria: "#1c1210", secundaria: "#fff7ed", destaque: "#ea580c" },
  { nome: "Sage", descricao: "Sálvia suave", primaria: "#0f1a14", secundaria: "#f0fdf4", destaque: "#86efac" },
  { nome: "Lavender", descricao: "Lavanda sonhadora", primaria: "#16141f", secundaria: "#f5f3ff", destaque: "#a78bfa" },
  // Tons neutros premium
  { nome: "Marble", descricao: "Mármore luxuoso", primaria: "#fafafa", secundaria: "#18181b", destaque: "#a1a1aa" },
  { nome: "Ivory", descricao: "Marfim clássico", primaria: "#fffbf5", secundaria: "#292524", destaque: "#c2a98a" },
  { nome: "Graphite", descricao: "Grafite moderno", primaria: "#1f1f1f", secundaria: "#f5f5f5", destaque: "#9ca3af" },
  { nome: "Obsidian", descricao: "Preto luxuoso", primaria: "#09090b", secundaria: "#fafafa", destaque: "#e8a4a4" },
  // Tons tendência
  { nome: "Millennial Pink", descricao: "Rosa millennial", primaria: "#1a1518", secundaria: "#fce7f3", destaque: "#f472b6" },
  { nome: "Coral", descricao: "Coral vibrante", primaria: "#1c1412", secundaria: "#fff7ed", destaque: "#f97316" },
  { nome: "Mint Cream", descricao: "Menta cremosa", primaria: "#0f1a17", secundaria: "#ecfdf5", destaque: "#34d399" },
  { nome: "Peach", descricao: "Pêssego delicado", primaria: "#1a1614", secundaria: "#fff8f5", destaque: "#fdba74" },
];

type CategoriaFonte = "sans" | "serif" | "display";
type CategoriaFonteFiltro = "todas" | CategoriaFonte;

interface FonteDisponivel {
  nome: string;
  descricao: string;
  categoria: CategoriaFonte;
  indicadaPara: string;
}

interface CombinacaoTipografica {
  id: string;
  nome: string;
  descricao: string;
  fontePrincipal: string;
  fonteTitulos: string;
  segmentos: TipoNegocio[];
}

const FONTES_DISPONIVEIS: FonteDisponivel[] = [
  { nome: "Inter", descricao: "Limpa e muito legível", categoria: "sans", indicadaPara: "Texto geral" },
  { nome: "Poppins", descricao: "Geométrica e moderna", categoria: "sans", indicadaPara: "Marca jovem" },
  { nome: "Roboto", descricao: "Neutra e estável", categoria: "sans", indicadaPara: "Operação do dia a dia" },
  { nome: "Montserrat", descricao: "Presença forte", categoria: "sans", indicadaPara: "Títulos marcantes" },
  { nome: "Open Sans", descricao: "Confortável em blocos longos", categoria: "sans", indicadaPara: "Descrições extensas" },
  { nome: "Lato", descricao: "Amigável e equilibrada", categoria: "sans", indicadaPara: "Atendimento próximo" },
  { nome: "Raleway", descricao: "Elegante e fina", categoria: "sans", indicadaPara: "Visual refinado" },
  { nome: "Nunito", descricao: "Arredondada e acolhedora", categoria: "sans", indicadaPara: "Tom leve" },
  { nome: "DM Sans", descricao: "Contemporânea e premium", categoria: "sans", indicadaPara: "SaaS e marca atual" },
  { nome: "Manrope", descricao: "Sólida para interfaces", categoria: "sans", indicadaPara: "Painéis e mobile" },
  { nome: "Playfair Display", descricao: "Serifada clássica", categoria: "serif", indicadaPara: "Percepção de luxo" },
  { nome: "Merriweather", descricao: "Serifada editorial", categoria: "serif", indicadaPara: "Autoridade e tradição" },
  { nome: "Cormorant Garamond", descricao: "Sofisticada e autoral", categoria: "serif", indicadaPara: "Estúdios de beleza" },
  { nome: "Space Grotesk", descricao: "Tech com personalidade", categoria: "display", indicadaPara: "Visual moderno" },
  { nome: "Oswald", descricao: "Condensada e impactante", categoria: "display", indicadaPara: "Chamadas curtas" },
  { nome: "Bebas Neue", descricao: "Display forte e direta", categoria: "display", indicadaPara: "Promoções e banners" },
];

const CATEGORIAS_FONTE: { id: CategoriaFonteFiltro; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "sans", label: "Sem serifa" },
  { id: "serif", label: "Serifadas" },
  { id: "display", label: "Display" },
];

const COMBINACOES_TIPOGRAFICAS: CombinacaoTipografica[] = [
  {
    id: "clean-pro",
    nome: "Clean Profissional",
    descricao: "Leitura confortável e visual moderno",
    fontePrincipal: "Inter",
    fonteTitulos: "Montserrat",
    segmentos: ["barbearia", "nail_designer", "lash_designer", "cabeleireira"],
  },
  {
    id: "editorial-luxo",
    nome: "Editorial Luxo",
    descricao: "Presença premium para marca sofisticada",
    fontePrincipal: "DM Sans",
    fonteTitulos: "Playfair Display",
    segmentos: ["nail_designer", "lash_designer", "cabeleireira", "barbearia"],
  },
  {
    id: "contemporaneo-tech",
    nome: "Contemporâneo",
    descricao: "Energia moderna sem perder clareza",
    fontePrincipal: "Manrope",
    fonteTitulos: "Space Grotesk",
    segmentos: ["barbearia", "lash_designer", "nail_designer", "cabeleireira"],
  },
  {
    id: "tradicao-premium",
    nome: "Tradição Premium",
    descricao: "Tom clássico com ar de confiança",
    fontePrincipal: "Open Sans",
    fonteTitulos: "Merriweather",
    segmentos: ["barbearia", "cabeleireira", "nail_designer", "lash_designer"],
  },
  {
    id: "impacto-campanha",
    nome: "Impacto em Campanhas",
    descricao: "Chamada forte para promoções e ações",
    fontePrincipal: "Poppins",
    fonteTitulos: "Bebas Neue",
    segmentos: ["barbearia", "lash_designer", "nail_designer", "cabeleireira"],
  },
];

export function ConfiguracaoBarbearia({ onSalvar }: ConfiguracaoBarbeariaProps) {
  const { tenant, atualizarTenant } = useAuth();
  const { terminologia } = useTerminologia();
  const tipoNegocio = (tenant?.tipo_negocio as TipoNegocio) || 'barbearia';
  const ehSegmentoFeminino = ehTipoNegocioFeminino(tipoNegocio);
  const preposicaoEstabelecimento = terminologia.estabelecimento.artigo === 'a' ? 'da' : 'do';
  const pronomePossessivoEstabelecimento = terminologia.estabelecimento.artigo === 'a' ? 'sua' : 'seu';
  const EXEMPLOS_POR_TIPO: Record<TipoNegocio, {
    nome: string;
    email: string;
    instagram: string;
    boasVindas: string;
    servico1: string;
    servico1Detalhe: string;
    servico2: string;
    servico2Detalhe: string;
  }> = {
    barbearia: {
      nome: 'Barbearia Premium',
      email: 'contato@barbeariapremium.com',
      instagram: '@barbeariapremium',
      boasVindas: 'Bem-vindo ao nosso espaço',
      servico1: '✂️ Corte Masculino',
      servico1Detalhe: '30 min • R$ 35,00',
      servico2: '🧔 Barba Completa',
      servico2Detalhe: '20 min • R$ 25,00'
    },
    nail_designer: {
      nome: 'Estúdio Bella Nails',
      email: 'contato@estudiobellanails.com',
      instagram: '@estudiobellanails',
      boasVindas: 'Bem-vinda ao nosso espaço',
      servico1: '💅 Unhas em Gel',
      servico1Detalhe: '60 min • R$ 120,00',
      servico2: '✨ Esmaltação',
      servico2Detalhe: '30 min • R$ 45,00'
    },
    lash_designer: {
      nome: 'Estúdio Bella Cílios',
      email: 'contato@estudiobellacilios.com',
      instagram: '@estudiobellacilios',
      boasVindas: 'Bem-vinda ao nosso espaço',
      servico1: '✨ Extensão Fio a Fio',
      servico1Detalhe: '90 min • R$ 150,00',
      servico2: '💫 Lash Lifting',
      servico2Detalhe: '60 min • R$ 120,00'
    },
    cabeleireira: {
      nome: 'Salão Bella',
      email: 'contato@salaobella.com',
      instagram: '@salaobella',
      boasVindas: 'Bem-vinda ao nosso salão',
      servico1: '💇‍♀️ Corte Feminino',
      servico1Detalhe: '60 min • R$ 90,00',
      servico2: '🌟 Escova Modelada',
      servico2Detalhe: '45 min • R$ 70,00'
    }
  };
  const exemploAtual = EXEMPLOS_POR_TIPO[tipoNegocio];
  const inputFileRef = useRef<HTMLInputElement>(null);
  
  const [salvando, setSalvando] = useState(false);
  const [uploadando, setUploadando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [mostrarPreviewMobile, setMostrarPreviewMobile] = useState(false);
  
  const [dados, setDados] = useState({
    nome: "",
    logo_url: "",
    icone_pwa_192: "",
    icone_pwa_512: "",
    cor_primaria: "#18181b",
    cor_secundaria: "#f4f4f5",
    cor_destaque: "#a1a1aa",
    cor_texto: "#fafafa",
    fonte_principal: "Inter",
    fonte_titulos: "Inter",
    telefone: "",
    whatsapp: "",
    email: "",
    endereco: "",
    cidade: "",
    estado: "",
    instagram: "",
  });

  const [buscaFonte, setBuscaFonte] = useState("");
  const [categoriaFonte, setCategoriaFonte] = useState<CategoriaFonteFiltro>("todas");
  const [sincronizarFontes, setSincronizarFontes] = useState(false);
  const [textoPreviewTipografia, setTextoPreviewTipografia] = useState(
    `${terminologia.estabelecimento.singular} ${tenant?.nome ? `• ${tenant.nome}` : ""}`.trim()
  );

  const obterClasseFonte = (nomeFonte: string) => obterClasseFonteUtil(nomeFonte);

  const fontesFiltradas = useMemo(() => {
    const termo = buscaFonte.trim().toLowerCase();

    return FONTES_DISPONIVEIS.filter((fonte) => {
      const bateCategoria = categoriaFonte === "todas" || fonte.categoria === categoriaFonte;
      if (!bateCategoria) return false;

      if (!termo) return true;

      return (
        fonte.nome.toLowerCase().includes(termo) ||
        fonte.descricao.toLowerCase().includes(termo) ||
        fonte.indicadaPara.toLowerCase().includes(termo)
      );
    });
  }, [buscaFonte, categoriaFonte]);

  const combinacoesRecomendadas = useMemo(() => {
    return COMBINACOES_TIPOGRAFICAS.filter((combinacao) =>
      combinacao.segmentos.includes(tipoNegocio)
    );
  }, [tipoNegocio]);

  const selecionarFontePrincipal = (nomeFonte: string) => {
    setDados((prev) => ({
      ...prev,
      fonte_principal: nomeFonte,
      ...(sincronizarFontes ? { fonte_titulos: nomeFonte } : {}),
    }));
  };

  const selecionarFonteTitulos = (nomeFonte: string) => {
    setDados((prev) => ({
      ...prev,
      fonte_titulos: nomeFonte,
    }));
  };

  const aplicarCombinacaoTipografica = (combinacao: CombinacaoTipografica) => {
    setDados((prev) => ({
      ...prev,
      fonte_principal: combinacao.fontePrincipal,
      fonte_titulos: combinacao.fonteTitulos,
    }));
  };

  // Carregar dados do tenant
  useEffect(() => {
    if (tenant) {
      setDados({
        nome: tenant.nome || "",
        logo_url: tenant.logo_url || "",
        icone_pwa_192: tenant.icone_pwa_192 || "",
        icone_pwa_512: tenant.icone_pwa_512 || "",
        cor_primaria: tenant.cor_primaria || "#18181b",
        cor_secundaria: tenant.cor_secundaria || "#f4f4f5",
        cor_destaque: tenant.cor_destaque || "#a1a1aa",
        cor_texto: tenant.cor_texto || "#fafafa",
        fonte_principal: tenant.fonte_principal || "Inter",
        fonte_titulos: tenant.fonte_titulos || "Inter",
        telefone: tenant.telefone || "",
        whatsapp: tenant.whatsapp || "",
        email: tenant.email || "",
        endereco: tenant.endereco || "",
        cidade: tenant.cidade || "",
        estado: tenant.estado || "",
        instagram: tenant.instagram || "",
      });
      setTextoPreviewTipografia(`${terminologia.estabelecimento.singular} • ${tenant.nome}`);
    }
  }, [tenant, terminologia.estabelecimento.singular]);

  useEffect(() => {
    if (!sincronizarFontes) return;

    setDados((prev) => {
      if (prev.fonte_titulos === prev.fonte_principal) return prev;
      return {
        ...prev,
        fonte_titulos: prev.fonte_principal,
      };
    });
  }, [sincronizarFontes]);

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

      // Gerar ícones PWA com a nova logo para refletir a troca no app instalado
      let icone192 = "";
      let icone512 = "";
      try {
        const formDataPwa = new FormData();
        formDataPwa.append("file", file);
        formDataPwa.append("tenant_id", tenant.id);

        const respostaPwa = await fetch("/api/gerar-icones-pwa", {
          method: "POST",
          body: formDataPwa,
        });

        if (respostaPwa.ok) {
          const dadosPwa = await respostaPwa.json();
          icone192 = dadosPwa.icone_192 || "";
          icone512 = dadosPwa.icone_512 || "";
        }
      } catch (erroPwa) {
        console.warn("Não foi possível gerar ícones PWA:", erroPwa);
      }

      setDados((prev) => ({
        ...prev,
        logo_url: data.url,
        icone_pwa_192: icone192 || prev.icone_pwa_192,
        icone_pwa_512: icone512 || prev.icone_pwa_512,
      }));
      setMensagem({ tipo: "sucesso", texto: "Logo e ícones PWA atualizados com sucesso! Clique em Salvar para aplicar no site." });
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
      setDados((prev) => ({ ...prev, logo_url: "", icone_pwa_192: "", icone_pwa_512: "" }));
      setMensagem({ tipo: "sucesso", texto: "Logo removida com sucesso!" });
    } catch (error) {
      console.error("Erro ao remover logo:", error);
      setMensagem({ tipo: "erro", texto: "Erro ao remover logo" });
    } finally {
      setUploadando(false);
    }
  };

  // Aplicar paleta predefinida
  // Obter cores baseadas no tipo de negócio
  const coresPredefinidas = ehSegmentoFeminino ? CORES_NAIL_DESIGNER : CORES_BARBEARIA;
  
  const aplicarPaleta = (paleta: typeof CORES_BARBEARIA[0]) => {
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
          icone_pwa_192: dados.icone_pwa_192 || null,
          icone_pwa_512: dados.icone_pwa_512 || null,
          cor_primaria: dados.cor_primaria,
          cor_secundaria: dados.cor_secundaria,
          cor_destaque: dados.cor_destaque,
          cor_texto: dados.cor_texto,
          fonte_principal: dados.fonte_principal,
          fonte_titulos: dados.fonte_titulos,
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
              Logo {preposicaoEstabelecimento} {terminologia.estabelecimento.singular}
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
              {coresPredefinidas.map((paleta, index) => {
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
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
              Cores Personalizadas
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Ajuste cada cor individualmente para criar sua identidade visual única
            </p>

            <div className="space-y-4">
              {/* Cor Primária */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Cor de Fundo Principal
                </label>
                <p className="text-xs text-zinc-500 mb-2">Cor do cabeçalho e fundo principal do site</p>
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
                    className="flex-1 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white font-mono text-sm"
                  />
                </div>
              </div>

              {/* Cor de Texto */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Cor do Texto
                </label>
                <p className="text-xs text-zinc-500 mb-2">Cor dos textos e títulos sobre o fundo principal</p>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={dados.cor_texto}
                    onChange={(e) => setDados({ ...dados, cor_texto: e.target.value })}
                    className="w-12 h-12 rounded-xl cursor-pointer border-2 border-zinc-200 dark:border-zinc-700"
                  />
                  <input
                    type="text"
                    value={dados.cor_texto}
                    onChange={(e) => setDados({ ...dados, cor_texto: e.target.value })}
                    className="flex-1 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white font-mono text-sm"
                  />
                </div>
              </div>

              {/* Cor Secundária */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Cor dos Cards
                </label>
                <p className="text-xs text-zinc-500 mb-2">Cor de fundo dos cards de serviços e profissionais</p>
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
                    className="flex-1 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white font-mono text-sm"
                  />
                </div>
              </div>

              {/* Cor de Destaque */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Cor de Destaque
                </label>
                <p className="text-xs text-zinc-500 mb-2">Cor dos botões, links e elementos de ação</p>
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
                    className="flex-1 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fontes */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Type className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Tipografia do Site
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Defina como {pronomePossessivoEstabelecimento} {terminologia.estabelecimento.singular.toLowerCase()} comunica estilo, clareza e personalidade.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Busca + filtros */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={buscaFonte}
                    onChange={(e) => setBuscaFonte(e.target.value)}
                    placeholder="Buscar por nome, estilo ou uso (ex: luxo, leitura, promoção)"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  {CATEGORIAS_FONTE.map((categoria) => (
                    <button
                      key={categoria.id}
                      onClick={() => setCategoriaFonte(categoria.id)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        categoriaFonte === categoria.id
                          ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {categoria.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Combinações prontas */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Type className="w-4 h-4 text-zinc-500" />
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Combinações prontas para aplicar em 1 clique
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {combinacoesRecomendadas.map((combinacao) => {
                    const ativa =
                      dados.fonte_principal === combinacao.fontePrincipal &&
                      dados.fonte_titulos === combinacao.fonteTitulos;

                    return (
                      <button
                        key={combinacao.id}
                        onClick={() => aplicarCombinacaoTipografica(combinacao)}
                        className={`p-3 rounded-xl text-left border transition-colors ${
                          ativa
                            ? "border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                            : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-500"
                        }`}
                      >
                        <p className="text-sm font-semibold">{combinacao.nome}</p>
                        <p className={`text-xs mt-1 ${ativa ? "text-white/75 dark:text-zinc-900/70" : "text-zinc-500 dark:text-zinc-400"}`}>
                          {combinacao.descricao}
                        </p>
                        <p className={`text-xs mt-2 ${ativa ? "text-white/85 dark:text-zinc-900/80" : "text-zinc-600 dark:text-zinc-300"}`}>
                          {combinacao.fontePrincipal} + {combinacao.fonteTitulos}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seleção atual */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Fonte dos textos</p>
                  <p className={`text-base font-semibold ${obterClasseFonte(dados.fonte_principal)}`}>
                    {dados.fonte_principal}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Fonte dos títulos</p>
                  <p className={`text-base font-semibold ${obterClasseFonte(dados.fonte_titulos)}`}>
                    {dados.fonte_titulos}
                  </p>
                </div>
              </div>

              {/* Opção de simplificação */}
              <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/70">
                <div>
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Usar a mesma fonte para tudo
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Ideal para um visual mais limpo e fácil de manter.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={sincronizarFontes}
                  onChange={(e) => setSincronizarFontes(e.target.checked)}
                  className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 focus:ring-zinc-900"
                />
              </label>

              {/* Escolha das fontes */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Escolha a fonte dos textos
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {fontesFiltradas.map((fonte) => {
                      const ativa = dados.fonte_principal === fonte.nome;
                      return (
                        <button
                          key={`principal-${fonte.nome}`}
                          onClick={() => selecionarFontePrincipal(fonte.nome)}
                          className={`p-3 rounded-xl text-left transition-colors border ${
                            ativa
                              ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white"
                              : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
                          }`}
                        >
                          <p className={`text-sm font-semibold ${obterClasseFonte(fonte.nome)}`}>{fonte.nome}</p>
                          <p className={`text-xs mt-1 ${ativa ? "text-white/70 dark:text-zinc-900/70" : "text-zinc-500 dark:text-zinc-400"}`}>
                            {fonte.descricao}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {!sincronizarFontes && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Escolha a fonte dos títulos e destaques
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {fontesFiltradas.map((fonte) => {
                        const ativa = dados.fonte_titulos === fonte.nome;
                        return (
                          <button
                            key={`titulo-${fonte.nome}`}
                            onClick={() => selecionarFonteTitulos(fonte.nome)}
                            className={`p-3 rounded-xl text-left transition-colors border ${
                              ativa
                                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white"
                                : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
                            }`}
                          >
                            <p className={`text-sm font-semibold ${obterClasseFonte(fonte.nome)}`}>{fonte.nome}</p>
                            <p className={`text-xs mt-1 ${ativa ? "text-white/70 dark:text-zinc-900/70" : "text-zinc-500 dark:text-zinc-400"}`}>
                              Indicado para: {fonte.indicadaPara}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {fontesFiltradas.length === 0 && (
                  <div className="p-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-zinc-500 dark:text-zinc-400 text-center">
                    Nenhuma fonte encontrada para esse filtro. Ajuste a busca ou a categoria.
                  </div>
                )}
              </div>

              {/* Prévia tipográfica */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/70 space-y-3">
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Texto para testar a tipografia
                </label>
                <input
                  type="text"
                  value={textoPreviewTipografia}
                  onChange={(e) => setTextoPreviewTipografia(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                />
                <div>
                  <p className={`text-xl sm:text-2xl leading-tight ${obterClasseFonte(dados.fonte_titulos)}`}>
                    {textoPreviewTipografia || "Título de destaque"}
                  </p>
                  <p className={`mt-2 text-sm text-zinc-600 dark:text-zinc-300 ${obterClasseFonte(dados.fonte_principal)}`}>
                    Esta frase simula descrições de serviços, horários e instruções para clientes no mobile.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Preview em Tempo Real */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Preview em Tempo Real
            </h3>
            
            <div 
              className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700"
              style={{ backgroundColor: dados.cor_primaria }}
            >
              {/* Header simulado */}
              <div className="p-4 border-b" style={{ borderColor: dados.cor_destaque + '30' }}>
                <h4 
                  className={`text-lg font-bold ${obterClasseFonte(dados.fonte_titulos)}`}
                  style={{ color: dados.cor_texto }}
                >
                  {dados.nome || exemploAtual.nome}
                </h4>
                <p 
                  className={`text-sm opacity-80 ${obterClasseFonte(dados.fonte_principal)}`}
                  style={{ color: dados.cor_texto }}
                >
                  {exemploAtual.boasVindas}
                </p>
              </div>

              {/* Cards simulados */}
              <div className="p-4 space-y-3">
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: dados.cor_secundaria }}
                >
                  <p 
                    className={`font-medium text-sm ${obterClasseFonte(dados.fonte_principal)}`}
                    style={{ color: dados.cor_primaria }}
                  >
                    {exemploAtual.servico1}
                  </p>
                  <p 
                    className="text-xs opacity-70"
                    style={{ color: dados.cor_primaria }}
                  >
                    {exemploAtual.servico1Detalhe}
                  </p>
                </div>

                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: dados.cor_secundaria }}
                >
                  <p 
                    className={`font-medium text-sm ${obterClasseFonte(dados.fonte_principal)}`}
                    style={{ color: dados.cor_primaria }}
                  >
                    {exemploAtual.servico2}
                  </p>
                  <p 
                    className="text-xs opacity-70"
                    style={{ color: dados.cor_primaria }}
                  >
                    {exemploAtual.servico2Detalhe}
                  </p>
                </div>

                {/* Botão de ação */}
                <button
                  className={`w-full py-3 rounded-lg font-semibold text-sm transition-all hover:opacity-90 ${obterClasseFonte(dados.fonte_principal)}`}
                  style={{ 
                    backgroundColor: dados.cor_destaque, 
                    color: dados.cor_primaria
                  }}
                >
                  Agendar Agora
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita - Dados e Contato */}
        <div className="space-y-6">
          {/* Dados Básicos */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <Store className="w-5 h-5" />
              Dados {preposicaoEstabelecimento} {terminologia.estabelecimento.singular}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Nome {preposicaoEstabelecimento} {terminologia.estabelecimento.singular}
                </label>
                <input
                  type="text"
                  value={dados.nome}
                  onChange={(e) => setDados({ ...dados, nome: e.target.value })}
                  placeholder={`Ex: ${exemploAtual.nome}`}
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
                    placeholder={exemploAtual.email}
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
                    placeholder={exemploAtual.instagram}
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

      {/* Botão Flutuante de Preview Mobile */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        onClick={() => setMostrarPreviewMobile(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all lg:hidden"
        aria-label="Ver preview do site"
      >
        <Smartphone className="w-5 h-5" />
        <span className="text-sm font-medium">Preview</span>
      </motion.button>

      {/* Modal de Preview Mobile */}
      <AnimatePresence>
        {mostrarPreviewMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMostrarPreviewMobile(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              {/* Botão fechar */}
              <button
                onClick={() => setMostrarPreviewMobile(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                aria-label="Fechar preview"
              >
                <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </button>

              {/* Título */}
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Preview do Site
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Visualização aproximada
                </p>
              </div>

              {/* Preview */}
              <PreviewSite 
                dados={dados}
                totalServicos={0}
                totalBarbeiros={0}
                tipoNegocio={tipoNegocio}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
