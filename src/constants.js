// ==========================================================================
// TALKY — Constantes globais
// ==========================================================================

export const WS_IDS = {
  'dev-squad':  'a1000000-0000-0000-0000-000000000001',
  'gaming-hub': 'a1000000-0000-0000-0000-000000000002',
  'design-lab': 'a1000000-0000-0000-0000-000000000003'
};

export const CH_IDS = {
  'geral':       'b1000000-0000-0000-0000-000000000001',
  'dev-lounge':  'b1000000-0000-0000-0000-000000000002',
  'showcase':    'b1000000-0000-0000-0000-000000000003',
  'chat-geral':  'b1000000-0000-0000-0000-000000000004',
  'feedback-ui': 'b1000000-0000-0000-0000-000000000005'
};

export const WORKSPACES_META = {
  'dev-squad': {
    name: 'Dev Squad HQ',
    channels: {
      'geral': {
        name: 'geral',
        topic: 'Canal principal de conversas e atualizações.'
      },
      'dev-lounge': {
        name: 'dev-lounge',
        topic: 'Discussão técnica — JS, CSS, APIs, WebRTC.'
      },
      'showcase': {
        name: 'showcase',
        topic: 'Mostre seus projetos e demos.'
      }
    }
  },

  'gaming-hub': {
    name: 'Gaming Arena',
    channels: {
      'chat-geral': {
        name: 'chat-geral',
        topic: 'Marcar partidas, duos e torneios.'
      }
    }
  },

  'design-lab': {
    name: 'Design Studio',
    channels: {
      'feedback-ui': {
        name: 'feedback-ui',
        topic: 'Feedbacks de design e critique de UI.'
      }
    }
  }
};

export const PRESET_USERS = {
  otavio: {
    id: 'c1000000-0000-0000-0000-000000000001',
    name: 'Otávio Henrique',
    handle: '@otavio',
    email: 'otavio@talky.dev',
    avatar_url:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    role: 'Lead Developer',
    status: 'Mic ativo 🎙️'
  },

  sofia: {
    id: 'c1000000-0000-0000-0000-000000000003',
    name: 'Sofia Tech',
    handle: '@sofia',
    email: 'sofia@talky.dev',
    avatar_url:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    role: 'Product Designer',
    status: '🎨 Redesenhando a UI'
  },

  gabriel: {
    id: 'c1000000-0000-0000-0000-000000000002',
    name: 'Gabriel Gamer',
    handle: '@gabriel',
    email: 'gabriel@talky.dev',
    avatar_url:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    role: 'Streamer & VIP',
    status: '🎮 Ao vivo no Valorant'
  }
};

// ==========================================================================
// WebRTC
// ==========================================================================

export const RTC_CONFIG = {
  iceServers: [
    // STUN
    {
      urls: 'stun:stun.l.google.com:19302'
    },
    {
      urls: 'stun:stun1.l.google.com:19302'
    },
    {
      urls: 'stun:stun2.l.google.com:19302'
    },

    // TURN
    //
    // IMPORTANTE:
    // Gere novas credenciais no Metered e coloque aqui.
    //
    // Você também pode usar:
    // import.meta.env.VITE_TURN_USERNAME
    // import.meta.env.VITE_TURN_CREDENTIAL

    {
      urls: 'turn:a.relay.metered.ca:80',
      username: 'SEU_USERNAME_TURN',
      credential: 'SUA_CREDENTIAL_TURN'
    },

    {
      urls: 'turn:a.relay.metered.ca:80?transport=tcp',
      username: 'SEU_USERNAME_TURN',
      credential: 'SUA_CREDENTIAL_TURN'
    },

    {
      urls: 'turn:a.relay.metered.ca:443',
      username: 'SEU_USERNAME_TURN',
      credential: 'SUA_CREDENTIAL_TURN'
    },

    {
      urls: 'turns:a.relay.metered.ca:443?transport=tcp',
      username: 'SEU_USERNAME_TURN',
      credential: 'SUA_CREDENTIAL_TURN'
    }
  ],

  // Mais candidatos ICE disponíveis antecipadamente.
  iceCandidatePoolSize: 10
};