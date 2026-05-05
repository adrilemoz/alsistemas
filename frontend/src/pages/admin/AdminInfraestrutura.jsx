/**
 * AdminInfraestrutura.jsx — Componente-roteador de abas.
 *
 * Toda a lógica e UI foi extraída para:
 *   components/admin/infra/InfraBase.jsx        — primitivos compartilhados
 *   components/admin/infra/AbaConfiguracoes.jsx — aba MongoDB/Cloudinary config
 *   components/admin/infra/AbaMongoDB.jsx       — aba exploração do banco
 *   components/admin/infra/AbaCloudinary.jsx    — aba galeria de mídia
 *   components/admin/infra/AbaSistema.jsx       — aba CPU/memória/cache
 */
import { useState, Suspense, lazy } from 'react'
import { C, Ico, Spin } from '../../components/admin/infra/InfraBase'

const AbaConfiguracoes = lazy(() => import('../../components/admin/infra/AbaConfiguracoes'))
const AbaMongoDB       = lazy(() => import('../../components/admin/infra/AbaMongoDB'))
const AbaCloudinary    = lazy(() => import('../../components/admin/infra/AbaCloudinary'))
const AbaSistema       = lazy(() => import('../../components/admin/infra/AbaSistema'))

const ABAS = [
  { id: 'config',     label: 'Configurações', icon: Ico.gear  },
  { id: 'mongodb',    label: 'MongoDB',       icon: Ico.db    },
  { id: 'cloudinary', label: 'Cloudinary',    icon: Ico.cloud },
  { id: 'sistema',    label: 'Sistema',       icon: Ico.cpu   },
]

const ABA_COMPONENTE = {
  config:     <AbaConfiguracoes />,
  mongodb:    <AbaMongoDB />,
  cloudinary: <AbaCloudinary />,
  sistema:    <AbaSistema />,
}

export default function AdminInfraestrutura() {
  const [abaAtiva, setAbaAtiva] = useState('config')

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <h1 className="adm-page-title">Infraestrutura</h1>
        <p className="adm-page-sub">Configurações, banco de dados, mídia e sistema</p>
      </div>

      <div className="adm-tabs" style={{ marginBottom: 24 }}>
        {ABAS.map(aba => (
          <button
            key={aba.id}
            className={`adm-tab-btn${abaAtiva === aba.id ? ' active' : ''}`}
            onClick={() => setAbaAtiva(aba.id)}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {aba.icon} {aba.label}
            </span>
          </button>
        ))}
      </div>

      <Suspense fallback={
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: C.muted }}>
          <Spin size={24} />
        </div>
      }>
        {ABA_COMPONENTE[abaAtiva]}
      </Suspense>
    </div>
  )
}
