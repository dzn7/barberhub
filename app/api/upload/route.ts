import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const R2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const tenantId = formData.get('tenant_id') as string
    const tipo = formData.get('tipo') as string || 'imagem'

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 })
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID não fornecido' }, { status: 400 })
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido' }, { status: 400 })
    }

    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx 5MB)' }, { status: 400 })
    }

    // Gerar nome único
    const extensao = file.name.split('.').pop()
    const nomeArquivo = `${tenantId}/${tipo}/${Date.now()}-${Math.random().toString(36).substring(7)}.${extensao}`

    // Converter para buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload para R2
    await R2.send(
      new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: nomeArquivo,
        Body: buffer,
        ContentType: file.type,
      })
    )

    // Construir URL pública
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${nomeArquivo}`

    return NextResponse.json({ 
      url: publicUrl,
      key: nomeArquivo 
    })

  } catch (error) {
    console.error('Erro no upload:', error)
    return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json({ error: 'URL não fornecida' }, { status: 400 })
    }

    // Extrair key da URL pública
    const publicUrlBase = process.env.CLOUDFLARE_R2_PUBLIC_URL
    if (!publicUrlBase || !url.startsWith(publicUrlBase)) {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
    }

    const key = url.replace(`${publicUrlBase}/`, '')

    // Deletar do R2
    await R2.send(
      new DeleteObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: key,
      })
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar arquivo:', error)
    return NextResponse.json({ error: 'Erro ao deletar arquivo' }, { status: 500 })
  }
}
