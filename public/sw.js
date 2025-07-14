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
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Tenta adicionar todos os arquivos ao cache, mas não falha se algum não existir
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(error => {
              console.warn(`Service Worker: Não foi possível cachear ${url}:`, error);
              return null;
            })
          )
        );
      })
      .then(() => {
        // Força a ativação imediata do novo service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Erro durante a instalação:', error);
        // Mesmo com erro, tenta pular para ativação
        return self.skipWaiting();
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Toma controle de todas as páginas imediatamente
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('Service Worker: Erro durante a ativação:', error);
        // Mesmo com erro, tenta tomar controle
        return self.clients.claim();
      })
  );
});

// Interceptação de requisições (estratégia cache-first)
self.addEventListener('fetch', (event) => {
  // Ignora requisições que não são GET ou que são para outros domínios
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retorna do cache se encontrado, senão busca na rede
        if (response) {
          return response;
        }
        
        
        // Tenta buscar na rede com tratamento de erro
        return fetch(event.request)
          .then((networkResponse) => {
            // Se a resposta for válida, adiciona ao cache para futuras requisições
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch((error) => {
            
            // Se for uma requisição de navegação (página HTML), retorna uma página offline
            if (event.request.destination === 'document') {
              return new Response(
                `<!DOCTYPE html>
                <html>
                <head>
                  <title>Offline</title>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <style>
                    body { 
                      font-family: Arial, sans-serif; 
                      text-align: center; 
                      padding: 50px; 
                      background: #f5f5f5; 
                    }
                    .offline-message { 
                      background: white; 
                      padding: 30px; 
                      border-radius: 10px; 
                      box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
                      max-width: 400px; 
                      margin: 0 auto; 
                    }
                    .offline-icon { 
                      font-size: 48px; 
                      margin-bottom: 20px; 
                    }
                    h1 { 
                      color: #333; 
                      margin-bottom: 10px; 
                    }
                    p { 
                      color: #666; 
                      line-height: 1.5; 
                    }
                    .retry-btn {
                      background: #007cba;
                      color: white;
                      border: none;
                      padding: 10px 20px;
                      border-radius: 5px;
                      cursor: pointer;
                      margin-top: 20px;
                    }
                    .retry-btn:hover {
                      background: #005a87;
                    }
                  </style>
                </head>
                <body>
                  <div class="offline-message">
                    <div class="offline-icon">📡</div>
                    <h1>Você está offline</h1>
                    <p>Não foi possível conectar à internet. Verifique sua conexão e tente novamente.</p>
                    <button class="retry-btn" onclick="window.location.reload()">Tentar Novamente</button>
                  </div>
                </body>
                </html>`,
                {
                  headers: {
                    'Content-Type': 'text/html; charset=utf-8'
                  }
                }
              );
            }
            
            // Para outros tipos de requisição, retorna um erro mais específico
            return new Response(
              JSON.stringify({
                error: 'Network request failed',
                message: 'Unable to fetch resource',
                offline: true,
                url: event.request.url
              }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            );
          });
      })
      .catch((error) => {
        
        // Fallback final para qualquer erro não tratado
        return new Response(
          JSON.stringify({
            error: 'Service Worker error',
            message: 'An unexpected error occurred',
            details: error.message
          }),
          {
            status: 500,
            statusText: 'Internal Server Error',
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      })
  );
});

// Manipulação de notificações push
self.addEventListener('push', (event) => {
  
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
  
  // Aqui você pode enviar analytics ou fazer outras ações
  // quando o usuário fechar a notificação sem clicar
});

// Sincronização em background (para quando voltar online)
self.addEventListener('sync', (event) => {
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Aqui você pode sincronizar dados quando voltar online
    );
  }
});

// Manipulação de mensagens do cliente
self.addEventListener('message', (event) => {
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Responde de volta para o cliente
  event.ports[0].postMessage({
    type: 'SW_RESPONSE',
    message: 'Service Worker ativo e funcionando!'
  });
});