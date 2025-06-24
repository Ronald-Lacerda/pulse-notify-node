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
     * Função de debug para testar API manualmente
     */
    window.testAdminAPI = async function() {
        const token = localStorage.getItem('admin_token');
        
        if (!token) {
            console.error('Nenhum token encontrado!');
            return;
        }

        try {
            console.log('Testando /api/admin/validate...');
            const validateResponse = await fetch(`${SERVER_URL}/api/admin/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('Validate response:', validateResponse.status, validateResponse.statusText);
            
            if (validateResponse.ok) {
                const validateData = await validateResponse.json();
                console.log('Validate data:', validateData);
            }

            console.log('Testando /api/admin/list...');
            const listResponse = await fetch('/api/admin/list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('List response:', listResponse.status, listResponse.statusText);
            
            if (listResponse.ok) {
                const listData = await listResponse.json();
                console.log('List data:', listData);
            } else {
                const errorText = await listResponse.text();
                console.log('List error:', errorText);
            }
        } catch (error) {
            console.error('Erro no teste:', error);
        }
    };
    /**
     * Carrega lista de administradores
     */
    async function loadAdminsList() {
        try {
            const token = localStorage.getItem('admin_token');
            if (!token) {
                console.log('Token de admin não encontrado para carregar lista');
                return;
            }

            const response = await fetch('/api/admin/list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                adminsList = data.admins || {};
                console.log('Lista de admins carregada:', Object.keys(adminsList).length, 'admins');
            } else {
                console.error('Erro ao carregar lista de admins:', response.status, response.statusText);
                if (response.status === 401 || response.status === 403) {
                    console.log('Token inválido ou expirado, redirecionando para login');
                    redirectToLogin();
                }
            }
        } catch (error) {
            console.error('Erro na requisição para carregar lista de admins:', error);
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
            console.log('Token ou ID do admin não encontrados');
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
                console.log('Autenticação válida para admin:', adminData.name || adminData.username);
                
                setupAdminInterface();
                
                // Carrega dados após autenticação bem-sucedida
                await loadAdminsList(); // Carrega primeiro a lista de admins
                loadUsers();
                loadClickStats();
                loadNotifications();
            } else {
                console.error('Falha na validação:', response.status, response.statusText);
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

            // Feedback visual melhorado
            const originalText = copyLinkBtn.innerHTML;
            copyLinkBtn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Copiado!
            `;
            copyLinkBtn.classList.remove('bg-primary-600', 'hover:bg-primary-700');
            copyLinkBtn.classList.add('bg-green-600', 'hover:bg-green-700');

            setTimeout(() => {
                copyLinkBtn.innerHTML = originalText;
                copyLinkBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                copyLinkBtn.classList.add('bg-primary-600', 'hover:bg-primary-700');
            }, 2000);

        } catch (error) {
            console.error('Erro ao copiar link:', error);
            
            // Feedback de erro
            const originalText = copyLinkBtn.innerHTML;
            copyLinkBtn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                Erro
            `;
            copyLinkBtn.classList.remove('bg-primary-600', 'hover:bg-primary-700');
            copyLinkBtn.classList.add('bg-red-600', 'hover:bg-red-700');

            setTimeout(() => {
                copyLinkBtn.innerHTML = originalText;
                copyLinkBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
                copyLinkBtn.classList.add('bg-primary-600', 'hover:bg-primary-700');
            }, 2000);
            
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
                    <td colspan="4" class="px-6 py-12 text-center text-slate-500">
                        <div class="flex flex-col items-center gap-4">
                            <div class="bg-slate-100 p-4 rounded-xl">
                                <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path>
                                </svg>
                            </div>
                            <span class="text-lg font-medium">Nenhum clique registrado ainda</span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        clicksTableBody.innerHTML = recentClicks.map(click => `
            <tr class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 text-sm font-mono text-slate-800">
                    ${click.userId}
                </td>
                <td class="px-6 py-4 text-sm text-slate-600">
                    ${click.notificationTitle}
                </td>
                <td class="px-6 py-4 text-sm">
                    <a href="${click.originalUrl}" target="_blank" class="text-primary-600 hover:text-primary-700 hover:underline transition-colors">
                        ${click.originalUrl.length > 50 ? click.originalUrl.substring(0, 50) + '...' : click.originalUrl}
                    </a>
                </td>
                <td class="px-6 py-4 text-sm text-slate-600">
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
                    <td colspan="6" class="px-6 py-12 text-center text-slate-500">
                        <div class="flex flex-col items-center gap-4">
                            <div class="bg-slate-100 p-4 rounded-xl">
                                <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM4 19h6v-2H4v2zM4 15h8v-2H4v2zM4 11h10V9H4v2z"></path>
                                </svg>
                            </div>
                            <span class="text-lg font-medium">Nenhuma notificação enviada ainda</span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        notificationsTableBody.innerHTML = notifications.map(notification => `
            <tr class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 text-sm font-medium text-slate-900">
                    ${notification.title}
                    ${notification.isResend ? '<span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Reenvio</span>' : ''}
                </td>
                <td class="px-6 py-4 text-sm text-slate-600">
                    ${notification.body.length > 50 ? notification.body.substring(0, 50) + '...' : notification.body}
                </td>
                <td class="px-6 py-4 text-sm">
                    ${notification.url ? `<a href="${notification.url}" target="_blank" class="text-primary-600 hover:text-primary-700 hover:underline transition-colors">${notification.url.length > 30 ? notification.url.substring(0, 30) + '...' : notification.url}</a>` : '<span class="text-slate-400">N/A</span>'}
                </td>
                <td class="px-6 py-4 text-sm text-slate-600">
                    ${formatDate(notification.sentAt)}
                </td>
                <td class="px-6 py-4 text-sm">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">${notification.sent} enviados</span>
                    ${notification.failed > 0 ? `<br><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-1">${notification.failed} falharam</span>` : ''}
                </td>
                <td class="px-6 py-4 text-sm">
                    <button onclick="resendNotification('${notification.id}')" 
                            class="bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5">
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
                    <td colspan="8" class="px-6 py-12 text-center text-slate-500">
                        <div class="flex flex-col items-center gap-4">
                            <div class="bg-slate-100 p-4 rounded-xl">
                                <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                </svg>
                            </div>
                            <span class="text-lg font-medium">Nenhum usuário registrado</span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        usersTableBody.innerHTML = users.map(user => `
            <tr class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 text-sm font-mono text-slate-800">
                    ${user.userId}
                </td>
                <td class="px-6 py-4 text-sm text-slate-600">
                    ${getAdminName(user.adminId)}
                </td>
                <td class="px-6 py-4">
                    <span class="inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        user.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                    }">
                        ${user.active ? 'Ativo' : 'Inativo'}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm text-slate-600">
                    ${user.platform || '<span class="text-slate-400">N/A</span>'}
                </td>
                <td class="px-6 py-4 text-sm text-slate-600">
                    ${user.language || '<span class="text-slate-400">N/A</span>'}
                </td>
                <td class="px-6 py-4 text-sm text-slate-600">
                    ${formatDate(user.registeredAt)}
                </td>
                <td class="px-6 py-4 text-sm text-slate-600">
                    ${user.lastNotificationSent ? formatDate(user.lastNotificationSent) : '<span class="text-slate-400">Nunca</span>'}
                </td>
                <td class="px-6 py-4">
                    <button onclick="removeUser('${user.userId}')" 
                            class="text-red-600 hover:text-red-800 text-sm font-medium hover:bg-red-50 px-3 py-1 rounded-lg transition-all duration-200">
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
                <td colspan="8" class="px-6 py-12 text-center text-slate-500">
                    <div class="flex flex-col items-center gap-4">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                        <span class="text-lg font-medium">Carregando usuários...</span>
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
                <td colspan="4" class="px-6 py-12 text-center text-slate-500">
                    <div class="flex flex-col items-center gap-4">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                        <span class="text-lg font-medium">Carregando estatísticas...</span>
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
                <td colspan="8" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center gap-4">
                        <div class="bg-red-100 p-3 rounded-xl">
                            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <span class="text-red-600 font-medium">${message}</span>
                    </div>
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
                <td colspan="4" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center gap-4">
                        <div class="bg-red-100 p-3 rounded-xl">
                            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <span class="text-red-600 font-medium">${message}</span>
                    </div>
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
                <td colspan="6" class="px-6 py-12 text-center text-slate-500">
                    <div class="flex flex-col items-center gap-4">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                        <span class="text-lg font-medium">Carregando notificações...</span>
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
                <td colspan="6" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center gap-4">
                        <div class="bg-red-100 p-3 rounded-xl">
                            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <span class="text-red-600 font-medium">${message}</span>
                    </div>
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