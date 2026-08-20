import { WORKSPACES_META } from '../../constants'

const WS_ICONS = {
  'dev-squad': 'fa-code',
  'gaming-hub': 'fa-gamepad',
  'design-lab': 'fa-palette',
}

export default function Rail({ activeWs, onSelectWs, onGoHome }) {
  return (
    <aside className="app-rail" aria-label="Espaços de trabalho">
      <button className="rail-home" title="Início" onClick={onGoHome}>
        <i className="fa-solid fa-waveform-lines"></i>
      </button>
      <div className="rail-sep"></div>

      <div className="rail-list">
        {Object.keys(WORKSPACES_META).map(wsKey => (
          <button
            key={wsKey}
            className={`rail-item${activeWs === wsKey ? ' active' : ''}`}
            title={WORKSPACES_META[wsKey].name}
            onClick={() => onSelectWs(wsKey)}
          >
            <span className="rail-pip"></span>
            <i className={`fa-solid ${WS_ICONS[wsKey]}`}></i>
          </button>
        ))}
      </div>

      <div className="rail-bottom">
        <button className="rail-add" title="Novo Espaço">
          <i className="fa-solid fa-plus"></i>
        </button>
      </div>
    </aside>
  )
}