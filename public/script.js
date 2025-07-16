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
    const isIOS = () => {
        const userAgent = navigator.userAgent;
        
        // Primeiro, verifica se é Android (para evitar falsos positivos)
        if (/Android/.test(userAgent)) {
            return false;
        }
        
        // Check for common iOS device user agents
        if (/iPad|iPhone|iPod/.test(userAgent)) {
            return true;
        }

        // Modern iPads on iPadOS (which report as 'MacIntel' with touch support)
        // This is a more reliable way to detect iPads running iPadOS.
        if (userAgent.includes('Mac') && navigator.maxTouchPoints > 1) {
            return true;
        }

        // Verificação mais específica para iOS Safari (evitando Android)
        // iOS Safari sempre inclui "Version/" no user agent, Android Chrome não
        if (userAgent.includes('Safari') && 
            userAgent.includes('Mobile') && 
            userAgent.includes('Version/') && 
            !userAgent.includes('Chrome')) {
            return true;
        }

        return false;
    };

    // Detecta se está em qualquer navegador no iOS (não apenas Safari)
    const isIOSBrowser = () => {
        return isIOS() && !window.navigator.standalone && !window.matchMedia('(display-mode: standalone)').matches;
    };

    // Gera ou recupera ID único do usuário
    let userId = getUserId();

    // Captura channelId da URL (novo formato seguro)
    let channelId = getChannelIdFromURL();
    
    // Captura adminId da URL (formato antigo - para compatibilidade)
    let adminId = getAdminIdFromURL();

    // Inicialização
    initializeApp();

    // Verifica se deve redirecionar para instruções do iOS
    // Adiciona um pequeno delay para garantir que tudo esteja carregado
    setTimeout(() => {
        checkIOSRedirect();
    }, 100);

    // Inicializa funcionalidades específicas da página
    initializePageSpecificFeatures();

    // Verifica status da inscrição e configura interface
    checkSubscriptionStatus();

    // Adiciona event listener apenas se o botão existir
    if (subscribeBtn) {
        subscribeBtn.addEventListener('click', handleSubscriptionAction);
    }

    /**
     * Inicializa funcionalidades específicas da página
     */
    function initializePageSpecificFeatures() {
        // Funcionalidades específicas para a página de instruções do iOS
        if (window.location.pathname.includes('ios-instructions')) {
            initializeIOSInstructionsPage();
        }
    }

    /**
     * Inicializa a página de instruções do iOS
     */
    function initializeIOSInstructionsPage() {
        const activateBtn = document.getElementById('activate-notifications-btn');
        const instructionsDiv = document.querySelector('.bg-white.p-8.rounded-2xl.shadow-sm.border.border-slate-200.max-w-md.mx-auto');
        const feedbackDiv = document.getElementById('notification-feedback');
        const feedbackIcon = document.getElementById('feedback-icon');
        const feedbackTitle = document.getElementById('feedback-title');
        const feedbackMessage = document.getElementById('feedback-message');
        const pwaStatus = document.getElementById('pwa-status');
        const pwaStatusText = document.getElementById('pwa-status-text');

        // Verifica o status do PWA
        checkPWAStatus();

        function checkPWAStatus() {
            const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

            if (isStandalone) {
                // App foi adicionado à tela inicial
                if (pwaStatus) {
                    pwaStatus.className = 'mt-6 p-4 bg-green-50 border border-green-200 rounded-lg';
                }
                if (pwaStatusText) {
                    pwaStatusText.textContent = '✅ Perfeito! O app foi adicionado à tela inicial. Agora você pode ativar as notificações.';
                }
                if (activateBtn) {
                    activateBtn.disabled = false;
                    activateBtn.className = 'block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-full text-center transition-colors';
                }
            } else {
                // App ainda não foi adicionado
                if (pwaStatus) {
                    pwaStatus.className = 'mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg';
                    pwaStatus.querySelector('svg').className = 'w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5';
                    pwaStatus.querySelector('svg path').setAttribute('d', 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z');
                }
                if (pwaStatusText) {
                    pwaStatusText.textContent = '⚠️ Você ainda está no navegador. Siga as instruções acima para adicionar à tela inicial primeiro.';
                }
                if (activateBtn) {
                    activateBtn.disabled = true;
                    activateBtn.className = 'block w-full bg-gray-400 text-white font-medium py-3 px-6 rounded-full text-center cursor-not-allowed';
                    activateBtn.textContent = 'Adicione à tela inicial primeiro';
                }
            }
        }

        if (activateBtn) {
            activateBtn.addEventListener('click', async () => {
                // Verifica novamente se está em modo standalone
                if (!window.navigator.standalone && !window.matchMedia('(display-mode: standalone)').matches) {
                    showIOSFeedback('warning', 'Atenção!', 'Certifique-se de que abriu este app pelo ícone da tela inicial, não pelo navegador.');
                    return;
                }

                activateBtn.disabled = true;
                activateBtn.textContent = 'Ativando...';

                try {
                    // Verifica se as notificações são suportadas
                    if (!('Notification' in window)) {
                        showIOSFeedback('error', 'Não Suportado', 'Seu dispositivo não suporta notificações.');
                        return;
                    }

                    // Solicita permissão para notificações
                    const permission = await Notification.requestPermission();

                    if (permission === 'granted') {
                        // Cria subscrição push e registra no servidor
                        await subscribeToPushNotifications();
                        showIOSFeedback('success', 'Perfeito!', 'Notificações ativadas com sucesso! Você receberá todas as novidades.');

                        // Envia notificação de boas-vindas
                        setTimeout(async () => {
                            await sendWelcomeNotification('Bem-vindo!', 'Suas notificações estão ativas. Você receberá todas as promoções!');
                        }, 1000);

                    } else if (permission === 'denied') {
                        showIOSFeedback('error', 'Permissão Negada', 'Você negou as notificações. Para ativar, vá em Configurações > Notificações e encontre este app.');
                    } else {
                        showIOSFeedback('warning', 'Permissão Pendente', 'A permissão não foi concedida. Tente novamente.');
                    }
                } catch (error) {
                    console.error('Erro ao ativar notificações no iOS:', error);
                    showIOSFeedback('error', 'Erro', 'Ocorreu um erro ao ativar as notificações. Tente novamente.');
                } finally {
                    activateBtn.disabled = false;
                    activateBtn.textContent = 'Já adicionei à tela inicial';
                }
            });
        }

        /**
         * Mostra feedback na página de instruções do iOS
         */
        function showIOSFeedback(type, title, message) {
            if (!feedbackDiv || !feedbackIcon || !feedbackTitle || !feedbackMessage) {
                return;
            }

            // Esconde as instruções
            if (instructionsDiv) {
                instructionsDiv.classList.add('hidden');
            }

            // Mostra o feedback
            feedbackDiv.classList.remove('hidden');
            feedbackTitle.textContent = title;
            feedbackMessage.textContent = message;

            // Define o ícone baseado no tipo
            if (type === 'success') {
                feedbackIcon.className = 'w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 bg-green-100';
                feedbackIcon.innerHTML = `<svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
            } else if (type === 'warning') {
                feedbackIcon.className = 'w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 bg-amber-100';
                feedbackIcon.innerHTML = `<svg class="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>`;
            } else {
                feedbackIcon.className = 'w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 bg-red-100';
                feedbackIcon.innerHTML = `<svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
            }
        }
    }

    /**
     * Verifica se deve mostrar instruções do iOS
     */
    function checkIOSRedirect() {
        // Só funciona se estiver na página subscribe.html
        if (!window.location.pathname.includes('subscribe')) {
            return;
        }

        // Verificações individuais para debug
        const iosDetected = isIOS();
        const isStandalone = window.navigator.standalone;
        const isDisplayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const shouldShowInstructions = iosDetected && !isStandalone && !isDisplayModeStandalone;

        // Verifica se é iOS e está em qualquer navegador (não em modo standalone/PWA)
        if (shouldShowInstructions) {
            showIOSInstructionsInline();
        }
    }

    /**
     * Mostra as instruções do iOS diretamente na página subscribe.html
     */
    function showIOSInstructionsInline() {
        const initialState = document.getElementById('initial-state');
        const finalState = document.getElementById('final-state');

        if (!initialState || !finalState) return;

        // Esconde o estado inicial
        initialState.classList.add('hidden');

        // Mostra as instruções do iOS no lugar do estado final
        finalState.classList.remove('hidden');
        finalState.innerHTML = `
            <div class="text-center mb-6">
                <div class="w-20 h-20 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-4">
                    <svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                    </svg>
                </div>
                <h1 class="text-2xl font-medium text-slate-800 mb-2">Como ativar notificações no iPhone/iPad</h1>
                <p class="text-slate-600">Siga estes passos para receber nossas notificações:</p>
            </div>

            <div class="space-y-4 text-left">
                <div class="flex items-start space-x-3">
                    <div class="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">1</div>
                    <div>
                        <h3 class="font-medium text-slate-800">Adicione à Tela Inicial</h3>
                        <p class="text-slate-600 text-sm">Toque no botão "Compartilhar" (□↗) no seu navegador e selecione "Adicionar à Tela de Início"</p>
                    </div>
                </div>

                <div class="flex items-start space-x-3">
                    <div class="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">2</div>
                    <div>
                        <h3 class="font-medium text-slate-800">Abra pelo Ícone</h3>
                        <p class="text-slate-600 text-sm">Feche o navegador e abra o app pelo ícone que apareceu na tela inicial</p>
                    </div>
                </div>

                <div class="flex items-start space-x-3">
                    <div class="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">3</div>
                    <div>
                        <h3 class="font-medium text-slate-800">Ative as Notificações</h3>
                        <p class="text-slate-600 text-sm">Toque em "Ativar Notificações" e permita quando solicitado</p>
                    </div>
                </div>
            </div>
        `;

        // Adiciona funcionalidade ao botão de ativar notificações
        const activateBtn = document.getElementById('activate-notifications-btn-inline');
        const statusDiv = document.getElementById('pwa-status-inline');
        const statusText = document.getElementById('pwa-status-text-inline');

        // Verifica periodicamente se o usuário adicionou à tela inicial
        const checkInterval = setInterval(() => {
            const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
            
            if (isStandalone) {
                // App foi adicionado à tela inicial
                clearInterval(checkInterval);
                
                if (statusDiv) {
                    statusDiv.className = 'mt-6 p-4 bg-green-50 border border-green-200 rounded-lg';
                }
                if (statusText) {
                    statusText.textContent = '✅ Perfeito! O app foi adicionado à tela inicial. Agora você pode ativar as notificações.';
                }
                if (activateBtn) {
                    activateBtn.disabled = false;
                    activateBtn.className = 'block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-full text-center transition-colors';
                    activateBtn.textContent = 'Ativar Notificações';
                    
                    activateBtn.addEventListener('click', async () => {
                        activateBtn.disabled = true;
                        activateBtn.textContent = 'Ativando...';

                        try {
                            const permission = await Notification.requestPermission();
                            
                            if (permission === 'granted') {
                                await subscribeToPushNotifications();
                                showFinalState('success', 'Perfeito!', 'Notificações ativadas com sucesso! Você receberá todas as novidades.');
                                
                                setTimeout(async () => {
                                    await sendWelcomeNotification('Bem-vindo!', 'Suas notificações estão ativas. Você receberá todas as promoções!');
                                }, 1000);
                                
                            } else if (permission === 'denied') {
                                showFinalState('error', 'Permissão Negada', 'Você negou as notificações. Para ativar, vá em Configurações > Notificações e encontre este app.');
                            } else {
                                showFinalState('warning', 'Permissão Pendente', 'A permissão não foi concedida. Tente novamente.');
                            }
                        } catch (error) {
                            console.error('Erro ao ativar notificações no iOS:', error);
                            showFinalState('error', 'Erro', 'Ocorreu um erro ao ativar as notificações. Tente novamente.');
                        } finally {
                            activateBtn.disabled = false;
                            activateBtn.textContent = 'Ativar Notificações';
                        }
                    });
                }
            }
        }, 1000); // Verifica a cada segundo

        // Para de verificar após 5 minutos para não consumir recursos desnecessariamente
        setTimeout(() => {
            clearInterval(checkInterval);
        }, 300000);
    }

    /**
     * Verifica o status atual da inscrição do usuário
     */
    async function checkSubscriptionStatus() {
        try {
            // Verifica se o usuário já está inscrito localmente
            const isRegistered = localStorage.getItem('pulso_subscription_registered') === 'true';
            const registrationDate = localStorage.getItem('pulso_registration_date');
            
            if (isRegistered && registrationDate) {
                // Verifica se ainda tem permissão de notificação
                const hasPermission = Notification.permission === 'granted';
                
                if (hasPermission) {
                    // Verifica se ainda tem subscrição ativa
                    const hasActiveSubscription = await checkActiveSubscription();
                    
                    if (hasActiveSubscription) {
                        showSubscribedState();
                        return;
                    }
                }
            }
            
            // Se chegou até aqui, não está inscrito ou perdeu a inscrição
            showUnsubscribedState();
            
        } catch (error) {
            console.error('Erro ao verificar status da inscrição:', error);
            showUnsubscribedState();
        }
    }

    /**
     * Verifica se existe uma subscrição ativa no service worker
     */
    async function checkActiveSubscription() {
        try {
            if (!('serviceWorker' in navigator)) {
                return false;
            }
            
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            
            return subscription !== null;
        } catch (error) {
            console.error('Erro ao verificar subscrição ativa:', error);
            return false;
        }
    }

    /**
     * Mostra interface para usuário já inscrito
     */
    function showSubscribedState() {
        if (!subscribeBtn) return;
        
        const registrationDate = localStorage.getItem('pulso_registration_date');
        const formattedDate = registrationDate ? new Date(registrationDate).toLocaleDateString('pt-BR') : '';
        
        // Atualiza o texto do botão principal
        subscribeBtn.textContent = 'Cancelar Notificações';
        subscribeBtn.className = 'w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-full text-lg shadow-sm hover:shadow-md transition-all';
        
        // Atualiza o texto da página
        const titleElement = document.querySelector('h1');
        const descriptionElement = document.querySelector('p.text-slate-600');
        const footerElement = document.querySelector('p.text-slate-500');
        
        if (titleElement) {
            titleElement.textContent = 'Notificações Ativas!';
            titleElement.className = 'text-3xl font-medium text-green-700 fade-in-up';
        }
        
        if (descriptionElement) {
            descriptionElement.innerHTML = `
                ✅ Você está recebendo nossas notificações desde <strong>${formattedDate}</strong>.<br>
                Clique abaixo se desejar cancelar sua inscrição.
            `;
        }
        
        if (footerElement) {
            footerElement.textContent = 'Você pode reativar as notificações a qualquer momento.';
        }
        
        // Adiciona indicador visual de status ativo
        const header = document.querySelector('header');
        if (header && !header.querySelector('.status-indicator')) {
            const logoContainer = header.querySelector('div');
            if (logoContainer) {
                const statusIndicator = document.createElement('div');
                statusIndicator.className = 'status-indicator absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg';
                statusIndicator.innerHTML = '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
                
                logoContainer.appendChild(statusIndicator);
            }
        }
        
        // Adiciona classe visual ao card
        const card = document.getElementById('initial-state');
        if (card) {
            card.className = 'bg-white p-8 rounded-2xl shadow-sm border-2 border-green-200 bg-gradient-to-br from-green-50 to-white';
        }
    }

    /**
     * Mostra interface para usuário não inscrito
     */
    function showUnsubscribedState() {
        if (!subscribeBtn) return;
        
        // Restaura o estado original
        subscribeBtn.textContent = 'Ativar Notificações';
        subscribeBtn.className = 'w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-full text-lg shadow-sm hover:shadow-md transition-all';
        
        // Restaura textos originais
        const titleElement = document.querySelector('h1');
        const descriptionElement = document.querySelector('p.text-slate-600');
        const footerElement = document.querySelector('p.text-slate-500');
        
        if (titleElement) {
            titleElement.textContent = 'Fique por dentro de tudo!';
            titleElement.className = 'text-3xl font-medium text-slate-800 fade-in-up';
        }
        
        if (descriptionElement) {
            descriptionElement.innerHTML = 'Clique abaixo para ativar as notificações e não perca nenhuma promoção, novidade ou evento exclusivo.';
        }
        
        if (footerElement) {
            footerElement.textContent = 'Você pode cancelar a qualquer momento.';
        }
        
        // Remove indicador de status se existir
        const statusIndicator = document.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.remove();
        }
        
        // Restaura classe original do card
        const card = document.getElementById('initial-state');
        if (card) {
            card.className = 'bg-white p-8 rounded-2xl shadow-sm border border-slate-200';
        }
    }

    /**
     * Gerencia ação do botão principal (inscrever ou cancelar)
     */
    async function handleSubscriptionAction() {
        const isSubscribed = localStorage.getItem('pulso_subscription_registered') === 'true';
        
        if (isSubscribed && Notification.permission === 'granted') {
            await unsubscribeFromNotifications();
        } else {
            await requestNotificationPermission();
        }
    }

    /**
     * Cancela a inscrição de notificações
     */
    async function unsubscribeFromNotifications() {
        subscribeBtn.disabled = true;
        subscribeBtn.textContent = 'Cancelando...';
        
        try {
            // 1. Remove subscrição do service worker
            await removeServiceWorkerSubscription();
            
            // 2. Atualiza status no servidor
            await updateServerSubscriptionStatus(false);
            
            // 3. Limpa dados locais
            clearLocalSubscriptionData();
            
            // 4. Mostra feedback de sucesso
            showFinalState('success', 'Inscrição Cancelada', 'Você não receberá mais notificações. Pode reativar a qualquer momento.');
            
            // 5. Atualiza interface após um delay
            setTimeout(() => {
                resetToInitialState();
                showUnsubscribedState();
            }, 3000);
            
        } catch (error) {
            console.error('Erro ao cancelar inscrição:', error);
            showFinalState('error', 'Erro ao Cancelar', 'Ocorreu um erro ao cancelar sua inscrição. Tente novamente.');
            
            // Restaura botão em caso de erro
            setTimeout(() => {
                subscribeBtn.disabled = false;
                subscribeBtn.textContent = 'Cancelar Notificações';
            }, 2000);
        }
    }

    /**
     * Remove subscrição do service worker
     */
    async function removeServiceWorkerSubscription() {
        try {
            if (!('serviceWorker' in navigator)) {
                return;
            }
            
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            
            if (subscription) {
                const success = await subscription.unsubscribe();
                return success;
            }
            
            return true;
        } catch (error) {
            console.error('Erro ao remover subscrição do service worker:', error);
            throw error;
        }
    }

    /**
     * Atualiza status da inscrição no servidor
     */
    async function updateServerSubscriptionStatus(active) {
        try {
            const response = await fetch(`${SERVER_URL}/api/subscription/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    adminId: adminId,
                    channelId: channelId,
                    active: active,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`Erro do servidor: ${response.status}`);
            }

            const result = await response.json();
            return result;
            
        } catch (error) {
            console.error('Erro ao atualizar status no servidor:', error);
            // Não propaga o erro para não bloquear o processo local
        }
    }

    /**
     * Limpa dados locais da inscrição
     */
    function clearLocalSubscriptionData() {
        localStorage.removeItem('pulso_subscription_registered');
        localStorage.removeItem('pulso_registration_date');
    }

    /**
     * Reseta interface para estado inicial
     */
    function resetToInitialState() {
        if (initialStateDiv && finalStateDiv) {
            finalStateDiv.classList.add('hidden');
            initialStateDiv.classList.remove('hidden');
        }
        
        if (subscribeBtn) {
            subscribeBtn.disabled = false;
        }
    }

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
        } else {
        }
        return id;
    }

    /**
     * Captura channelId da URL (formato seguro: ?channel=XXXXX)
     */
    function getChannelIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const channelId = urlParams.get('channel');
        
        if (channelId) {
            // Salva o channelId no localStorage para futuras referências
            localStorage.setItem('pulso_channel_id', channelId);
        } else {
            // Verifica se já existe um channelId salvo
            const savedChannelId = localStorage.getItem('pulso_channel_id');
            if (savedChannelId) {
                return savedChannelId;
            }
        }
        
        return channelId;
    }

    /**
     * Captura ID do administrador da URL (formato antigo: ?admin=XXXXX)
     * Mantido para compatibilidade com links antigos
     */
    function getAdminIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const adminId = urlParams.get('admin');
        
        if (adminId) {
            // Salva o ID do admin no localStorage para futuras referências
            localStorage.setItem('pulso_admin_id', adminId);
        } else {
            // Verifica se já existe um admin ID salvo
            const savedAdminId = localStorage.getItem('pulso_admin_id');
            if (savedAdminId) {
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
            
            
            // Aguarda o service worker estar pronto
            await navigator.serviceWorker.ready;

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

            // Para iOS em navegador, as instruções já foram mostradas automaticamente
            // Se chegou até aqui, é porque já está em modo standalone ou não é iOS

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
            if (isIOS()) {
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
            } else {
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
            
            const userInfo = {
                userId: userId,
                adminId: adminId, // Formato antigo - para compatibilidade
                channelId: channelId, // Novo formato seguro
                subscription: subscription,
                active: true, // Marca como ativo ao se inscrever
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                // Informações adicionais que podem ser úteis
                language: navigator.language,
                platform: navigator.platform,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };


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
            
            // Se foi cancelamento de inscrição, adiciona botão para reativar
            if (title === 'Inscrição Cancelada') {
                const reactivateBtn = document.createElement('button');
                reactivateBtn.className = 'mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-full text-sm transition-all';
                reactivateBtn.textContent = 'Reativar Notificações';
                reactivateBtn.onclick = async () => {
                    reactivateBtn.disabled = true;
                    reactivateBtn.textContent = 'Reativando...';
                    
                    try {
                        await requestNotificationPermission();
                    } catch (error) {
                        console.error('Erro ao reativar:', error);
                        reactivateBtn.disabled = false;
                        reactivateBtn.textContent = 'Reativar Notificações';
                    }
                };
                
                finalStateDiv.appendChild(reactivateBtn);
            }
            
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
        // Adiciona classe para indicar que está em modo PWA
        document.body.classList.add('pwa-mode');
    }

    // Escuta mudanças no status do service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
        });
    }
});