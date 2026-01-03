import Link from 'next/link'

export default function BarbeariaNaoEncontrada() {
  return (
    <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4">Barbearia não encontrada</h1>
        <p className="text-zinc-400 mb-8">
          A barbearia que você está procurando não existe ou não está mais disponível.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors"
        >
          Voltar ao Início
        </Link>
      </div>
    </div>
  )
}
