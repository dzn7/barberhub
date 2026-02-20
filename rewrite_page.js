const fs = require('fs');
const path = '/Users/derickmackenzie/Documents/barbearia-app/barbearia/barberhub/app/configurar/page.tsx';
let data = fs.readFileSync(path, 'utf8');

const returnIndex = data.lastIndexOf('  return (');
if (returnIndex === -1) throw new Error("Could not find the return block.");

const newReturn = `  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black transition-colors flex flex-col pb-24 lg:pb-0">
      <header className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <LogoMarca className="h-8 sm:h-10" />
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 hidden sm:block">
              Passo {etapaAtual} de {TOTAL_ETAPAS}
            </span>
            <button 
              onClick={() => setMostrarPreviewMobile(true)} 
              className="lg:hidden flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Ver preview do site"
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </button>
            {/* Theme Toggle */}
            {montado && (
              <button
                onClick={alternarTema}
                className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors border border-transparent dark:border-zinc-700/50 text-zinc-600 dark:text-zinc-400"
                aria-label="Alternar tema"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}
            <button 
              onClick={() => router.push('/admin')} 
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors ml-2"
            >
              Pular
            </button>
          </div>
        </div>

        {/* Barra de progresso linear no topo */}
        <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-900 absolute bottom-0 left-0">
          <motion.div 
            className="h-full bg-zinc-900 dark:bg-white" 
            initial={{ width: 0 }} 
            animate={{ width: \`\${(etapaAtual / TOTAL_ETAPAS) * 100}%\` }} 
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} 
          />
        </div>
      </header>

      {/* Stepper visual limpo */}
      <div className="bg-white dark:bg-zinc-950/50 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-4 scrollbar-hide snap-x">
            {ETAPAS.map((etapa) => {
              const Icone = etapa.icone
              const ativa = etapaAtual === etapa.id
              const completa = etapaAtual > etapa.id
              return (
                <button 
                  key={etapa.id} 
                  onClick={() => etapa.id < etapaAtual && setEtapaAtual(etapa.id)} 
                  disabled={etapa.id > etapaAtual} 
                  className={\`
                    flex items-center gap-3 px-3 py-2 rounded-xl transition-all flex-shrink-0 snap-start
                    \${ativa ? 'bg-zinc-100 dark:bg-zinc-800' : completa ? 'hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer' : 'opacity-40 cursor-not-allowed'}
                  \`}
                >
                  <div className={\`
                    w-8 h-8 rounded-full flex items-center justify-center transition-all border
                    \${ativa 
                      ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
                      : completa 
                        ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-900' 
                        : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400'
                    }
                  \`}>
                    {completa ? <Check className="w-4 h-4" /> : <Icone className="w-4 h-4" />}
                  </div>
                  <div className="text-left hidden sm:block pr-2">
                    <p className={\`text-sm font-semibold \${ativa ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}\`}>
                      {etapa.titulo}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 lg:py-12">
        <div className="grid lg:grid-cols-5 gap-8 xl:gap-12">
          
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {etapaAtual === 1 && (
                <motion.div key="etapa1" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
                  <CabecalhoEtapa etapa={ETAPAS[0]} etapaAtual={etapaAtual} totalEtapas={TOTAL_ETAPAS} />
                  <div className="space-y-8 bg-white dark:bg-zinc-950/50 p-6 sm:p-8 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
                    <div>
                      <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-200 mb-2">
                        {ehNail ? 'Nome do Estúdio' : 'Nome da Barbearia'} <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={dados.nome} 
                        onChange={e => setDados({ ...dados, nome: e.target.value })} 
                        placeholder={ehNail ? 'Ex: Studio Nails Premium' : 'Ex: Barbearia Premium'} 
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-900 dark:focus:border-white transition-all" 
                      />
                      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                        Este é o longo usado no topo do seu site.
                      </p>
                    </div>
                    
                    <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800/50">
                      <EditorLogo 
                        logoUrl={dados.logo_url} 
                        tenantId={tenant.id} 
                        onLogoChange={(url, iconesPwa) => setDados({ ...dados, logo_url: url, icone_pwa_192: iconesPwa?.icone_192 || '', icone_pwa_512: iconesPwa?.icone_512 || '' })} 
                        corPrimaria={dados.cor_primaria} 
                        corSecundaria={dados.cor_secundaria} 
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {etapaAtual === 2 && (
                <motion.div key="etapa2" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
                  <CabecalhoEtapa etapa={ETAPAS[1]} etapaAtual={etapaAtual} totalEtapas={TOTAL_ETAPAS} />
                  <div className="space-y-6 bg-white dark:bg-zinc-950/50 p-6 sm:p-8 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-200 mb-2">WhatsApp <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                          <input 
                            type="tel" 
                            value={dados.whatsapp} 
                            onChange={e => setDados({ ...dados, whatsapp: formatarTelefone(e.target.value) })} 
                            placeholder="(00) 00000-0000" 
                            className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-900 dark:focus:border-white transition-all" 
                          />
                        </div>
                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Usado para receber agendamentos.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-200 mb-2">Telefone (opcional)</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                          <input 
                            type="tel" 
                            value={dados.telefone} 
                            onChange={e => setDados({ ...dados, telefone: formatarTelefone(e.target.value) })} 
                            placeholder="(00) 0000-0000" 
                            className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-900 dark:focus:border-white transition-all" 
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-200 mb-2">Instagram</label>
                      <div className="relative">
                        <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                        <input 
                          type="text" 
                          value={dados.instagram} 
                          onChange={e => setDados({ ...dados, instagram: e.target.value })} 
                          placeholder={ehNail ? '@seuestudionails' : '@suabarbearia'} 
                          className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-900 dark:focus:border-white transition-all" 
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-200 mb-2">E-mail</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                        <input 
                          type="email" 
                          value={dados.email} 
                          onChange={e => setDados({ ...dados, email: e.target.value })} 
                          placeholder={ehNail ? 'contato@seuestudio.com' : 'contato@barbearia.com'} 
                          className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-900 dark:focus:border-white transition-all" 
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {etapaAtual === 3 && (
                <motion.div key="etapa3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
                  <CabecalhoEtapa etapa={ETAPAS[2]} etapaAtual={etapaAtual} totalEtapas={TOTAL_ETAPAS} />
                  <div className="space-y-6 bg-white dark:bg-zinc-950/50 p-6 sm:p-8 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
                    <div>
                      <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-200 mb-2">Endereço completo</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                        <input 
                          type="text" 
                          value={dados.endereco} 
                          onChange={e => setDados({ ...dados, endereco: e.target.value })} 
                          placeholder="Rua, número, bairro..." 
                          className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-900 dark:focus:border-white transition-all" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:gap-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/50 mt-4">
                      <div>
                        <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-200 mb-2">Cidade</label>
                        <input 
                          type="text" 
                          value={dados.cidade} 
                          onChange={e => setDados({ ...dados, cidade: e.target.value })} 
                          placeholder="Sua cidade" 
                          className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-900 dark:focus:border-white transition-all" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-200 mb-2">Estado</label>
                        <input 
                          type="text" 
                          value={dados.estado} 
                          onChange={e => setDados({ ...dados, estado: e.target.value.toUpperCase() })} 
                          placeholder="UF" 
                          maxLength={2} 
                          className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-900 dark:focus:border-white transition-all uppercase" 
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {etapaAtual === 4 && (
                <motion.div key="etapa4" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
                  <CabecalhoEtapa etapa={ETAPAS[3]} etapaAtual={etapaAtual} totalEtapas={TOTAL_ETAPAS} />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {PALETAS.map((paleta) => {
                      const selecionada = dados.cor_primaria === paleta.primaria
                      return (
                        <button 
                          key={paleta.nome} 
                          onClick={() => aplicarPaleta(paleta)} 
                          className={\`
                            group relative p-5 rounded-2xl border-2 transition-all duration-200 text-left overflow-hidden
                            \${selecionada 
                              ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-900 shadow-sm' 
                              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm'
                            }
                          \`}
                        >
                          {selecionada && (
                            <div className="absolute top-4 right-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full p-1 shadow-sm">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div className="flex items-center gap-3 mb-4">
                            <div className="flex -space-x-2">
                              <div className="w-10 h-10 rounded-full border-2 border-white dark:border-zinc-950 shadow-sm z-10" style={{ backgroundColor: paleta.primaria }} />
                              <div className="w-10 h-10 rounded-full border-2 border-white dark:border-zinc-950 shadow-sm z-0" style={{ backgroundColor: paleta.secundaria }} />
                            </div>
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-900 dark:text-white mb-1 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                              {paleta.nome}
                            </p>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                              {paleta.descricao}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {etapaAtual === 5 && (
                <motion.div key="etapa5" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
                  <CabecalhoEtapa etapa={ETAPAS[4]} etapaAtual={etapaAtual} totalEtapas={TOTAL_ETAPAS} />
                  <div className="bg-white dark:bg-zinc-950/50 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden">
                    <ServicosMiniGestao tenantId={tenant.id} onTotalChange={setTotalServicos} tipoNegocio={tipoNegocio} />
                  </div>
                </motion.div>
              )}

              {etapaAtual === 6 && (
                <motion.div key="etapa6" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
                  <CabecalhoEtapa etapa={ETAPAS[5]} etapaAtual={etapaAtual} totalEtapas={TOTAL_ETAPAS} />
                  <div className="bg-white dark:bg-zinc-950/50 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden">
                    <CadastroBarbeirosOnboarding tenantId={tenant.id} onTotalChange={setTotalBarbeiros} tipoNegocio={tipoNegocio} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="hidden lg:block lg:col-span-2">
             <div className="sticky top-24">
              <p className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-4">Preview em tempo real</p>
              <div className="shadow-2xl rounded-[2.5rem] border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden transform transition-all duration-300 hover:scale-[1.02]">
                <PreviewSite dados={dados} totalServicos={totalServicos} totalBarbeiros={totalBarbeiros} />
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer Mobile/Desktop Sticky */}
      <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-white dark:bg-black border-t border-zinc-200 dark:border-zinc-800 z-40 lg:relative lg:bg-transparent lg:border-t-0 lg:p-0 lg:max-w-5xl lg:mx-auto lg:px-4 lg:-mt-6 lg:pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] lg:shadow-none">
        <div className="flex items-center justify-between gap-3 sm:gap-4 w-full h-full max-w-5xl mx-auto">
          {etapaAtual > 1 ? (
            <button 
              type="button" 
              onClick={voltar} 
              className="flex-1 lg:flex-none flex items-center justify-center py-3.5 lg:py-3 lg:px-6 rounded-xl font-semibold bg-zinc-100 dark:bg-zinc-900/80 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar
            </button>
          ) : (
            <div className="hidden lg:block w-32" />
          )}

          {etapaAtual < TOTAL_ETAPAS ? (
            <button 
              type="button" 
              onClick={avancar} 
              className="flex-[2] lg:flex-none flex items-center justify-center py-3.5 lg:py-3 lg:px-8 rounded-xl font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-lg shadow-zinc-900/20 dark:shadow-white/10"
            >
              Próximo Passo
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          ) : (
            <button 
              type="button" 
              onClick={finalizar} 
              disabled={salvando} 
              className="flex-[2] lg:flex-none flex items-center justify-center py-3.5 lg:py-3 lg:px-8 rounded-xl font-semibold bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {salvando ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Finalizando...</>
              ) : (
                <><Check className="w-5 h-5 mr-2" /> Finalizar</>
              )}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {mostrarPreviewMobile && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="lg:hidden fixed inset-0 z-50 bg-black"
          >
            <div className="h-full flex flex-col bg-zinc-50 dark:bg-black">
              <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <span className="text-zinc-900 dark:text-white font-semibold">Preview do Site</span>
                <button
                  onClick={() => setMostrarPreviewMobile(false)}
                  className="px-4 py-2 text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
              <div className="flex-1 overflow-auto bg-zinc-100 dark:bg-zinc-950 p-4 pb-12">
                <div className="max-w-[400px] mx-auto shadow-2xl rounded-[2.5rem] border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden bg-white dark:bg-black">
                  <PreviewSite dados={dados} totalServicos={totalServicos} totalBarbeiros={totalBarbeiros} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
`;

fs.writeFileSync(path, data.substring(0, returnIndex) + newReturn);
