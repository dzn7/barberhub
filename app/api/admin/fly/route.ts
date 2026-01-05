import { NextResponse } from 'next/server'

/**
 * API Route para gerenciar o bot no Fly.io
 * Utiliza a Fly.io Machines API para controle completo
 * 
 * Endpoints:
 * - GET: Buscar status detalhado das machines
 * - POST: Executar ações (start, stop, restart)
 */

const FLY_API_TOKEN = process.env.FLY_API_TOKEN
const FLY_APP_NAME = process.env.FLY_APP_NAME || 'bot-barberhub'
const FLY_API_HOSTNAME = 'https://api.machines.dev'

// Autenticação simples para admin
const ADMIN_AUTH = 'dzndev-1503'

interface FlyMachine {
  id: string
  name: string
  state: string
  region: string
  instance_id: string
  private_ip: string
  created_at: string
  updated_at: string
  config: {
    guest: {
      cpu_kind: string
      cpus: number
      memory_mb: number
    }
    image: string
    env?: Record<string, string>
  }
  image_ref: {
    registry: string
    repository: string
    tag: string
    digest: string
  }
  events?: Array<{
    type: string
    status: string
    source: string
    timestamp: number
  }>
  checks?: Array<{
    name: string
    status: string
    output: string
    updated_at: string
  }>
}

interface FlyAppInfo {
  name: string
  status: string
  organization: {
    slug: string
  }
  currentRelease?: {
    status: string
    createdAt: string
    version: number
  }
  machines: FlyMachine[]
}

/**
 * Verifica autenticação do admin
 */
function verificarAuth(request: Request): boolean {
  const authHeader = request.headers.get('x-admin-auth')
  return authHeader === ADMIN_AUTH
}

/**
 * Busca informações do app via GraphQL API
 */
async function buscarInfoApp(): Promise<FlyAppInfo | null> {
  try {
    const response = await fetch('https://api.fly.io/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            app(name: "${FLY_APP_NAME}") {
              name
              status
              organization {
                slug
              }
              currentRelease {
                status
                createdAt
                version
              }
            }
          }
        `
      })
    })

    if (!response.ok) {
      console.error('[Fly API] Erro GraphQL:', response.status)
      return null
    }

    const data = await response.json()
    return data.data?.app || null
  } catch (erro) {
    console.error('[Fly API] Erro ao buscar info app:', erro)
    return null
  }
}

/**
 * Lista todas as machines do app via Machines API
 */
async function listarMachines(): Promise<FlyMachine[]> {
  try {
    const response = await fetch(
      `${FLY_API_HOSTNAME}/v1/apps/${FLY_APP_NAME}/machines`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${FLY_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const erro = await response.text()
      console.error('[Fly API] Erro ao listar machines:', erro)
      return []
    }

    return await response.json()
  } catch (erro) {
    console.error('[Fly API] Erro ao listar machines:', erro)
    return []
  }
}

/**
 * Executa ação em uma machine específica
 */
async function executarAcaoMachine(
  machineId: string, 
  acao: 'start' | 'stop' | 'restart'
): Promise<{ sucesso: boolean; mensagem: string; dados?: any }> {
  try {
    // Para restart, primeiro para e depois inicia
    if (acao === 'restart') {
      // Stop
      const stopResponse = await fetch(
        `${FLY_API_HOSTNAME}/v1/apps/${FLY_APP_NAME}/machines/${machineId}/stop`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FLY_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ timeout: '30s' })
        }
      )

      if (!stopResponse.ok) {
        const erro = await stopResponse.text()
        return { sucesso: false, mensagem: `Erro ao parar machine: ${erro}` }
      }

      // Aguardar um pouco antes de iniciar
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Start
      const startResponse = await fetch(
        `${FLY_API_HOSTNAME}/v1/apps/${FLY_APP_NAME}/machines/${machineId}/start`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FLY_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!startResponse.ok) {
        const erro = await startResponse.text()
        return { sucesso: false, mensagem: `Erro ao iniciar machine: ${erro}` }
      }

      const dados = await startResponse.json()
      return { sucesso: true, mensagem: 'Machine reiniciada com sucesso', dados }
    }

    // Start ou Stop
    const response = await fetch(
      `${FLY_API_HOSTNAME}/v1/apps/${FLY_APP_NAME}/machines/${machineId}/${acao}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FLY_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: acao === 'stop' ? JSON.stringify({ timeout: '30s' }) : undefined
      }
    )

    if (!response.ok) {
      const erro = await response.text()
      return { sucesso: false, mensagem: `Erro ao executar ${acao}: ${erro}` }
    }

    const dados = await response.json()
    return { 
      sucesso: true, 
      mensagem: `Machine ${acao === 'start' ? 'iniciada' : 'parada'} com sucesso`,
      dados 
    }
  } catch (erro: any) {
    return { sucesso: false, mensagem: erro.message }
  }
}

/**
 * Aguarda machine atingir estado específico
 */
