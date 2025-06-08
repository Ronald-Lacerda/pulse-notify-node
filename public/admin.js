document.addEventListener('DOMContentLoaded', () => {
    const SERVER_URL = window.location.origin;

    // Elementos do DOM
    const totalUsersEl = document.getElementById('total-users');
    const newUsers24hEl = document.getElementById('new-users-24h');
    const usersTableBody = document.getElementById('users-table-body');
    const notificationForm = document.getElementById('notification-form');
    const refreshUsersBtn = document.getElementById('refresh-users-btn');
    const sendNotificationBtn = document.getElementById('send-notification-btn');
    const adminNameEl = document.getElementById('admin-name');
    const logoutBtn = document.getElementById('logout-btn');
    const shareableLinkEl = document.getElementById('shareable-link');
    const copyLinkBtn = document.getElementById('copy-link-btn');

    // Elementos de estatísticas de cliques
    const totalLinksEl = document.getElementById('total-links');
    const totalClicksEl = document.getElementById('total-clicks');
    const clicksTableBody = document.getElementById('clicks-table-body');
    const refreshStatsBtn = document.getElementById('refresh-stats-btn');

    // Elementos de histórico de notificações
    const notificationsTableBody = document.getElementById('notifications-table-body');
    const refreshNotificationsBtn = document.getElementById('refresh-notifications-btn');

    // Modal
    const confirmModal = document.getElementById('confirm-modal');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmOk = document.getElementById('confirm-ok');
    const confirmCancel = document.getElementById('confirm-cancel');

    let currentUsers = [];
    let adminData = null;
    let adminsList = {}; // Cache dos administradores

    /**
     * Carrega lista de administradores
     */
    async function loadAdminsList() {
        try {
            const response = await fetch('/api/admin/list', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                adminsList = data.admins || {};
            }
        } catch (error) {
            console.log('Não foi possível carregar lista de admins:', error);
        }
    }

    /**
     * Obtém nome do admin pelo ID
     */
    function getAdminName(adminId) {
        if (!adminId) return 'N/A';
        const admin = adminsList[adminId];
        return admin ? admin.name : `Admin: ${adminId}`;
    }

    // Verificação de autenticação
    checkAuthentication();

    // Event Listeners
    notificationForm.addEventListener('submit', handleSendNotification);
    refreshUsersBtn.addEventListener('click', loadUsers);
    confirmCancel.addEventListener('click', hideConfirmModal);
    logoutBtn.addEventListener('click', handleLogout);
    copyLinkBtn.addEventListener('click', copyShareableLink);
    refreshStatsBtn.addEventListener('click', loadClickStats);
    refreshNotificationsBtn.addEventListener('click', loadNotifications);

    /**
     * Verifica autenticação do usuário
     */
    async function checkAuthentication() {
        const token = localStorage.getItem('admin_token');
        const adminId = localStorage.getItem('admin_id');

        if (!token || !adminId) {
            redirectToLogin();
            return;
        }

        try {
            const response = await fetch(`${SERVER_URL}/api/admin/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                adminData = data.admin;
                setupAdminInterface();
                loadUsers();
                loadClickStats();
                loadNotifications();
            } else {
                redirectToLogin();
            }
        } catch (error) {
            console.error('Erro ao validar autenticação:', error);
            redirectToLogin();
        }
    }

    /**
     * Redireciona para a página de login
     */
    function redirectToLogin() {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_id');
        localStorage.removeItem('admin_username');
        localStorage.removeItem('admin_name');
        window.location.href = 'login.html';
    }

    /**
     * Configura interface do administrador
     */
    function setupAdminInterface() {
        if (adminData) {
            adminNameEl.textContent = adminData.name || adminData.username;

            // Gera o link compartilhável
            const shareableLink = `${window.location.origin}/subscribe/?admin=${adminData.id}`;
            shareableLinkEl.value = shareableLink;
        }
    }

    /**
     * Manipula logout
     */
    function handleLogout() {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_id');
        localStorage.removeItem('admin_username');
        localStorage.removeItem('admin_name');
        window.location.href = 'login.html';
    }

    /**
     * Copia link compartilhável
     */
    async function copyShareableLink() {
        try {
            await navigator.clipboard.writeText(shareableLinkEl.value);

            // Feedback visual
            const originalText = copyLinkBtn.textContent;
            copyLinkBtn.textContent = 'Copiado!';
            copyLinkBtn.classList.add('bg-green-600');
            copyLinkBtn.classList.remove('bg-blue-600');

            setTimeout(() => {
                copyLinkBtn.textContent = originalText;
                copyLinkBtn.classList.remove('bg-green-600');
                copyLinkBtn.classList.add('bg-blue-600');
            }, 2000);

        } catch (error) {
            console.error('Erro ao copiar link:', error);
            alert('Erro ao copiar link. Copie manualmente.');
        }
    }

    /**
     * Faz requisições autenticadas
     */
    async function authenticatedFetch(url, options = {}) {
        const token = localStorage.getItem('admin_token');

        const authOptions = {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            }
        };

        const response = await fetch(url, authOptions);

        if (response.status === 401) {
            redirectToLogin();
            throw new Error('Não autorizado');
        }

        return response;
    }
    /**
     * Carrega lista de usuários do servidor
     */
    async function loadUsers() {
        try {
            showLoading();

            // Carrega lista de admins primeiro
            await loadAdminsList();

            const response = await authenticatedFetch(`${SERVER_URL}/api/users`);

            if (!response.ok) {
                throw new Error(`Erro: ${response.status}`);
            }

            const data = await response.json();
            currentUsers = data.users;
            
            updateStatistics(data);
            updateUsersTable(data.users);
            
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            showError('Erro ao carregar usuários. Verifique se o servidor está rodando.');
        }
    }

    /**
     * Carrega estatísticas de cliques
     */
    async function loadClickStats() {
        try {
            showClickStatsLoading();

            const response = await authenticatedFetch(`${SERVER_URL}/api/clicks/stats`);

            if (!response.ok) {
                throw new Error(`Erro: ${response.status}`);
            }

            const data = await response.json();
            updateClickStats(data.stats);
            
        } catch (error) {
            console.error('Erro ao carregar estatísticas de cliques:', error);
            showClickStatsError('Erro ao carregar estatísticas de cliques.');
        }
    }

    /**
     * Carrega histórico de notificações
     */
    async function loadNotifications() {
        try {
            showNotificationsLoading();
            
            const response = await authenticatedFetch(`${SERVER_URL}/api/notifications`);
            
            if (!response.ok) {
                throw new Error(`Erro: ${response.status}`);
            }
            
            const data = await response.json();
            updateNotificationsTable(data.notifications);
            
        } catch (error) {
            console.error('Erro ao carregar notificações:', error);
            showNotificationsError('Erro ao carregar notificações.');
        }
    }

    /**
     * Atualiza estatísticas
     */
    function updateStatistics(data) {
        totalUsersEl.textContent = data.total;
        newUsers24hEl.textContent = data.newUsers24h;
    }

    /**
     * Atualiza estatísticas de cliques
     */
    function updateClickStats(stats) {
        totalLinksEl.textContent = stats.total;
        totalClicksEl.textContent = stats.clicked;
        updateClicksTable(stats.recentClicks);
    }

    /**
     * Atualiza tabela de cliques recentes
     */
    function updateClicksTable(recentClicks) {
        if (recentClicks.length === 0) {
            clicksTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-4 py-8 text-center text-gray-500">
                        Nenhum clique registrado ainda
                    </td>
                </tr>
            `;
            return;
        }

        clicksTableBody.innerHTML = recentClicks.map(click => `
            <tr class="border-t hover:bg-gray-50">
                <td class="px-4 py-3 text-sm font-mono text-gray-800">
                    ${click.userId}
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                    ${click.notificationTitle}
                </td>
                <td class="px-4 py-3 text-sm text-blue-600">
                    <a href="${click.originalUrl}" target="_blank" class="hover:underline">
                        ${click.originalUrl.length > 50 ? click.originalUrl.substring(0, 50) + '...' : click.originalUrl}
                    </a>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                    ${formatDate(click.clickedAt)}
                </td>
            </tr>
        `).join('');
    }

    /**
     * Atualiza tabela de notificações
     */
    function updateNotificationsTable(notifications) {
        if (notifications.length === 0) {
            notificationsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                        Nenhuma notificação enviada ainda
                    </td>
                </tr>
            `;
            return;
        }

        notificationsTableBody.innerHTML = notifications.map(notification => `
            <tr class="border-t hover:bg-gray-50">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">
                    ${notification.title}
                    ${notification.isResend ? '<span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Reenvio</span>' : ''}
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                    ${notification.body.length > 50 ? notification.body.substring(0, 50) + '...' : notification.body}
                </td>
                <td class="px-4 py-3 text-sm text-blue-600">
                    ${notification.url ? `<a href="${notification.url}" target="_blank" class="hover:underline">${notification.url.length > 30 ? notification.url.substring(0, 30) + '...' : notification.url}</a>` : 'N/A'}
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                    ${formatDate(notification.sentAt)}
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                    <span class="text-green-600">${notification.sent} enviados</span>
                    ${notification.failed > 0 ? `<br><span class="text-red-600">${notification.failed} falharam</span>` : ''}
                </td>
                <td class="px-4 py-3 text-sm">
                    <button onclick="resendNotification('${notification.id}')" 
                            class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1 px-3 rounded transition-colors">
                        Reenviar
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Atualiza tabela de usuários
     */
    function updateUsersTable(users) {
        if (users.length === 0) {
            usersTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-4 py-8 text-center text-gray-500">
                        Nenhum usuário registrado
                    </td>
                </tr>
            `;
            return;
        }

        usersTableBody.innerHTML = users.map(user => `
            <tr class="border-t hover:bg-gray-50">
                <td class="px-4 py-3 text-sm font-mono text-gray-800">
                    ${user.userId}
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                    ${getAdminName(user.adminId)}
                </td>
                <td class="px-4 py-3">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                    }">
                        ${user.active ? 'Ativo' : 'Inativo'}
                    </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                    ${user.platform || 'N/A'}
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                    ${user.language || 'N/A'}
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                    ${formatDate(user.registeredAt)}
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                    ${user.lastNotificationSent ? formatDate(user.lastNotificationSent) : 'Nunca'}
                </td>
                <td class="px-4 py-3">
                    <button onclick="removeUser('${user.userId}')" 
                            class="text-red-600 hover:text-red-800 text-sm font-medium">
                        Remover
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Manipula envio de notificação
     */
    async function handleSendNotification(e) {
        e.preventDefault();
        
        const title = document.getElementById('notification-title').value;
        const body = document.getElementById('notification-body').value;
        const url = document.getElementById('notification-url').value;

        try {
            sendNotificationBtn.disabled = true;
            sendNotificationBtn.textContent = 'Enviando...';

            const endpoint = `${SERVER_URL}/api/notify-all`;
            const payload = { title, body, url };

            const response = await authenticatedFetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Erro: ${response.status}`);
            }

            const result = await response.json();
            
            alert(`Notificação enviada! ${result.sent} sucessos, ${result.failed} falhas`);

            // Limpa formulário
            notificationForm.reset();
            
            // Recarrega usuários para atualizar estatísticas
            loadUsers();
            
            // Recarrega estatísticas de cliques se uma URL foi fornecida
            if (url && url.trim() !== '') {
                loadClickStats();
            }

            // Recarrega histórico de notificações
            loadNotifications();

        } catch (error) {
            console.error('Erro ao enviar notificação:', error);
            alert('Erro ao enviar notificação. Verifique o console para mais detalhes.');
        } finally {
            sendNotificationBtn.disabled = false;
            sendNotificationBtn.textContent = 'Enviar para Todos os Usuários';
        }
    }

    /**
     * Reenvia uma notificação
     */
    async function resendNotification(notificationId) {
        if (!confirm('Tem certeza que deseja reenviar esta notificação para todos os usuários ativos?')) {
            return;
        }

        try {
            const response = await authenticatedFetch(`${SERVER_URL}/api/notifications/${notificationId}/resend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`Erro: ${response.status}`);
            }

            const result = await response.json();
            
            alert(`Notificação reenviada! ${result.sent} sucessos, ${result.failed} falhas`);

            // Recarrega dados
            loadUsers();
            loadNotifications();
            
            // Recarrega estatísticas de cliques se houve links
            if (result.trackingIds && result.trackingIds.length > 0) {
                loadClickStats();
            }

        } catch (error) {
            console.error('Erro ao reenviar notificação:', error);
            alert('Erro ao reenviar notificação. Verifique o console para mais detalhes.');
        }
    }

    // Torna a função global para uso nos botões
    window.resendNotification = resendNotification;

    /**
     * Remove usuário
     */
    window.removeUser = async function(userId) {
        showConfirmModal(
            `Tem certeza que deseja remover o usuário ${userId}? Esta ação não pode ser desfeita.`,
            async () => {
                try {
                    const response = await authenticatedFetch(`${SERVER_URL}/api/users/${userId}`, {
                        method: 'DELETE'
                    });

                    if (!response.ok) {
                        throw new Error(`Erro: ${response.status}`);
                    }

                    alert('Usuário removido com sucesso!');
                    loadUsers();

                } catch (error) {
                    console.error('Erro ao remover usuário:', error);
                    alert('Erro ao remover usuário.');
                }
            }
        );
    };

    /**
     * Mostra modal de confirmação
     */
    function showConfirmModal(message, onConfirm) {
        confirmMessage.textContent = message;
        confirmModal.classList.remove('hidden');
        
        confirmOk.onclick = () => {
            hideConfirmModal();
            onConfirm();
        };
    }

    /**
     * Esconde modal de confirmação
     */
    function hideConfirmModal() {
        confirmModal.classList.add('hidden');
        confirmOk.onclick = null;
    }

    /**
     * Mostra estado de carregamento
     */
    function showLoading() {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="px-4 py-8 text-center text-gray-500">
                    <div class="flex items-center justify-center">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                        Carregando usuários...
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Mostra estado de carregamento para estatísticas de cliques
     */
    function showClickStatsLoading() {
        clicksTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-4 py-8 text-center text-gray-500">
                    <div class="flex items-center justify-center">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                        Carregando estatísticas...
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Mostra erro
     */
    function showError(message) {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="px-4 py-8 text-center text-red-500">
                    ${message}
                </td>
            </tr>
        `;
    }

    /**
     * Mostra erro para estatísticas de cliques
     */
    function showClickStatsError(message) {
        clicksTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-4 py-8 text-center text-red-500">
                    ${message}
                </td>
            </tr>
        `;
    }

    /**
     * Mostra estado de carregamento para notificações
     */
    function showNotificationsLoading() {
        notificationsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                    <div class="flex items-center justify-center">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                        Carregando notificações...
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Mostra erro para notificações
     */
    function showNotificationsError(message) {
        notificationsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-4 py-8 text-center text-red-500">
                    ${message}
                </td>
            </tr>
        `;
    }

    /**
     * Formata data
     */
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
});