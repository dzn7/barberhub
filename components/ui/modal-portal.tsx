'use client'

import { useEffect, useState, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'

interface ModalPortalProps {
  aberto: boolean
  onFechar: () => void
  children: ReactNode
  zIndex?: number
}

export function ModalPortal({ aberto, onFechar, children, zIndex = 99999 }: ModalPortalProps) {
  const [montado, setMontado] = useState(false)

  useEffect(() => {
    setMontado(true)
  }, [])

  useEffect(() => {
    if (aberto) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [aberto])

  if (!montado) return null

  if (!document?.body) return null

  return createPortal(
    aberto ? (
      <motion.div
        key="modal-portal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onFechar}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          zIndex,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <motion.div
          key="modal-portal-content"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[90vh] overflow-auto"
        >
          {children}
        </motion.div>
      </motion.div>
    ) : null,
    document.body
  )
}
