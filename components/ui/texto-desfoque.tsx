import { motion, Transition, Easing } from 'framer-motion';
import { useEffect, useRef, useState, useMemo } from 'react';

type PropriedadesTextoDesfoque = {
  texto?: string;
  atraso?: number;
  className?: string;
  animarPor?: 'palavras' | 'letras';
  direcao?: 'cima' | 'baixo';
  limiar?: number;
  margemRaiz?: string;
  animacaoDe?: Record<string, string | number>;
  animacaoPara?: Array<Record<string, string | number>>;
  suavizacao?: Easing | Easing[];
  aoCompletarAnimacao?: () => void;
  duracaoPasso?: number;
};

const construirKeyframes = (
  de: Record<string, string | number>,
  passos: Array<Record<string, string | number>>
): Record<string, Array<string | number>> => {
  const chaves = new Set<string>([...Object.keys(de), ...passos.flatMap(p => Object.keys(p))]);

  const keyframes: Record<string, Array<string | number>> = {};
  chaves.forEach(c => {
    keyframes[c] = [de[c], ...passos.map(p => p[c])];
  });
  return keyframes;
};

const TextoDesfoque: React.FC<PropriedadesTextoDesfoque> = ({
  texto = '',
  atraso = 200,
  className = '',
  animarPor = 'palavras',
  direcao = 'cima',
  limiar = 0.1,
  margemRaiz = '0px',
  animacaoDe,
  animacaoPara,
  suavizacao = (t: number) => t,
  aoCompletarAnimacao,
  duracaoPasso = 0.35
}) => {
  const elementos = animarPor === 'palavras' ? texto.split(' ') : texto.split('');
  const [emVisao, setEmVisao] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setEmVisao(true);
          observador.unobserve(ref.current as Element);
        }
      },
      { threshold: limiar, rootMargin: margemRaiz }
    );
    observador.observe(ref.current);
    return () => observador.disconnect();
  }, [limiar, margemRaiz]);

  const padraoDE = useMemo(
    () =>
      direcao === 'cima' ? { filter: 'blur(10px)', opacity: 0, y: -50 } : { filter: 'blur(10px)', opacity: 0, y: 50 },
    [direcao]
  );

  const padraoPARA = useMemo(
    () => [
      {
        filter: 'blur(5px)',
        opacity: 0.5,
        y: direcao === 'cima' ? 5 : -5
      },
      { filter: 'blur(0px)', opacity: 1, y: 0 }
    ],
    [direcao]
  );

  const deSnapshot = animacaoDe ?? padraoDE;
  const paraSnapshots = animacaoPara ?? padraoPARA;

  const contagemPassos = paraSnapshots.length + 1;
  const duracaoTotal = duracaoPasso * (contagemPassos - 1);
  const tempos = Array.from({ length: contagemPassos }, (_, i) => (contagemPassos === 1 ? 0 : i / (contagemPassos - 1)));

  return (
    <p ref={ref} className={`${className} flex flex-wrap`}>
      {elementos.map((segmento, indice) => {
        const keyframesAnimacao = construirKeyframes(deSnapshot, paraSnapshots);

        const transicaoSpan: Transition = {
          duration: duracaoTotal,
          times: tempos,
          delay: (indice * atraso) / 1000,
          ease: suavizacao
        };

        return (
          <motion.span
            key={indice}
            initial={deSnapshot}
            animate={emVisao ? keyframesAnimacao : deSnapshot}
            transition={transicaoSpan}
            onAnimationComplete={indice === elementos.length - 1 ? aoCompletarAnimacao : undefined}
            style={{
              display: 'inline-block',
              willChange: 'transform, filter, opacity'
            }}
          >
            {segmento === ' ' ? '\u00A0' : segmento}
            {animarPor === 'palavras' && indice < elementos.length - 1 && '\u00A0'}
          </motion.span>
        );
      })}
    </p>
  );
};

export default TextoDesfoque;
