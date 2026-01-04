import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

/**
 * API Route para buscar métricas do sistema
 * Acesso restrito - requer autenticação admin
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cloudflare R2 Client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

// Cliente Supabase com service role (acesso total)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: Request) {
  try {
    // Verificar header de autenticação simples
    const authHeader = request.headers.get('x-admin-auth')
    if (authHeader !== 'dzndev-1503') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar tamanho do banco de dados
    const { data: dbSize, error: dbError } = await supabaseAdmin.rpc('pg_database_size', {
      db_name: 'postgres'
    }).single()

    // Se a função RPC não existir, calcular de outra forma
    let tamanhoDb = 0
    if (dbError) {
      // Tentar query direta para estimar tamanho
      const { data: tablesSizes } = await supabaseAdmin
        .from('tenants')
        .select('id', { count: 'exact', head: true })
      
      // Estimativa baseada no número de registros
      const { count: totalTenants } = await supabaseAdmin
        .from('tenants')
        .select('*', { count: 'exact', head: true })
      
      const { count: totalAgendamentos } = await supabaseAdmin
        .from('agendamentos')
        .select('*', { count: 'exact', head: true })
      
      const { count: totalClientes } = await supabaseAdmin
        .from('clientes')
        .select('*', { count: 'exact', head: true })
      
      const { count: totalBarbeiros } = await supabaseAdmin
        .from('barbeiros')
        .select('*', { count: 'exact', head: true })
      
      const { count: totalServicos } = await supabaseAdmin
        .from('servicos')
        .select('*', { count: 'exact', head: true })

      const { count: totalTrabalhos } = await supabaseAdmin
        .from('trabalhos')
        .select('*', { count: 'exact', head: true })

      // Estimativa grosseira: ~2KB por registro em média
      const totalRegistros = (totalTenants || 0) + (totalAgendamentos || 0) + 
        (totalClientes || 0) + (totalBarbeiros || 0) + (totalServicos || 0) + (totalTrabalhos || 0)
      
      tamanhoDb = totalRegistros * 2 // KB
    } else {
      tamanhoDb = Math.round((dbSize as number) / 1024) // Converter para KB
    }

    // Buscar contagem de usuários auth
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1
    })

    let totalAuthUsers = 0
    if (!authError && authUsers) {
      // A API retorna o total no objeto
      totalAuthUsers = authUsers.users?.length || 0
      
      // Buscar total real paginando
      let page = 1
      let hasMore = true
      totalAuthUsers = 0
      
      while (hasMore && page <= 100) { // Limite de segurança
        const { data: pageUsers } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: 1000
        })
        
        if (pageUsers?.users && pageUsers.users.length > 0) {
          totalAuthUsers += pageUsers.users.length
          hasMore = pageUsers.users.length === 1000
          page++
        } else {
          hasMore = false
        }
      }
    }

    // Buscar estatísticas das tabelas
    const [
      { count: tenants },
      { count: agendamentos },
      { count: clientes },
      { count: barbeiros },
      { count: servicos },
      { count: trabalhos },
      { count: transacoes },
      { count: comentarios }
    ] = await Promise.all([
      supabaseAdmin.from('tenants').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('agendamentos').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('clientes').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('barbeiros').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('servicos').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('trabalhos').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('transacoes').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('comentarios_trabalhos').select('*', { count: 'exact', head: true }),
    ])

    // Calcular estimativa de tamanho do banco
    const totalRegistros = (tenants || 0) + (agendamentos || 0) + (clientes || 0) + 
      (barbeiros || 0) + (servicos || 0) + (trabalhos || 0) + (transacoes || 0) + (comentarios || 0)
    
    // Estimativa: ~1.5KB por registro em média (conservador)
    const tamanhoEstimadoKB = totalRegistros * 1.5
    const tamanhoEstimadoMB = tamanhoEstimadoKB / 1024

    // Buscar métricas do Cloudflare R2
    let r2Metricas = {
      total_objetos: 0,
      tamanho_total_bytes: 0,
      tamanho_total_mb: 0,
      limite_gb: 10,
      percentual: 0
    }

    try {
      // Buscar objetos do bucket R2
      const listCommand = new ListObjectsV2Command({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        MaxKeys: 1000,
      })

      const listResponse = await r2Client.send(listCommand)
      
      let totalSize = 0
      let totalObjects = 0

      if (listResponse.Contents) {
        for (const obj of listResponse.Contents) {
          totalSize += obj.Size || 0
          totalObjects++
        }
      }

      const tamanhoMB = totalSize / (1024 * 1024)
      const limiteBytes = 10 * 1024 * 1024 * 1024 // 10 GB

      r2Metricas = {
        total_objetos: totalObjects,
        tamanho_total_bytes: totalSize,
        tamanho_total_mb: Math.round(tamanhoMB * 100) / 100,
        limite_gb: 10,
        percentual: Math.round((totalSize / limiteBytes) * 100 * 100) / 100
      }
    } catch (r2Error: any) {
      console.error('Erro ao buscar métricas R2:', r2Error.message)
    }

    // Buscar status do bot Fly.io
    let flyMetricas = {
      online: false,
      app_name: 'bot-barberhub',
      region: 'gru',
      vm_size: 'shared-cpu-1x',
      memory_mb: 256,
      status: 'unknown',
      erro: null as string | null
    }

    try {
      const flyResponse = await fetch('https://api.fly.io/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.FLY_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query {
              app(name: "bot-barberhub") {
                name
                status
                currentRelease {
                  status
                  createdAt
                }
                machines {
                  nodes {
                    state
                    region
                    config {
                      guest {
                        cpuKind
                        cpus
                        memoryMb
                      }
                    }
                  }
                }
              }
            }
          `
        })
      })

      if (flyResponse.ok) {
        const flyData = await flyResponse.json()
        const app = flyData.data?.app

        if (app) {
          const machine = app.machines?.nodes?.[0]
          flyMetricas = {
            online: app.status === 'deployed' || machine?.state === 'started',
            app_name: app.name,
            region: machine?.region || 'gru',
            vm_size: machine?.config?.guest?.cpuKind === 'shared' ? 'shared-cpu-1x' : 'dedicated',
            memory_mb: machine?.config?.guest?.memoryMb || 256,
            status: machine?.state || app.status,
            erro: null
          }
        }
      }
    } catch (flyError: any) {
      flyMetricas.erro = flyError.message
      console.error('Erro ao buscar métricas Fly.io:', flyError.message)
    }

    return NextResponse.json({
      supabase: {
        database: {
          usado_mb: Math.round(tamanhoEstimadoMB * 100) / 100,
          limite_mb: 500,
          percentual: Math.round((tamanhoEstimadoMB / 500) * 100 * 100) / 100
        },
        auth: {
          usuarios: totalAuthUsers,
          limite: 50000,
          percentual: Math.round((totalAuthUsers / 50000) * 100 * 100) / 100
        },
        tabelas: {
          tenants: tenants || 0,
          agendamentos: agendamentos || 0,
          clientes: clientes || 0,
          barbeiros: barbeiros || 0,
          servicos: servicos || 0,
          trabalhos: trabalhos || 0,
          transacoes: transacoes || 0,
          comentarios: comentarios || 0,
          total_registros: totalRegistros
        }
      },
      cloudflare_r2: r2Metricas,
      fly_io: flyMetricas,
      timestamp: new Date().toISOString()
    })
  } catch (erro: any) {
    console.error('Erro ao buscar métricas:', erro)
    return NextResponse.json({ 
      error: 'Erro ao buscar métricas',
      detalhes: erro.message 
    }, { status: 500 })
  }
}
