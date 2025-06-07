// Service Worker (sw.js)

// Este evento é acionado quando o Service Worker é instalado.
self.addEventListener('install', event => {
    console.log('Service Worker instalado com sucesso!');
    // Força o novo service worker a tornar-se ativo.
    self.skipWaiting();
  });

  // Este evento é acionado quando o Service Worker se torna ativo.
  self.addEventListener('activate', event => {
    console.log('Service Worker ativado com sucesso!');
    // Garante que o service worker tome controlo da página imediatamente.
    return self.clients.claim();
  });

  // Este evento ouve por notificações "push" vindas de um servidor.
  // Para este protótipo, não estamos a usar um servidor de push, mas a estrutura está aqui.
  self.addEventListener('push', event => {
    const data = event.data.json();
    console.log('Nova notificação push recebida:', data);
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon
      })
    );
  });

  // Este evento é acionado quando o usuário clica numa notificação.
  self.addEventListener('notificationclick', event => {
    console.log('Notificação clicada!');
    event.notification.close();
    // Foca numa janela existente ou abre uma nova.
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        if (clientList.length > 0) {
          let client = clientList[0];
          for (let i = 0; i < clientList.length; i++) {
            if (clientList[i].focused) {
              client = clientList[i];
            }
          }
          return client.focus();
        }
        return clients.openWindow('/');
      })
    );
  });