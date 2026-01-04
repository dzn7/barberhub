import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_AUTH_HEADER = 'dzndev-1503'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * GET - Lista todos os usuários do Supabase Auth
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('x-admin-auth')
  if (authHeader !== ADMIN_AUTH_HEADER) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    })

    if (error) throw error

    const usuarios = data.users.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      raw_user_meta_data: u.user_metadata
    }))

    return NextResponse.json({ usuarios, total: usuarios.length })
  } catch (error: any) {
    console.error('Erro ao listar usuários:', error)
    return NextResponse.json(
      { error: 'Erro ao listar usuários', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Exclui um usuário do Supabase Auth
 */
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('x-admin-auth')
  if (authHeader !== ADMIN_AUTH_HEADER) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    // Primeiro, remover o proprietário associado se existir
    await supabaseAdmin
      .from('proprietarios')
      .delete()
      .eq('user_id', userId)

    // Depois, excluir o usuário do auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Usuário excluído com sucesso' })
  } catch (error: any) {
    console.error('Erro ao excluir usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir usuário', message: error.message },
      { status: 500 }
    )
  }
}
