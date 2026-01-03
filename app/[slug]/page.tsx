'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { 
  Star, 
  Clock, 
  MapPin, 
  Phone, 
  Instagram, 
  Calendar,
  Scissors,
  Users,
  ChevronRight,
  MessageCircle,
  Loader2
} from 'lucide-react'

interface Tenant {
  id: string
  slug: string
  nome: string
  logo_url: string | null
  cor_primaria: string
  cor_secundaria: string
  cor_destaque: string
  telefone: string | null
  whatsapp: string | null
  endereco: string | null
  cidade: string | null
  estado: string | null
  instagram: string | null
}

interface Servico {
  id: string
  nome: string
  descricao: string | null
  preco: number
  duracao: number
  categoria: string
}

interface Barbeiro {
  id: string
  nome: string
  foto_url: string | null
  especialidades: string[]
  avaliacao_media: number
}

interface Configuracoes {
  horario_abertura: string
  horario_fechamento: string
  dias_funcionamento: string[]
}

export default function PaginaBarbearia() {
  const params = useParams()
  const slug = params.slug as string
  
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [servicos, setServicos] = useState<Servico[]>([])
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [configuracoes, setConfiguracoes] = useState<Configuracoes | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    async function carregarDados() {
      try {
        // Buscar tenant
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('slug', slug)
          .eq('ativo', true)
          .single()

        if (tenantError || !tenantData) {
          setErro(true)
          return
        }

        setTenant(tenantData)

        // Buscar serviços, barbeiros e configurações em paralelo
        const [servicosRes, barbeirosRes, configRes] = await Promise.all([
          supabase
            .from('servicos')
            .select('*')
            .eq('tenant_id', tenantData.id)
            .eq('ativo', true)
            .order('ordem_exibicao'),
          supabase
            .from('barbeiros')
            .select('*')
            .eq('tenant_id', tenantData.id)
            .eq('ativo', true)
            .order('nome'),
          supabase
            .from('configuracoes_barbearia')
            .select('*')
            .eq('tenant_id', tenantData.id)
            .single()
        ])

        setServicos(servicosRes.data || [])
        setBarbeiros(barbeirosRes.data || [])
        setConfiguracoes(configRes.data)

      } catch (error) {
        console.error('Erro ao carregar dados:', error)
        setErro(true)
      } finally {
        setCarregando(false)
      }
    }

    if (slug) {
      carregarDados()
    }
  }, [slug])

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  if (erro || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Barbearia não encontrada</h1>
          <p className="text-zinc-400 mb-6">Verifique o endereço e tente novamente.</p>
          <Link href="/" className="text-amber-500 hover:underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    )
  }

  const servicosPopulares = servicos.filter(s => s.categoria === 'popular').slice(0, 4)
  const whatsappLink = tenant.whatsapp 
    ? `https://wa.me/55${tenant.whatsapp.replace(/\D/g, '')}` 
    : null

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Hero */}
      <section className="relative py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-800/50 to-zinc-900" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {tenant.logo_url && (
            <Image
              src={tenant.logo_url}
              alt={tenant.nome}
              width={100}
              height={100}
              className="mx-auto mb-6 rounded-full border-4 border-amber-500"
            />
          )}
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{tenant.nome}</h1>
          
          {tenant.endereco && (
            <p className="flex items-center justify-center gap-2 text-zinc-400 mb-6">
              <MapPin className="w-4 h-4" />
              {tenant.endereco}
              {tenant.cidade && `, ${tenant.cidade}`}
              {tenant.estado && ` - ${tenant.estado}`}
            </p>
          )}
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${tenant.slug}/agendar`}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg transition-colors"
            >
              <Calendar className="w-5 h-5" />
              Agendar Horário
            </Link>
            
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Info rápida */}
      <section className="py-8 bg-zinc-800/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4">
              <Scissors className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <div className="text-2xl font-bold">{servicos.length}</div>
              <div className="text-zinc-400 text-sm">Serviços</div>
            </div>
            <div className="p-4">
              <Users className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <div className="text-2xl font-bold">{barbeiros.length}</div>
              <div className="text-zinc-400 text-sm">Profissionais</div>
            </div>
            <div className="p-4">
              <Clock className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <div className="text-2xl font-bold">
                {configuracoes?.horario_abertura?.slice(0, 5) || '09:00'}
              </div>
              <div className="text-zinc-400 text-sm">Abertura</div>
            </div>
            <div className="p-4">
              <Clock className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <div className="text-2xl font-bold">
                {configuracoes?.horario_fechamento?.slice(0, 5) || '18:00'}
              </div>
              <div className="text-zinc-400 text-sm">Fechamento</div>
            </div>
          </div>
        </div>
      </section>

      {/* Serviços */}
      {servicos.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Nossos Serviços</h2>
              <Link 
                href={`/${tenant.slug}/agendar`}
                className="text-amber-500 hover:text-amber-400 flex items-center gap-1"
              >
                Agendar <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(servicosPopulares.length > 0 ? servicosPopulares : servicos.slice(0, 4)).map(servico => (
                <div 
                  key={servico.id}
                  className="bg-zinc-800 rounded-xl p-6 hover:bg-zinc-700/50 transition-colors"
                >
                  <h3 className="text-xl font-semibold mb-2">{servico.nome}</h3>
                  {servico.descricao && (
                    <p className="text-zinc-400 text-sm mb-4">{servico.descricao}</p>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-amber-500 font-bold text-xl">
                      R$ {servico.preco.toFixed(2)}
                    </span>
                    <span className="text-zinc-500 text-sm">
                      {servico.duracao} min
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Profissionais */}
      {barbeiros.length > 0 && (
        <section className="py-16 px-4 bg-zinc-800/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Nossos Profissionais</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {barbeiros.map(barbeiro => (
                <div 
                  key={barbeiro.id}
                  className="bg-zinc-800 rounded-xl p-6 text-center"
                >
                  <div className="w-24 h-24 mx-auto mb-4 bg-zinc-700 rounded-full flex items-center justify-center overflow-hidden">
                    {barbeiro.foto_url ? (
                      <Image
                        src={barbeiro.foto_url}
                        alt={barbeiro.nome}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="w-12 h-12 text-zinc-500" />
                    )}
                  </div>
                  <h3 className="text-xl font-semibold mb-1">{barbeiro.nome}</h3>
                  {barbeiro.especialidades?.length > 0 && (
                    <p className="text-amber-500 text-sm mb-3">
                      {barbeiro.especialidades.join(' • ')}
                    </p>
                  )}
                  {barbeiro.avaliacao_media > 0 && (
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="text-zinc-300">{barbeiro.avaliacao_media.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contato */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">Entre em Contato</h2>
          
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            {tenant.telefone && (
              <a 
                href={`tel:${tenant.telefone}`}
                className="flex items-center gap-2 text-zinc-300 hover:text-amber-500"
              >
                <Phone className="w-5 h-5" />
                {tenant.telefone}
              </a>
            )}
            
            {tenant.instagram && (
              <a
                href={`https://instagram.com/${tenant.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-zinc-300 hover:text-amber-500"
              >
                <Instagram className="w-5 h-5" />
                {tenant.instagram}
              </a>
            )}
          </div>
          
          <Link
            href={`/${tenant.slug}/agendar`}
            className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg transition-colors"
          >
            <Calendar className="w-5 h-5" />
            Agendar Horário
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-zinc-950 text-center text-zinc-500">
        <p>{new Date().getFullYear()} {tenant.nome}. Todos os direitos reservados.</p>
        <p className="text-sm mt-2">
          Powered by <a href="/" className="text-amber-500 hover:underline">BarberHub</a>
        </p>
      </footer>
    </div>
  )
}
