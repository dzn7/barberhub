"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Barbeiro } from "@/lib/types";
import { RecorteImagem } from "@/components/ui/recorte-imagem";
import { useToast } from "@/hooks/useToast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Mail,
  Phone,
  Loader2,
  X,
  Save,
  Camera,
  Percent,
  Search,
  UserCheck,
  UserX,
  Key,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";

/**
 * Gera um token de acesso único para o barbeiro
 * Formato: 8 caracteres alfanuméricos maiúsculos
 */
const gerarTokenAcesso = (): string => {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sem I, O, 1, 0 para evitar confusão
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return token;
};

const ESPECIALIDADES_SUGERIDAS = [
  "Corte Masculino",
  "Degradê",
  "Barba",
  "Pigmentação",
  "Química",
  "Corte Infantil",
  "Tratamento Capilar",
  "Sobrancelha",
  "Relaxamento",
];

/**
 * Componente de Gestão de Barbeiros
 * Permite adicionar, editar e remover barbeiros com comissões
 */
export function GestaoBarbeiros() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Barbeiro | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [uploadandoFoto, setUploadandoFoto] = useState(false);
  const [busca, setBusca] = useState("");
  const [tokenGerado, setTokenGerado] = useState<string | null>(null);
  const [modalTokenAberto, setModalTokenAberto] = useState(false);
  const [tokenCopiado, setTokenCopiado] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  // Estados para recorte de imagem
  const [imagemParaRecortar, setImagemParaRecortar] = useState<string | null>(null);
  const [arquivoOriginal, setArquivoOriginal] = useState<File | null>(null);

  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    especialidades: [] as string[],
    comissao_percentual: 40,
    foto_url: "",
  });

  const carregarBarbeiros = async () => {
    if (!tenant) return;

    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from("barbeiros")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .order("nome");

      if (error) {
        console.error("Erro ao carregar barbeiros:", error);
        toast({ tipo: "erro", mensagem: "Erro ao carregar barbeiros" });
        return;
      }

      setBarbeiros(data || []);
    } catch (erro) {
      console.error("Erro ao carregar barbeiros:", erro);
      toast({ tipo: "erro", mensagem: "Erro ao carregar barbeiros" });
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (tenant?.id) {
      carregarBarbeiros();
    }
  }, [tenant?.id]);

  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, "");
    if (numeros.length <= 2) return numeros;
    if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
  };

  const abrirModal = (barbeiro?: Barbeiro) => {
    if (barbeiro) {
      setEditando(barbeiro);
      setForm({
        nome: barbeiro.nome,
        email: barbeiro.email,
        telefone: formatarTelefone(barbeiro.telefone),
        especialidades: barbeiro.especialidades || [],
        comissao_percentual: barbeiro.comissao_percentual,
        foto_url: barbeiro.foto_url || "",
      });
    } else {
      setEditando(null);
      setForm({
        nome: "",
        email: "",
        telefone: "",
        especialidades: [],
        comissao_percentual: 40,
        foto_url: "",
      });
    }
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEditando(null);
    setImagemParaRecortar(null);
    setArquivoOriginal(null);
  };

  const handleSelecionarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      toast({ tipo: "erro", mensagem: "Selecione uma imagem válida" });
      return;
    }

    if (arquivo.size > 10 * 1024 * 1024) {
      toast({ tipo: "erro", mensagem: "A imagem deve ter no máximo 10MB" });
      return;
    }

    const urlTemporaria = URL.createObjectURL(arquivo);
    setImagemParaRecortar(urlTemporaria);
    setArquivoOriginal(arquivo);

    if (inputFotoRef.current) {
      inputFotoRef.current.value = "";
    }
  };

  const handleRecorteConcluido = async (imagemRecortada: Blob) => {
    if (!tenant) return;

    setUploadandoFoto(true);
    setImagemParaRecortar(null);

    try {
      const arquivoRecortado = new File(
        [imagemRecortada],
        arquivoOriginal?.name || "foto-barbeiro.jpg",
        { type: "image/jpeg" }
      );

      const formData = new FormData();
      formData.append("file", arquivoRecortado);
      formData.append("tenant_id", tenant.id);
      formData.append("tipo", "barbeiro");

      const resposta = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const dados = await resposta.json();
      if (dados.error) throw new Error(dados.error);

      setForm({ ...form, foto_url: dados.url });
      toast({ tipo: "sucesso", mensagem: "Foto atualizada com sucesso" });
    } catch (erro) {
      toast({ tipo: "erro", mensagem: "Erro ao enviar foto" });
    } finally {
      setUploadandoFoto(false);
      setArquivoOriginal(null);
    }
  };

  const handleCancelarRecorte = () => {
    if (imagemParaRecortar) {
      URL.revokeObjectURL(imagemParaRecortar);
    }
    setImagemParaRecortar(null);
    setArquivoOriginal(null);
  };

  const toggleEspecialidade = (especialidade: string) => {
    setForm((prev) => ({
      ...prev,
      especialidades: prev.especialidades.includes(especialidade)
        ? prev.especialidades.filter((e) => e !== especialidade)
        : [...prev.especialidades, especialidade],
    }));
  };

  const handleSalvar = async () => {
    if (!tenant) return;

    if (!form.nome.trim()) {
      toast({ tipo: "erro", mensagem: "Digite o nome do profissional" });
      return;
    }
    if (!form.telefone.trim()) {
      toast({ tipo: "erro", mensagem: "Digite o telefone do profissional" });
      return;
    }

    setSalvando(true);

    try {
      const telefoneNumeros = form.telefone.replace(/\D/g, "");
      const emailFinal =
        form.email.trim() || `${form.nome.toLowerCase().replace(/\s/g, ".")}@temp.com`;

      if (editando) {
        const { error } = await supabase
          .from("barbeiros")
          .update({
            nome: form.nome.trim(),
            email: emailFinal,
            telefone: telefoneNumeros,
            especialidades: form.especialidades,
            comissao_percentual: form.comissao_percentual,
            foto_url: form.foto_url || null,
          })
          .eq("id", editando.id);

        if (error) throw error;
        toast({ tipo: "sucesso", mensagem: "Profissional atualizado com sucesso!" });
      } else {
        // Gerar token de acesso para o novo barbeiro
        const novoToken = gerarTokenAcesso();
        
        const { error } = await supabase.from("barbeiros").insert({
          tenant_id: tenant.id,
          nome: form.nome.trim(),
          email: emailFinal,
          telefone: telefoneNumeros,
          especialidades: form.especialidades,
          comissao_percentual: form.comissao_percentual,
          foto_url: form.foto_url || null,
          token_acesso: novoToken,
          token_ativo: true,
        });

        if (error) throw error;
        
        // Exibir modal com o token gerado
        setTokenGerado(novoToken);
        setModalTokenAberto(true);
        toast({ tipo: "sucesso", mensagem: "Profissional adicionado com sucesso!" });
      }

      await carregarBarbeiros();
      fecharModal();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({ tipo: "erro", mensagem: "Erro ao salvar profissional" });
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este barbeiro?")) return;

    try {
      await supabase.from("barbeiros").update({ ativo: false }).eq("id", id);
      toast({ tipo: "sucesso", mensagem: "Profissional removido com sucesso" });
      await carregarBarbeiros();
    } catch (error) {
      toast({ tipo: "erro", mensagem: "Erro ao remover profissional" });
    }
  };

  // Filtrar barbeiros pela busca
  const barbeirosFiltrados = barbeiros.filter(
    (b) =>
      b.nome.toLowerCase().includes(busca.toLowerCase()) ||
      b.email.toLowerCase().includes(busca.toLowerCase()) ||
      b.telefone.includes(busca)
  );

  // Métricas
  const totalBarbeiros = barbeiros.length;
  const comissaoMedia =
    barbeiros.length > 0
      ? barbeiros.reduce((acc, b) => acc + b.comissao_percentual, 0) / barbeiros.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Gestão de Barbeiros
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Gerencie os profissionais da sua barbearia
          </p>
        </div>
        <button
          onClick={() => abrirModal()}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          Novo Barbeiro
        </button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
              <Users className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Total de Barbeiros</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {totalBarbeiros}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
              <UserCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Ativos</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {totalBarbeiros}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
              <Percent className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Comissão Média</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {comissaoMedia.toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, email ou telefone..."
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
        />
      </div>

      {/* Lista de Barbeiros */}
      {carregando ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
        </div>
      ) : barbeirosFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <Users className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
            {busca ? "Nenhum barbeiro encontrado" : "Nenhum barbeiro cadastrado"}
          </h3>
          <p className="text-zinc-500 mb-6">
            {busca
              ? "Tente buscar por outro termo"
              : "Adicione os profissionais que trabalham na sua barbearia"}
          </p>
          {!busca && (
            <button
              onClick={() => abrirModal()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5" />
              Adicionar Barbeiro
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {barbeirosFiltrados.map((barbeiro) => (
            <motion.div
              key={barbeiro.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                  {barbeiro.foto_url ? (
                    <Image
                      src={barbeiro.foto_url}
                      alt={barbeiro.nome}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="w-8 h-8 text-zinc-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-zinc-900 dark:text-white truncate">
                    {barbeiro.nome}
                  </h3>

                  <div className="flex items-center gap-2 text-sm text-zinc-500 mt-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{formatarTelefone(barbeiro.telefone)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{barbeiro.email}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-lg">
                      {barbeiro.comissao_percentual}% comissão
                    </span>
                  </div>

                  {barbeiro.especialidades && barbeiro.especialidades.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {barbeiro.especialidades.slice(0, 3).map((esp, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs rounded-full"
                        >
                          {esp}
                        </span>
                      ))}
                      {barbeiro.especialidades.length > 3 && (
                        <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs rounded-full">
                          +{barbeiro.especialidades.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => abrirModal(barbeiro)}
                  className="flex items-center gap-2 px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleExcluir(barbeiro.id)}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={fecharModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                    {editando ? "Editar Profissional" : "Novo Profissional"}
                  </h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    {editando
                      ? "Atualize os dados do profissional"
                      : "Adicione um novo membro à equipe"}
                  </p>
                </div>
                <button
                  onClick={fecharModal}
                  className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Conteúdo scrollável */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Foto */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-28 h-28 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center overflow-hidden border-4 border-zinc-200 dark:border-zinc-700">
                      {uploadandoFoto ? (
                        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
                      ) : form.foto_url ? (
                        <Image
                          src={form.foto_url}
                          alt="Foto"
                          width={112}
                          height={112}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="w-12 h-12 text-zinc-400" />
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 p-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full cursor-pointer hover:opacity-90 transition-opacity shadow-lg">
                      <input
                        ref={inputFotoRef}
                        type="file"
                        accept="image/*"
                        onChange={handleSelecionarFoto}
                        className="hidden"
                      />
                      <Camera className="w-5 h-5" />
                    </label>
                  </div>
                  <p className="text-xs text-zinc-500">Clique para adicionar foto</p>
                </div>

                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Nome do Profissional <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Ex: João Silva"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Telefone/WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={form.telefone}
                    onChange={(e) =>
                      setForm({ ...form, telefone: formatarTelefone(e.target.value) })
                    }
                    placeholder="(00) 00000-0000"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                  />
                </div>

                {/* E-mail */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    E-mail{" "}
                    <span className="text-zinc-500 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@exemplo.com"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                  />
                </div>

                {/* Comissão */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Comissão (%)
                  </label>
                  <div className="relative">
                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="number"
                      value={form.comissao_percentual || ""}
                      onChange={(e) => {
                        const valor = e.target.value;
                        setForm({
                          ...form,
                          comissao_percentual: valor === "" ? 0 : parseFloat(valor),
                        });
                      }}
                      min={0}
                      max={100}
                      placeholder="40"
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-12 pr-4 py-3 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Percentual de comissão por atendimento
                  </p>
                </div>

                {/* Especialidades */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                    Especialidades
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ESPECIALIDADES_SUGERIDAS.map((esp) => (
                      <button
                        key={esp}
                        type="button"
                        onClick={() => toggleEspecialidade(esp)}
                        className={`px-3 py-1.5 text-sm rounded-full transition-all ${
                          form.especialidades.includes(esp)
                            ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        }`}
                      >
                        {esp}
                      </button>
                    ))}
                  </div>
                  {form.especialidades.length > 0 && (
                    <p className="text-xs text-zinc-500 mt-2">
                      {form.especialidades.length} especialidade(s) selecionada(s)
                    </p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-6 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={fecharModal}
                  className="flex-1 px-4 py-3 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvar}
                  disabled={salvando || !form.nome.trim() || !form.telefone.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {salvando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      {editando ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {editando ? "Salvar" : "Adicionar"}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Recorte de Imagem */}
      {imagemParaRecortar && (
        <RecorteImagem
          imagemOriginal={imagemParaRecortar}
          onRecorteConcluido={handleRecorteConcluido}
          onCancelar={handleCancelarRecorte}
          formatoCircular={true}
        />
      )}

      {/* Modal de Token de Acesso */}
      <AnimatePresence>
        {modalTokenAberto && tokenGerado && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md shadow-xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-emerald-50 dark:bg-emerald-900/20">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
                    <Key className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      Token de Acesso Gerado!
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Envie este código para o barbeiro
                    </p>
                  </div>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="p-6 space-y-4">
                <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-4">
                  <p className="text-center text-3xl font-mono font-bold tracking-[0.3em] text-zinc-900 dark:text-white">
                    {tokenGerado}
                  </p>
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(tokenGerado);
                    setTokenCopiado(true);
                    setTimeout(() => setTokenCopiado(false), 2000);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium hover:opacity-90 transition-all"
                >
                  {tokenCopiado ? (
                    <>
                      <Check className="w-5 h-5 text-emerald-500" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copiar Código
                    </>
                  )}
                </button>

                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Importante:</strong> O barbeiro deve acessar{" "}
                    <span className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">
                      /barbeiro/entrar
                    </span>{" "}
                    e inserir este código para acessar o painel.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={() => {
                    setModalTokenAberto(false);
                    setTokenGerado(null);
                    setTokenCopiado(false);
                  }}
                  className="w-full px-4 py-3 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors font-medium"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
