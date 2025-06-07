document.addEventListener('DOMContentLoaded', () => {
    const subscribeBtn = document.getElementById('subscribe-btn');
    const initialStateDiv = document.getElementById('initial-state');
    const finalStateDiv = document.getElementById('final-state');
    const finalStateIcon = document.getElementById('final-state-icon');
    const finalStateTitle = document.getElementById('final-state-title');
    const finalStateMessage = document.getElementById('final-state-message');
    const serviceWorkerPath = 'sw.js';

    registerServiceWorker();
    subscribeBtn.addEventListener('click', requestNotificationPermission);

    /**
     * Regista o Service Worker. Este é o primeiro passo e o mais importante.
     */
    async function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            showFinalState('error', 'Navegador Incompatível', 'Seu navegador não suporta a tecnologia necessária para notificações (Service Worker).');
            return;
        }
        try {
            const registration = await navigator.serviceWorker.register(serviceWorkerPath);
            console.log('Service Worker registado com sucesso:', registration);
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
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                showFinalState('success', 'Tudo Certo!', 'Você receberá todas as novidades em primeira mão.');
                sendWelcomeNotification('Inscrição Concluída!', 'Obrigado por se inscrever. Você está pronto para receber nossas promoções!');
            } else {
                showFinalState('error', 'Permissão Negada', 'Para receber novidades, você precisa permitir as notificações nas configurações do seu navegador.');
            }
        } catch (error) {
            console.error('Erro ao pedir permissão:', error);
            showFinalState('error', 'Ocorreu um Erro', 'Não foi possível processar sua solicitação.');
        } finally {
            subscribeBtn.disabled = false;
            subscribeBtn.textContent = 'Ativar Notificações';
        }
    }

    /**
     * Envia uma notificação de boas-vindas usando o Service Worker.
     */
    async function sendWelcomeNotification(title, body) {
        if (Notification.permission === 'granted') {
            try {
                // Espera o Service Worker estar pronto
                const registration = await navigator.serviceWorker.ready;
                // Usa o Service Worker para mostrar a notificação
                await registration.showNotification(title, {
                    body: body,
                    icon: 'https://placehold.co/192x192/1e293b/ffffff?text=P&font=roboto'
                });
            } catch (error) {
                console.error('Erro ao mostrar notificação via SW:', error);
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

        if (type === 'success') {
            finalStateIcon.className = 'w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 bg-green-100';
            finalStateIcon.innerHTML = `<svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
        } else {
            finalStateIcon.className = 'w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 bg-red-100';
            finalStateIcon.innerHTML = `<svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
        }
    }
});