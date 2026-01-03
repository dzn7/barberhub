'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
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
  Loader2,
  ArrowRight
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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  if (erro || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Barbearia não encontrada</h1>
          <p className="text-zinc-400 mb-6">Verifique o endereço e tente novamente.</p>
          <Link href="/" className="text-white hover:underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    )
  }

  // Cores do tenant com fallback
  const cores = {
    primaria: tenant.cor_primaria || '#18181b',
    secundaria: tenant.cor_secundaria || '#fafafa',
    destaque: tenant.cor_destaque || '#a1a1aa',
  }

  const whatsappLink = tenant.whatsapp 
    ? \`https://wa.me/55\${tenant.whatsapp.replace(/\\D/g, '')}\` 
    : null

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: cores.primaria }}
    >
      {/* Hero Section */}
      <section className="relative">
        {/* Background com gradiente sutil */}
        <div 
          className="absolute inset-0 opacity-50"
          style={{
            background: \`radial-gradient(ellipse at top, \${cores.destaque}15 0%, transparent 50%)\`
          }}
        />
        
        <div className="relative z-10 max-w-5xl mx-auto px-4 pt-16 pb-20">
          {/* Logo e Nome */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            {tenant.logo_url ? (
              <div className="relative w-24 h-24 mx-auto mb-6 rounded-2xl overflow-hidden border-2" style={{ borderColor: cores.destaque + '30' }}>
                <Image
                  src={tenant.logo_url}
                  alt={tenant.nome}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div 
                className="w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: cores.destaque + '20' }}
              >
                <Scissors className="w-10 h-10" style={{ color: cores.secundaria }} />
              </div>
            )}
            
            <h1 
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ color: cores.secundaria }}
            >
              {tenant.nome}
            </h1>
            
            {tenant.endereco && (
              <p 
                className="flex items-center justify-center gap-2 text-base"
                style={{ color: cores.destaque }}
              >
                <MapPin className="w-4 h-4" />
                {tenant.endereco}
                {tenant.cidade && \`, \${tenant.cidade}\`}
                {tenant.estado && \` - \${tenant.estado}\`}
              </p>
            )}
          </motion.div>

          {/* CTAs */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto"
          >
            <Link
              href={\`/\${tenant.slug}/agendar\`}
              className="group flex-1 inline-flex items-center justify-center gap-2 px-8 py-4 font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ 
                backgroundColor: cores.secundaria,
                color: cores.primaria
              }}
            >
              <Calendar className="w-5 h-5" />
              Agendar Horário
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-8 py-4 font-semibold rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ 
                  borderColor: cores.destaque + '50',
                  color: cores.secundaria,
                  backgroundColor: cores.destaque + '10'
                }}
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </a>
            )}
          </motion.div>
        </div>
      </section>

      {/* Informações Rápidas */}
      <section 
        className="py-8 border-y"
        style={{ 
          backgroundColor: cores.destaque + '08',
          borderColor: cores.destaque + '20'
        }}
      >
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div 
                className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: cores.destaque + '20' }}
              >
                <Scissors className="w-5 h-5" style={{ color: cores.secundaria }} />
              </div>
              <div className="text-2xl font-bold" style={{ color: cores.secundaria }}>{servicos.length}</div>
              <div className="text-sm" style={{ color: cores.destaque }}>Serviços</div>
            </div>
            <div>
              <div 
                className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: cores.destaque + '20' }}
              >
                <Users className="w-5 h-5" style={{ color: cores.secundaria }} />
              </div>
              <div className="text-2xl font-bold" style={{ color: cores.secundaria }}>{barbeiros.length}</div>
              <div className="text-sm" style={{ color: cores.destaque }}>Profissionais</div>
            </div>
            <div>
              <div 
                className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: cores.destaque + '20' }}
              >
                <Clock className="w-5 h-5" style={{ color: cores.secundaria }} />
              </div>
              <div className="text-2xl font-bold" style={{ color: cores.secundaria }}>
                {configuracoes?.horario_abertura?.slice(0, 5) || '09:00'}
              </div>
              <div className="text-sm" style={{ color: cores.destaque }}>Abertura</div>
            </div>
            <div>
              <div 
                className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: cores.destaque + '20' }}
              >
                <Clock className="w-5 h-5" style={{ color: cores.secundaria }} />
              </div>
              <div className="text-2xl font-bold" style={{ color: cores.secundaria }}>
                {configuracoes?.horario_fechamento?.slice(0, 5) || '18:00'}
              </div>
              <div className="text-sm" style={{ color: cores.destaque }}>Fechamento</div>
            </div>
          </div>
        </div>
      </section>

      {/* Serviços */}
      {servicos.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex justify-between items-center mb-8"
            >
              <div>
                <p className="text-sm font-medium tracking-widest uppercase mb-2" style={{ color: cores.destaque }}>
                  Catálogo
                </p>
                <h2 className="text-3xl font-bold" style={{ color: cores.secundaria }}>
                  Nossos Serviços
                </h2>
              </div>
              <Link 
                href={\`/\${tenant.slug}/agendar\`}
                className="hidden sm:flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-80"
                style={{ color: cores.secundaria }}
              >
                Ver todos <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {servicos.slice(0, 6).map((servico, index) => (
                <motion.div
                  key={servico.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group p-5 rounded-xl border transition-all hover:scale-[1.01]"
                  style={{ 
                    backgroundColor: cores.destaque + '08',
                    borderColor: cores.destaque + '20'
                  }}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1" style={{ color: cores.secundaria }}>
                        {servico.nome}
                      </h3>
                      {servico.descricao && (
                        <p className="text-sm mb-3 line-clamp-2" style={{ color: cores.destaque }}>
                          {servico.descricao}
                        </p>
                      )}
                      <div className="flex items-center gap-3">
                        <span className="text-sm" style={{ color: cores.destaque }}>
                          <Clock className="w-3.5 h-3.5 inline mr-1" />
                          {servico.duracao} min
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold" style={{ color: cores.secundaria }}>
                        R$ {servico.preco.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mt-8 text-center sm:hidden"
            >
              <Link 
                href={\`/\${tenant.slug}/agendar\`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all hover:scale-[1.02]"
                style={{ 
                  backgroundColor: cores.secundaria,
                  color: cores.primaria
                }}
              >
                Ver todos os serviços
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* Profissionais */}
      {barbeiros.length > 0 && (
        <section 
          className="py-16 px-4"
          style={{ backgroundColor: cores.destaque + '05' }}
        >
          <div className="max-w-5xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <p className="text-sm font-medium tracking-widest uppercase mb-2" style={{ color: cores.destaque }}>
                Equipe
              </p>
              <h2 className="text-3xl font-bold" style={{ color: cores.secundaria }}>
                Nossos Profissionais
              </h2>
            </motion.div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {barbeiros.map((barbeiro, index) => (
                <motion.div
                  key={barbeiro.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-5 rounded-xl border text-center transition-all hover:scale-[1.02]"
                  style={{ 
                    backgroundColor: cores.primaria,
                    borderColor: cores.destaque + '20'
                  }}
                >
                  <div 
                    className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: cores.destaque + '20' }}
                  >
                    {barbeiro.foto_url ? (
                      <Image
                        src={barbeiro.foto_url}
                        alt={barbeiro.nome}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="w-8 h-8" style={{ color: cores.destaque }} />
                    )}
                  </div>
                  <h3 className="font-semibold mb-1" style={{ color: cores.secundaria }}>
                    {barbeiro.nome}
                  </h3>
                  {barbeiro.especialidades?.length > 0 && (
                    <p className="text-xs mb-2" style={{ color: cores.destaque }}>
                      {barbeiro.especialidades.slice(0, 2).join(' • ')}
                    </p>
                  )}
                  {barbeiro.avaliacao_media > 0 && (
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-current" style={{ color: cores.secundaria }} />
                      <span className="text-sm" style={{ color: cores.secundaria }}>
                        {barbeiro.avaliacao_media.toFixed(1)}
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Final */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: cores.secundaria }}>
              Pronto para agendar?
            </h2>
            <p className="text-lg mb-8" style={{ color: cores.destaque }}>
              Escolha seu horário e garanta seu atendimento
            </p>
            
            <Link
              href={\`/\${tenant.slug}/agendar\`}
              className="group inline-flex items-center gap-2 px-8 py-4 font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ 
                backgroundColor: cores.secundaria,
                color: cores.primaria
              }}
            >
              <Calendar className="w-5 h-5" />
              Agendar Agora
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Contato */}
      <section 
        className="py-12 px-4 border-t"
        style={{ borderColor: cores.destaque + '20' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap justify-center gap-6">
            {tenant.telefone && (
              <a 
                href={\`tel:\${tenant.telefone}\`}
                className="flex items-center gap-2 transition-opacity hover:opacity-80"
                style={{ color: cores.destaque }}
              >
                <Phone className="w-4 h-4" />
                {tenant.telefone}
              </a>
            )}
            
            {tenant.instagram && (
              <a
                href={\`https://instagram.com/\${tenant.instagram.replace('@', '')}\`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition-opacity hover:opacity-80"
                style={{ color: cores.destaque }}
              >
                <Instagram className="w-4 h-4" />
                {tenant.instagram}
              </a>
            )}

            {tenant.endereco && (
              <span className="flex items-center gap-2" style={{ color: cores.destaque }}>
                <MapPin className="w-4 h-4" />
                {tenant.cidade}{tenant.estado && \`, \${tenant.estado}\`}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer 
        className="py-6 px-4 text-center border-t"
        style={{ borderColor: cores.destaque + '20' }}
      >
        <p className="text-sm" style={{ color: cores.destaque }}>
          {new Date().getFullYear()} {tenant.nome}. Todos os direitos reservados.
        </p>
        <p className="text-xs mt-2" style={{ color: cores.destaque + '80' }}>
          Powered by{' '}
          <a href="/" className="hover:underline" style={{ color: cores.secundaria }}>
            BarberHub
          </a>
        </p>
      </footer>
    </div>
  )
}
