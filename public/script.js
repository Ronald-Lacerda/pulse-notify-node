document.addEventListener('DOMContentLoaded', () => {
    const subscribeBtn = document.getElementById('subscribe-btn');
    const initialStateDiv = document.getElementById('initial-state');
    const finalStateDiv = document.getElementById('final-state');
    const finalStateIcon = document.getElementById('final-state-icon');
    const finalStateTitle = document.getElementById('final-state-title');
    const finalStateMessage = document.getElementById('final-state-message');
    const serviceWorkerPath = '/sw.js';

    // Configuração do servidor (ajuste conforme necessário)
    const SERVER_URL = window.location.origin;
    let VAPID_PUBLIC_KEY = null; // Será carregada do servidor

    // Detecta se é um dispositivo iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    // Detecta se está no Safari
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    // Gera ou recupera ID único do usuário
    let userId = getUserId();
    
    // Captura ID do administrador da URL
    let adminId = getAdminIdFromURL();

    // Inicialização
    initializeApp();

    subscribeBtn.addEventListener('click', requestNotificationPermission);

    /**
     * Inicializa a aplicação
     */
    async function initializeApp() {
        try {
            // Carrega chave VAPID do servidor
            await loadVapidKey();
            
            // Registra service worker
            await registerServiceWorker();
            
        } catch (error) {
            console.error('Erro na inicialização:', error);
            showFinalState('error', 'Erro de Inicialização', 'Não foi possível inicializar o sistema de notificações.');
        }
    }

    /**
     * Carrega chave VAPID do servidor
     */
    async function loadVapidKey() {
        try {
            const response = await fetch(`${SERVER_URL}/api/vapid-public-key`);
            if (!response.ok) {
                throw new Error('Erro ao carregar chave VAPID');
            }
            const data = await response.json();
            VAPID_PUBLIC_KEY = data.publicKey;
            console.log('Chave VAPID carregada com sucesso');
        } catch (error) {
            console.error('Erro ao carregar chave VAPID:', error);
            throw error;
        }
    }

    /**
     * Gera ou recupera um ID único para o usuário
     */
    function getUserId() {
        let id = localStorage.getItem('pulso_user_id');
        if (!id) {
            // Gera um ID único baseado em timestamp + random
            id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('pulso_user_id', id);
            console.log('Novo usuário criado:', id);
        } else {
            console.log('Usuário existente:', id);
        }
        return id;
    }

    /**
     * Captura ID do administrador da URL
     */
    function getAdminIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const adminId = urlParams.get('admin');
        
        if (adminId) {
            console.log('ID do administrador capturado:', adminId);
            // Salva o ID do admin no localStorage para futuras referências
            localStorage.setItem('pulso_admin_id', adminId);
        } else {
            // Verifica se já existe um admin ID salvo
            const savedAdminId = localStorage.getItem('pulso_admin_id');
            if (savedAdminId) {
                console.log('ID do administrador recuperado:', savedAdminId);
                return savedAdminId;
            }
        }
        
        return adminId;
    }

    /**
     * Converte chave VAPID para Uint8Array
     */
    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    /**
     * Regista o Service Worker. Este é o primeiro passo e o mais importante.
     */
    async function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            showFinalState('error', 'Navegador Incompatível', 'Seu navegador não suporta a tecnologia necessária para notificações (Service Worker).');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.register(serviceWorkerPath, {
                scope: '/'
            });
            
            console.log('Service Worker registado com sucesso:', registration);
            
            // Aguarda o service worker estar pronto
            await navigator.serviceWorker.ready;
            console.log('Service Worker está pronto');
            
        } catch (error) {
            console.error('Falha ao registar o Service Worker:', error);
            showFinalState('error', 'Erro de Instalação', 'Não foi possível iniciar o serviço de notificações.');
        }
    }

    /**
     * Solicita permissão ao usuário para enviar notificações.
     */
    async function requestNotificationPermission() {
        subscribeBtn.disabled = true;
        subscribeBtn.textContent = 'Aguardando...';

        try {
            // Verifica se as notificações são suportadas
            if (!('Notification' in window)) {
                throw new Error('Notificações não suportadas neste navegador');
            }

            // Para iOS, mostra instruções específicas antes de pedir permissão
            if (isIOS && isSafari) {
                showIOSInstructions();
                return;
            }

            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                // Cria subscrição push e registra no servidor
                await subscribeToPushNotifications();
                showFinalState('success', 'Tudo Certo!', 'Você receberá todas as novidades em primeira mão.');
                await sendWelcomeNotification('Inscrição Concluída!', 'Obrigado por se inscrever. Você está pronto para receber nossas promoções!');
            } else if (permission === 'denied') {
                showFinalState('error', 'Permissão Negada', 'Para receber novidades, você precisa permitir as notificações nas configurações do seu navegador.');
            } else {
                showFinalState('error', 'Permissão Pendente', 'Você pode ativar as notificações a qualquer momento nas configurações do navegador.');
            }
        } catch (error) {
            console.error('Erro ao pedir permissão:', error);
            
            if (isIOS) {
                showFinalState('error', 'iOS Detectado', 'No iPhone/iPad, adicione este site à tela inicial primeiro, depois abra pelo ícone para ativar notificações.');
            } else {
                showFinalState('error', 'Ocorreu um Erro', 'Não foi possível processar sua solicitação. Verifique se seu navegador suporta notificações.');
            }
        } finally {
            subscribeBtn.disabled = false;
            subscribeBtn.textContent = 'Ativar Notificações';
        }
    }

    /**
     * Cria subscrição push e registra no servidor
     */
    async function subscribeToPushNotifications() {
        try {
            if (!VAPID_PUBLIC_KEY) {
                throw new Error('Chave VAPID não carregada');
            }

            const registration = await navigator.serviceWorker.ready;
            
            // Verifica se já existe uma subscrição
            let subscription = await registration.pushManager.getSubscription();
            
            if (!subscription) {
                // Cria nova subscrição
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                });
                console.log('Nova subscrição criada:', subscription);
            } else {
                console.log('Subscrição existente encontrada:', subscription);
            }

            // Registra a subscrição no servidor
            await registerSubscriptionOnServer(subscription);
            
        } catch (error) {
            console.error('Erro ao criar subscrição push:', error);
            throw error;
        }
    }

    /**
     * Registra a subscrição no servidor com informações do usuário
     */
    async function registerSubscriptionOnServer(subscription) {
        try {
            // Debug: verificar valores antes de enviar
            console.log('=== DEBUG SUBSCRIPTION ===');
            console.log('userId:', userId);
            console.log('adminId:', adminId);
            console.log('URL atual:', window.location.href);
            console.log('URL params:', window.location.search);
            
            const userInfo = {
                userId: userId,
                adminId: adminId, // Inclui o ID do administrador
                subscription: subscription,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                // Informações adicionais que podem ser úteis
                language: navigator.language,
                platform: navigator.platform,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };

            console.log('Dados sendo enviados:', userInfo);
            console.log('=========================');

            const response = await fetch(`${SERVER_URL}/api/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userInfo)
            });

            if (!response.ok) {
                throw new Error(`Erro do servidor: ${response.status}`);
            }

            const result = await response.json();
            console.log('Usuário registrado no servidor:', result);
            
            // Salva informações localmente
            localStorage.setItem('pulso_subscription_registered', 'true');
            localStorage.setItem('pulso_registration_date', new Date().toISOString());
            
        } catch (error) {
            console.error('Erro ao registrar no servidor:', error);
            // Mesmo com erro no servidor, continua o processo local
            // O usuário ainda pode receber notificações locais
        }
    }

    /**
     * Mostra instruções específicas para iOS
     */
    function showIOSInstructions() {
        showFinalState('info', 'Instruções para iPhone/iPad', 
            'Para receber notificações no iOS:\n\n' +
            '1. Toque no botão "Compartilhar" (□↗) no Safari\n' +
            '2. Selecione "Adicionar à Tela de Início"\n' +
            '3. Abra o app pela tela inicial\n' +
            '4. Toque em "Ativar Notificações" novamente'
        );
        
        // Adiciona botão para tentar novamente
        setTimeout(() => {
            const retryBtn = document.createElement('button');
            retryBtn.textContent = 'Já adicionei à tela inicial';
            retryBtn.className = 'w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-full text-lg shadow-sm hover:shadow-md transition-all mt-4';
            retryBtn.onclick = () => {
                finalStateDiv.classList.add('hidden');
                initialStateDiv.classList.remove('hidden');
            };
            finalStateDiv.appendChild(retryBtn);
        }, 100);
    }

    /**
     * Envia uma notificação de boas-vindas usando o Service Worker.
     */
    async function sendWelcomeNotification(title, body) {
        if (Notification.permission === 'granted') {
            try {
                // Aguarda o Service Worker estar pronto
                const registration = await navigator.serviceWorker.ready;
                
                // Usa o Service Worker para mostrar a notificação
                await registration.showNotification(title, {
                    body: body,
                    icon: 'https://placehold.co/192x192/1e293b/ffffff?text=P&font=roboto',
                    badge: 'https://placehold.co/72x72/1e293b/ffffff?text=P',
                    tag: 'welcome-notification',
                    requireInteraction: false,
                    silent: false,
                    data: {
                        url: '/',
                        timestamp: Date.now()
                    }
                });
                
                console.log('Notificação de boas-vindas enviada');
            } catch (error) {
                console.error('Erro ao mostrar notificação via SW:', error);
                
                // Fallback: tenta notificação direta se o SW falhar
                try {
                    new Notification(title, {
                        body: body,
                        icon: 'https://placehold.co/192x192/1e293b/ffffff?text=P&font=roboto'
                    });
                } catch (fallbackError) {
                    console.error('Erro no fallback de notificação:', fallbackError);
                }
            }
        }
    }

    /**
     * Atualiza a UI para mostrar uma mensagem final de sucesso ou erro.
     */
    function showFinalState(type, title, message) {
        initialStateDiv.classList.add('hidden');
        finalStateDiv.classList.remove('hidden');
        finalStateDiv.classList.add('fade-in-up');
        finalStateTitle.textContent = title;
        finalStateMessage.textContent = message;

        // Limpa conteúdo anterior
        finalStateDiv.querySelectorAll('button').forEach(btn => btn.remove());

        if (type === 'success') {
            finalStateIcon.className = 'w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 bg-green-100';
            finalStateIcon.innerHTML = `<svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
        } else if (type === 'info') {
            finalStateIcon.className = 'w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 bg-blue-100';
            finalStateIcon.innerHTML = `<svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
        } else {
            finalStateIcon.className = 'w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 bg-red-100';
            finalStateIcon.innerHTML = `<svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
        }
    }

    // Detecta se o app foi aberto como PWA (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
        console.log('App aberto em modo standalone (PWA)');
        // Adiciona classe para indicar que está em modo PWA
        document.body.classList.add('pwa-mode');
    }

    // Escuta mudanças no status do service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('Service Worker controller mudou');
        });
    }
});