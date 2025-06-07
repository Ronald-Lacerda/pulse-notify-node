/**
 * Configurações da aplicação
 */

module.exports = {
    // URL do servidor (ajuste conforme necessário)
    SERVER_URL: window.location.origin;

    // Configurações de notificação
    notification: {
        icon: 'https://placehold.co/192x192/1e293b/ffffff?text=P',
        badge: 'https://placehold.co/72x72/1e293b/ffffff?text=P',
        defaultTag: 'pulso-notification',
        requireInteraction: false
    },

    // Configurações de usuário
    user: {
        // Prefixo para IDs de usuário
        idPrefix: 'user_',

        // Campos adicionais para coletar
        collectFields: [
            'userAgent',
            'language',
            'platform',
            'timezone',
            'url'
        ]
    },
    
    // Configurações de segmentação
    segments: {
        ios: (userData) => userData.platform && userData.platform.includes('iPhone'),
        android: (userData) => userData.platform && userData.platform.includes('Android'),
        recent: (userData) => {
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return new Date(userData.registeredAt) > dayAgo;
        },
        portuguese: (userData) => userData.language && userData.language.startsWith('pt')
    }
};