async function aguardarEstado(
  machineId: string, 
  estadoEsperado: string,
  timeoutMs: number = 30000
): Promise<boolean> {
  const inicio = Date.now()
  
  while (Date.now() - inicio < timeoutMs) {
    try {
      const response = await fetch(
        `${FLY_API_HOSTNAME}/v1/apps/${FLY_APP_NAME}/machines/${machineId}/wait?state=${estadoEsperado}&timeout=10`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${FLY_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.ok) {
        return true
      }
    } catch {
      // Continua tentando
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  return false
}

/**
 * GET - Buscar status detalhado do bot
 */
export async function GET(request: Request) {
  if (!verificarAuth(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  if (!FLY_API_TOKEN) {
    return NextResponse.json({ 
      error: 'FLY_API_TOKEN não configurado',
      configurado: false 
    }, { status: 500 })
  }

  try {
    // Buscar info do app e machines em paralelo
    const [appInfo, machines] = await Promise.all([
      buscarInfoApp(),
      listarMachines()
    ])

    // Processar dados das machines
    const machinesProcessadas = machines.map(machine => ({
      id: machine.id,
      nome: machine.name,
      estado: machine.state,
      regiao: machine.region,
      ip_privado: machine.private_ip,
      criado_em: machine.created_at,
      atualizado_em: machine.updated_at,
      config: {
        cpu: machine.config?.guest?.cpu_kind || 'shared',
        cpus: machine.config?.guest?.cpus || 1,
        memoria_mb: machine.config?.guest?.memory_mb || 256,
        imagem: machine.config?.image || 'desconhecida'
      },
      imagem: {
        repositorio: machine.image_ref?.repository,
        tag: machine.image_ref?.tag,
        digest: machine.image_ref?.digest?.substring(0, 16)
      },
      eventos: (machine.events || []).slice(0, 5).map(e => ({
        tipo: e.type,
        status: e.status,
        fonte: e.source,
        timestamp: new Date(e.timestamp).toISOString()
      })),
      checks: machine.checks || []
    }))

    // Determinar status geral
    const machineAtiva = machinesProcessadas.find(m => m.estado === 'started')
    const statusGeral = machineAtiva ? 'online' : 
      machinesProcessadas.some(m => m.estado === 'starting') ? 'iniciando' :
      machinesProcessadas.some(m => m.estado === 'stopping') ? 'parando' :
      'offline'

    return NextResponse.json({
      app: {
        nome: appInfo?.name || FLY_APP_NAME,
        status: appInfo?.status || 'desconhecido',
        organizacao: appInfo?.organization?.slug || 'pessoal',
        release_atual: appInfo?.currentRelease ? {
          status: appInfo.currentRelease.status,
          versao: appInfo.currentRelease.version,
          criado_em: appInfo.currentRelease.createdAt
        } : null
      },
      status_geral: statusGeral,
      machines: machinesProcessadas,
      total_machines: machinesProcessadas.length,
      machines_ativas: machinesProcessadas.filter(m => m.estado === 'started').length,
      timestamp: new Date().toISOString()
    })
  } catch (erro: any) {
    console.error('[Fly API] Erro geral:', erro)
    return NextResponse.json({ 
      error: 'Erro ao buscar status do bot',
      detalhes: erro.message 
    }, { status: 500 })
  }
}

/**
 * POST - Executar ação no bot
 * Body: { acao: 'start' | 'stop' | 'restart', machine_id?: string }
 */
export async function POST(request: Request) {
  if (!verificarAuth(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  if (!FLY_API_TOKEN) {
    return NextResponse.json({ 
      error: 'FLY_API_TOKEN não configurado' 
    }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { acao, machine_id } = body

    if (!acao || !['start', 'stop', 'restart'].includes(acao)) {
      return NextResponse.json({ 
        error: 'Ação inválida. Use: start, stop ou restart' 
      }, { status: 400 })
    }

    // Se não especificou machine_id, buscar a primeira machine
    let targetMachineId = machine_id
    
    if (!targetMachineId) {
      const machines = await listarMachines()
      if (machines.length === 0) {
        return NextResponse.json({ 
          error: 'Nenhuma machine encontrada no app' 
        }, { status: 404 })
      }
      targetMachineId = machines[0].id
    }

    // Executar ação
    const resultado = await executarAcaoMachine(targetMachineId, acao)

    if (!resultado.sucesso) {
      return NextResponse.json({ 
        error: resultado.mensagem 
      }, { status: 500 })
    }

    // Aguardar estado esperado
    const estadoEsperado = acao === 'stop' ? 'stopped' : 'started'
    const atingiuEstado = await aguardarEstado(targetMachineId, estadoEsperado, 30000)

    return NextResponse.json({
      sucesso: true,
      mensagem: resultado.mensagem,
      machine_id: targetMachineId,
      acao,
      estado_atingido: atingiuEstado,
      dados: resultado.dados,
      timestamp: new Date().toISOString()
    })
  } catch (erro: any) {
    console.error('[Fly API] Erro ao executar ação:', erro)
    return NextResponse.json({ 
      error: 'Erro ao executar ação',
      detalhes: erro.message 
    }, { status: 500 })
  }
}
