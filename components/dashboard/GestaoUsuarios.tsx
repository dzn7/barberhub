"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Users, Search, Phone, Mail, Calendar, Download, 
  UserPlus, MoreVertical, Eye, Ban, CheckCircle, Upload 
} from "lucide-react";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { Button, TextField, Select, Badge } from "@radix-ui/themes";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  data_cadastro: string;
  ativo: boolean;
  total_agendamentos: number;
  ultima_visita: string | null;
}

/**
 * Componente de Gestão de Usuários
 * Controle completo de clientes cadastrados
 */
const ITENS_POR_PAGINA = 20;

export function GestaoUsuarios() {
  const [usuarios, setUsuarios] = useState<Cliente[]>([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Cliente | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalUsuarios, setTotalUsuarios] = useState(0);

  useEffect(() => {
    buscarUsuarios();
  }, []);

  useEffect(() => {
    filtrarUsuarios();
    setPaginaAtual(1);
  }, [termoBusca, filtroStatus, usuarios]);

  const buscarUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("data_cadastro", { ascending: false });

      if (error) throw error;

      console.log("Usuários carregados:", data);
      setUsuarios(data || []);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
    } finally {
      setCarregando(false);
    }
  };

  const filtrarUsuarios = () => {
    let filtrados = [...usuarios];

    // Filtrar por termo de busca
    if (termoBusca) {
      const termo = termoBusca.toLowerCase();
      filtrados = filtrados.filter(
        (u) =>
          u.nome.toLowerCase().includes(termo) ||
          u.email.toLowerCase().includes(termo) ||
          u.telefone.includes(termo)
      );
    }

    // Filtrar por status
    if (filtroStatus === "ativos") {
      filtrados = filtrados.filter((u) => u.ativo);
    } else if (filtroStatus === "inativos") {
      filtrados = filtrados.filter((u) => !u.ativo);
    }

    setTotalUsuarios(filtrados.length);
    setTotalPaginas(Math.ceil(filtrados.length / ITENS_POR_PAGINA));
    
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const fim = inicio + ITENS_POR_PAGINA;
    setUsuariosFiltrados(filtrados.slice(inicio, fim));
  };

  useEffect(() => {
    filtrarUsuarios();
  }, [paginaAtual]);

  const irParaPagina = (pagina: number) => {
    if (pagina >= 1 && pagina <= totalPaginas) {
      setPaginaAtual(pagina);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const gerarNumerosPaginas = () => {
    const paginas: (number | string)[] = [];
    const maxPaginasVisiveis = 5;
    
    if (totalPaginas <= maxPaginasVisiveis) {
      for (let i = 1; i <= totalPaginas; i++) {
        paginas.push(i);
      }
    } else {
      paginas.push(1);
      
      if (paginaAtual > 3) {
        paginas.push('...');
      }
      
      const inicio = Math.max(2, paginaAtual - 1);
      const fim = Math.min(totalPaginas - 1, paginaAtual + 1);
      
      for (let i = inicio; i <= fim; i++) {
        if (!paginas.includes(i)) {
          paginas.push(i);
        }
      }
      
      if (paginaAtual < totalPaginas - 2) {
        paginas.push('...');
      }
      
      if (!paginas.includes(totalPaginas)) {
        paginas.push(totalPaginas);
      }
    }
    
    return paginas;
  };

  const toggleStatusUsuario = async (id: string, ativoAtual: boolean) => {
    try {
      const { error } = await supabase
        .from("clientes")
        .update({ ativo: !ativoAtual })
        .eq("id", id);

      if (error) throw error;

      console.log("Status atualizado");
      buscarUsuarios();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao atualizar status do usuário");
    }
  };

  const importarContatos = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      
      // Parsear arquivo VCF
      const vcards = text.split("BEGIN:VCARD");
      let importados = 0;
      let erros = 0;

      for (const vcard of vcards) {
        if (!vcard.trim()) continue;

        try {
          // Extrair informações do vCard
          const nomeMatch = vcard.match(/FN:(.*)/);
          const telMatch = vcard.match(/TEL[^:]*:(.*)/);
          const emailMatch = vcard.match(/EMAIL[^:]*:(.*)/);

          if (nomeMatch && telMatch) {
            const nome = nomeMatch[1].trim();
            const telefone = telMatch[1].trim();
            const email = emailMatch ? emailMatch[1].trim() : `${nome.replace(/\s+/g, "_").toLowerCase()}@cliente.com`;

            // Inserir no Supabase
            const { error } = await supabase
              .from("clientes")
              .insert([{ nome, telefone, email }])
              .select();

            if (!error) {
              importados++;
            } else {
              erros++;
              console.error("Erro ao importar:", nome, error);
            }
          }
        } catch (err) {
          erros++;
          console.error("Erro ao processar vCard:", err);
        }
      }

      alert(`✅ Importação concluída!\n\n${importados} contatos importados\n${erros} erros`);
      buscarUsuarios();
    };

    reader.readAsText(file);
  };

  const exportarUsuarios = () => {
    // Criar CSV dos usuários
    const csv = [
      ["Nome", "Email", "Telefone", "Data Cadastro", "Total Agendamentos", "Status"].join(";"),
      ...usuariosFiltrados.map((u) =>
        [
          u.nome,
          u.email,
          u.telefone,
          format(new Date(u.data_cadastro), "dd/MM/yyyy"),
          u.total_agendamentos,
          u.ativo ? "Ativo" : "Inativo",
        ].join(";")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `usuarios_${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const verDetalhes = (usuario: Cliente) => {
    setUsuarioSelecionado(usuario);
    setModalAberto(true);
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zinc-900 dark:border-white mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Carregando usuários...</p>
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
            Gestão de Usuários
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            {totalUsuarios} {totalUsuarios === 1 ? "usuário" : "usuários"} • Página {paginaAtual} de {totalPaginas}
          </p>
        </div>

        <div className="flex gap-2">
          <label className="inline-block">
            <input
              type="file"
              accept=".vcf"
              onChange={importarContatos}
              className="hidden"
            />
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg font-medium cursor-pointer hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors text-sm">
              <Upload className="w-4 h-4" />
              Importar Contatos
            </div>
          </label>

          <Button
            onClick={exportarUsuarios}
            variant="outline"
            className="cursor-pointer"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Total de Usuários</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            {usuarios.length}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Usuários Ativos</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            {usuarios.filter((u) => u.ativo).length}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Novos Este Mês</span>
            <UserPlus className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            {
              usuarios.filter((u) => {
                const cadastro = new Date(u.data_cadastro);
                const mesAtual = new Date();
                return (
                  cadastro.getMonth() === mesAtual.getMonth() &&
                  cadastro.getFullYear() === mesAtual.getFullYear()
                );
              }).length
            }
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Com Agendamentos</span>
            <Calendar className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            {usuarios.filter((u) => u.total_agendamentos > 0).length}
          </p>
        </motion.div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <TextField.Root
                placeholder="Buscar por nome, email ou telefone..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select.Root value={filtroStatus} onValueChange={setFiltroStatus}>
            <Select.Trigger className="w-full md:w-40" />
            <Select.Content>
              <Select.Item value="todos">Todos</Select.Item>
              <Select.Item value="ativos">Ativos</Select.Item>
              <Select.Item value="inativos">Inativos</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Contato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Cadastro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Agendamentos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400"
                  >
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((usuario) => (
                  <tr
                    key={usuario.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {usuario.nome}
                        </p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {usuario.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${usuario.telefone}`}
                          className="text-sm text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          {usuario.telefone}
                        </a>
                        {usuario.telefone && (
                          <a
                            href={`https://wa.me/55${usuario.telefone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 transition-colors"
                            title="Enviar WhatsApp"
                          >
                            <WhatsAppIcon size={16} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-900 dark:text-zinc-100">
                      {format(new Date(usuario.data_cadastro), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold text-sm">
                        {usuario.total_agendamentos}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge color={usuario.ativo ? "green" : "gray"} size="2">
                        {usuario.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button
                          size="1"
                          variant="ghost"
                          onClick={() => verDetalhes(usuario)}
                          className="cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="1"
                          variant="ghost"
                          color={usuario.ativo ? "red" : "green"}
                          onClick={() => toggleStatusUsuario(usuario.id, usuario.ativo)}
                          className="cursor-pointer"
                        >
                          {usuario.ativo ? (
                            <Ban className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Mostrando {((paginaAtual - 1) * ITENS_POR_PAGINA) + 1} a {Math.min(paginaAtual * ITENS_POR_PAGINA, totalUsuarios)} de {totalUsuarios}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="soft"
              size="1"
              onClick={() => irParaPagina(paginaAtual - 1)}
              disabled={paginaAtual === 1}
              className="cursor-pointer"
            >
              Anterior
            </Button>
            
            {gerarNumerosPaginas().map((pagina, index) => (
              typeof pagina === 'number' ? (
                <Button
                  key={index}
                  variant={paginaAtual === pagina ? "solid" : "soft"}
                  size="1"
                  onClick={() => irParaPagina(pagina)}
                  className="cursor-pointer min-w-[36px]"
                >
                  {pagina}
                </Button>
              ) : (
                <span key={index} className="px-2 text-zinc-500">...</span>
              )
            ))}
            
            <Button
              variant="soft"
              size="1"
              onClick={() => irParaPagina(paginaAtual + 1)}
              disabled={paginaAtual === totalPaginas}
              className="cursor-pointer"
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {modalAberto && usuarioSelecionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
              Detalhes do Usuário
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Nome</p>
                <p className="font-semibold text-zinc-900 dark:text-white">
                  {usuarioSelecionado.nome}
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Email</p>
                <p className="font-semibold text-zinc-900 dark:text-white">
                  {usuarioSelecionado.email}
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Telefone</p>
                <div className="flex items-center gap-3">
                  <p className="font-semibold text-zinc-900 dark:text-white">
                    {usuarioSelecionado.telefone}
                  </p>
                  <a
                    href={`https://wa.me/55${usuarioSelecionado.telefone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors text-sm"
                    title="Enviar WhatsApp"
                  >
                    <WhatsAppIcon size={16} />
                    WhatsApp
                  </a>
                </div>
              </div>

              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Data de Cadastro</p>
                <p className="font-semibold text-zinc-900 dark:text-white">
                  {format(new Date(usuarioSelecionado.data_cadastro), "dd 'de' MMMM 'de' yyyy", {
                    locale: ptBR,
                  })}
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Total de Agendamentos</p>
                <p className="font-semibold text-zinc-900 dark:text-white">
                  {usuarioSelecionado.total_agendamentos}
                </p>
              </div>

              {usuarioSelecionado.ultima_visita && (
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Última Visita</p>
                  <p className="font-semibold text-zinc-900 dark:text-white">
                    {format(new Date(usuarioSelecionado.ultima_visita), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Status</p>
                <Badge color={usuarioSelecionado.ativo ? "green" : "gray"} size="2">
                  {usuarioSelecionado.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </div>

            <div className="mt-6">
              <Button
                onClick={() => setModalAberto(false)}
                className="w-full cursor-pointer"
              >
                Fechar
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
