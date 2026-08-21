// Rail.jsx — Barra lateral de servidores (dinâmica + botões de criar/entrar)
export default function Rail({ servers, activeServerId, onSelectServer, onGoHome, onOpenCreate, onOpenJoin }) {

  // Gera iniciais para servidores sem ícone
  function serverInitials(name) {
    return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <aside className="app-rail" aria-label="Servidores">
      {/* Botão home */}
      <button className="rail-home" title="Início" onClick={onGoHome}>
        <i className="fa-solid fa-waveform-lines"></i>
      </button>
      <div className="rail-sep"></div>

      {/* Lista de servidores */}
      <div className="rail-list">
        {servers.map(server => (
          <button
            key={server.id}
            className={`rail-item rail-item-server${activeServerId === server.id ? ' active' : ''}`}
            title={server.name}
            onClick={() => onSelectServer(server)}
          >
            <span className="rail-pip"></span>
            {server.icon_url ? (
              <img
                src={server.icon_url}
                alt={server.name}
                className="rail-server-icon"
              />
            ) : (
              <span className="rail-server-initials">{serverInitials(server.name)}</span>
            )}
          </button>
        ))}
      </div>

      {/* Ações no fundo: criar e entrar */}
      <div className="rail-bottom">
        <button
          className="rail-add rail-add-create"
          title="Criar Servidor"
          onClick={onOpenCreate}
        >
          <i className="fa-solid fa-plus"></i>
        </button>
        <button
          className="rail-add rail-add-join"
          title="Entrar com Convite"
          onClick={onOpenJoin}
        >
          <i className="fa-solid fa-compass"></i>
        </button>
      </div>
    </aside>
  )
}