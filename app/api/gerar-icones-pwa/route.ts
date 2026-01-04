import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'

const R2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

/**
 * Gera ícones PWA automaticamente a partir de uma imagem
 * Cria versões 192x192 e 512x512 otimizadas para PWA
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const tenantId = formData.get('tenant_id') as string

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

    // Validar tamanho (máx 10MB para processamento)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx 10MB)' }, { status: 400 })
    }

    // Converter para buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Timestamp único para os arquivos
    const timestamp = Date.now()

    // Gerar ícone 192x192
    const icone192 = await sharp(buffer)
      .resize(192, 192, {
        fit: 'cover',
        position: 'center',
      })
      .png({ quality: 90 })
      .toBuffer()

    // Gerar ícone 512x512
    const icone512 = await sharp(buffer)
      .resize(512, 512, {
        fit: 'cover',
        position: 'center',
      })
      .png({ quality: 90 })
      .toBuffer()

    // Nome dos arquivos
    const nomeIcone192 = `${tenantId}/pwa/icon-192-${timestamp}.png`
    const nomeIcone512 = `${tenantId}/pwa/icon-512-${timestamp}.png`

    // Upload ícone 192
    await R2.send(
      new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: nomeIcone192,
        Body: icone192,
        ContentType: 'image/png',
      })
    )

    // Upload ícone 512
    await R2.send(
      new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: nomeIcone512,
        Body: icone512,
        ContentType: 'image/png',
      })
    )

    // Construir URLs públicas
    const url192 = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${nomeIcone192}`
    const url512 = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${nomeIcone512}`

    return NextResponse.json({
      icone_192: url192,
      icone_512: url512,
    })

  } catch (error) {
    console.error('Erro ao gerar ícones PWA:', error)
    return NextResponse.json({ error: 'Erro ao gerar ícones PWA' }, { status: 500 })
  }
}

/**
 * Gera ícones PWA a partir de uma URL de imagem existente
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { logo_url, tenant_id } = body

    if (!logo_url) {
      return NextResponse.json({ error: 'URL da logo não fornecida' }, { status: 400 })
    }

    if (!tenant_id) {
      return NextResponse.json({ error: 'Tenant ID não fornecido' }, { status: 400 })
    }

    // Baixar imagem da URL
    const response = await fetch(logo_url)
    if (!response.ok) {
      return NextResponse.json({ error: 'Não foi possível baixar a imagem' }, { status: 400 })
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Timestamp único para os arquivos
    const timestamp = Date.now()

    // Gerar ícone 192x192
    const icone192 = await sharp(buffer)
      .resize(192, 192, {
        fit: 'cover',
        position: 'center',
      })
      .png({ quality: 90 })
      .toBuffer()

    // Gerar ícone 512x512
    const icone512 = await sharp(buffer)
      .resize(512, 512, {
        fit: 'cover',
        position: 'center',
      })
      .png({ quality: 90 })
      .toBuffer()

    // Nome dos arquivos
    const nomeIcone192 = `${tenant_id}/pwa/icon-192-${timestamp}.png`
    const nomeIcone512 = `${tenant_id}/pwa/icon-512-${timestamp}.png`

    // Upload ícone 192
    await R2.send(
      new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: nomeIcone192,
        Body: icone192,
        ContentType: 'image/png',
      })
    )

    // Upload ícone 512
    await R2.send(
      new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: nomeIcone512,
        Body: icone512,
        ContentType: 'image/png',
      })
    )

    // Construir URLs públicas
    const url192 = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${nomeIcone192}`
    const url512 = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${nomeIcone512}`

    return NextResponse.json({
      icone_192: url192,
      icone_512: url512,
    })

  } catch (error) {
    console.error('Erro ao gerar ícones PWA:', error)
    return NextResponse.json({ error: 'Erro ao gerar ícones PWA' }, { status: 500 })
  }
}
