// Service Worker para notificações push
// Versão do cache para controle de atualizações
const CACHE_NAME = 'pulso-notifications-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Instalação concluída');
        // Força a ativação imediata do novo service worker
        return self.skipWaiting();
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Ativando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Ativação concluída');
      // Toma controle de todas as páginas imediatamente
      return self.clients.claim();
    })
  );
});

// Interceptação de requisições (estratégia cache-first)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retorna do cache se encontrado, senão busca na rede
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Manipulação de notificações push
self.addEventListener('push', (event) => {
  console.log('Service Worker: Notificação push recebida');
  
  let notificationData = {
    title: 'Nova Notificação',
    body: 'Você tem uma nova mensagem!',
    icon: 'https://placehold.co/192x192/1e293b/ffffff?text=P',
    badge: 'https://placehold.co/72x72/1e293b/ffffff?text=P',
    tag: 'pulso-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Abrir',
        icon: 'https://placehold.co/32x32/1e293b/ffffff?text=→'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: 'https://placehold.co/32x32/1e293b/ffffff?text=✕'
      }
    ]
  };

  // Se houver dados na notificação push, usa eles
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (error) {
      console.log('Service Worker: Erro ao parsear dados push:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      actions: notificationData.actions,
      data: {
        url: notificationData.url || '/',
        timestamp: Date.now()
      }
    })
  );
});

// Manipulação de cliques em notificações
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Clique na notificação:', event.notification.tag);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // URL para abrir (padrão ou da notificação)
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Verifica se já existe uma janela aberta com a URL
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Se não encontrou, abre uma nova janela
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Manipulação de fechamento de notificações
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notificação fechada:', event.notification.tag);
  
  // Aqui você pode enviar analytics ou fazer outras ações
  // quando o usuário fechar a notificação sem clicar
});

// Sincronização em background (para quando voltar online)
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Evento de sincronização:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Aqui você pode sincronizar dados quando voltar online
      console.log('Service Worker: Executando sincronização em background')
    );
  }
});

// Manipulação de mensagens do cliente
self.addEventListener('message', (event) => {
  console.log('Service Worker: Mensagem recebida:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Responde de volta para o cliente
  event.ports[0].postMessage({
    type: 'SW_RESPONSE',
    message: 'Service Worker ativo e funcionando!'
  });
});