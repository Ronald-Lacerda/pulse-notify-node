document.addEventListener('DOMContentLoaded', function() {
    const SERVER_URL = window.location.origin;

    // Elementos do DOM
    const createAdminForm = document.getElementById('create-admin-form');
    const adminNameInput = document.getElementById('admin-name');
    const adminUsernameInput = document.getElementById('admin-username');
    const adminPasswordInput = document.getElementById('admin-password');
    const adminPasswordConfirmInput = document.getElementById('admin-password-confirm');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const clearFormBtn = document.getElementById('clear-form-btn');
    const createAdminBtn = document.getElementById('create-admin-btn');
    const createBtnText = document.getElementById('create-btn-text');
    const formFeedback = document.getElementById('form-feedback');
    const feedbackIcon = document.getElementById('feedback-icon');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackMessage = document.getElementById('feedback-message');
    
    // Elementos da tabela
    const adminsTableBody = document.getElementById('admins-table-body');
    const refreshAdminsBtn = document.getElementById('refresh-admins-btn');
    const adminsLoading = document.getElementById('admins-loading');
    const adminsEmpty = document.getElementById('admins-empty');
    
    // Modal
    const confirmModal = document.getElementById('confirm-modal');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmOk = document.getElementById('confirm-ok');
    const confirmCancel = document.getElementById('confirm-cancel');
    
    // Logout
    const logoutBtn = document.getElementById('logout-btn');

    let currentAdmins = [];

    /**
     * Inicialização
     */
    function init() {
        // Verificar autenticação
        checkAuthentication();
        
        // Carregar lista de admins
        loadAdmins();
        
        // Event listeners
        setupEventListeners();
    }

    /**
     * Configurar event listeners
     */
    function setupEventListeners() {
        // Formulário
        createAdminForm.addEventListener('submit', handleCreateAdmin);
        clearFormBtn.addEventListener('click', clearForm);
        togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
        
        // Validação em tempo real
        adminPasswordConfirmInput.addEventListener('input', validatePasswordMatch);
        adminUsernameInput.addEventListener('input', validateUsername);
        
        // Tabela
        refreshAdminsBtn.addEventListener('click', loadAdmins);
        
        // Modal
        confirmCancel.addEventListener('click', hideConfirmModal);
        
        // Logout
        logoutBtn.addEventListener('click', handleLogout);
        
        // Fechar modal clicando fora
        confirmModal.addEventListener('click', function(e) {
            if (e.target === confirmModal) {
                hideConfirmModal();
            }
        });
    }

    /**
     * Verificar autenticação
     */
    async function checkAuthentication() {
        const token = localStorage.getItem('super_admin_token');
        
        if (!token) {
            window.location.href = '/super-admin-login.html';
            return;
        }

        try {
            const response = await fetch(`${SERVER_URL}/api/super-admin/validate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Token inválido');
            }

        } catch (error) {
            console.error('Erro na autenticação:', error);
            localStorage.removeItem('super_admin_token');
            window.location.href = '/super-admin-login.html';
        }
    }

    /**
     * Carregar lista de administradores
     */
    async function loadAdmins() {
        const token = localStorage.getItem('super_admin_token');
        
        try {
            showLoadingState();
            
            const response = await fetch(`${SERVER_URL}/api/super-admin/admins`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            currentAdmins = Object.values(data.admins || {});
            
            renderAdminsTable();
            
        } catch (error) {
            console.error('Erro ao carregar admins:', error);
            showError('Erro ao carregar lista de administradores');
        }
    }

    /**
     * Renderizar tabela de administradores
     */
    function renderAdminsTable() {
        hideLoadingState();
        
        if (currentAdmins.length === 0) {
            showEmptyState();
            return;
        }
        
        hideEmptyState();
        
        const tbody = adminsTableBody;
        tbody.innerHTML = '';
        
        currentAdmins.forEach(admin => {
            const row = createAdminRow(admin);
            tbody.appendChild(row);
        });
    }

    /**
     * Criar linha da tabela para um admin
     */
    function createAdminRow(admin) {
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50 transition-colors';
        
        const statusBadge = admin.active 
            ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Ativo</span>'
            : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inativo</span>';
        
        const channelIdDisplay = admin.channelId 
            ? `<code class="text-xs bg-slate-100 px-2 py-1 rounded font-mono">${admin.channelId.substring(0, 16)}...</code>`
            : '<span class="text-red-500 text-xs">❌ Não definido</span>';
        
        const createdAt = admin.createdAt 
            ? new Date(admin.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'N/A';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                        <div class="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                            <span class="text-white font-semibold text-sm">${admin.name.charAt(0).toUpperCase()}</span>
                        </div>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-slate-900">${escapeHtml(admin.name)}</div>
                        <div class="text-sm text-slate-500">ID: ${admin.id}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-slate-900">${escapeHtml(admin.username)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${channelIdDisplay}
                ${admin.channelId ? `
                    <button onclick="copyChannelId('${admin.channelId}')" class="ml-2 text-blue-600 hover:text-blue-800 text-xs">
                        <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                    </button>
                ` : ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${statusBadge}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                ${createdAt}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center gap-2">
                    ${admin.channelId ? `
                        <button onclick="viewShareableLink('${admin.channelId}', '${escapeHtml(admin.name)}')" 
                                class="text-blue-600 hover:text-blue-900 transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path>
                            </svg>
                        </button>
                    ` : ''}
                    <button onclick="toggleAdminStatus('${admin.id}', ${admin.active})" 
                            class="${admin.active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'} transition-colors">
                        ${admin.active ? `
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"></path>
                            </svg>
                        ` : `
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        `}
                    </button>
                </div>
            </td>
        `;
        
        return row;
    }

    /**
     * Manipular criação de novo admin
     */
    async function handleCreateAdmin(e) {
        e.preventDefault();
        
        // Validar formulário
        if (!validateForm()) {
            return;
        }
        
        const formData = new FormData(createAdminForm);
        const adminData = {
            name: formData.get('name').trim(),
            username: formData.get('username').trim(),
            password: formData.get('password')
        };
        
        const token = localStorage.getItem('super_admin_token');
        
        try {
            setLoadingState(true);
            
            const response = await fetch(`${SERVER_URL}/api/super-admin/create-admin`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(adminData)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Erro ao criar administrador');
            }
            
            showSuccess('Administrador criado com sucesso!', `Channel ID: ${result.channelId}`);
            clearForm();
            loadAdmins(); // Recarregar lista
            
        } catch (error) {
            console.error('Erro ao criar admin:', error);
            showError(error.message || 'Erro ao criar administrador');
        } finally {
            setLoadingState(false);
        }
    }

    /**
     * Validar formulário
     */
    function validateForm() {
        const name = adminNameInput.value.trim();
        const username = adminUsernameInput.value.trim();
        const password = adminPasswordInput.value;
        const passwordConfirm = adminPasswordConfirmInput.value;
        
        // Validar campos obrigatórios
        if (!name || !username || !password || !passwordConfirm) {
            showError('Todos os campos são obrigatórios');
            return false;
        }
        
        // Validar nome de usuário
        if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
            showError('Nome de usuário deve conter apenas letras, números, pontos, hífens e underscores');
            return false;
        }
        
        // Validar senha
        if (password.length < 6) {
            showError('A senha deve ter pelo menos 6 caracteres');
            return false;
        }
        
        // Validar confirmação de senha
        if (password !== passwordConfirm) {
            showError('As senhas não coincidem');
            return false;
        }
        
        return true;
    }

    /**
     * Validar correspondência de senhas em tempo real
     */
    function validatePasswordMatch() {
        const password = adminPasswordInput.value;
        const passwordConfirm = adminPasswordConfirmInput.value;
        
        if (passwordConfirm && password !== passwordConfirm) {
            adminPasswordConfirmInput.setCustomValidity('As senhas não coincidem');
            adminPasswordConfirmInput.classList.add('border-red-300', 'focus:ring-red-500');
        } else {
            adminPasswordConfirmInput.setCustomValidity('');
            adminPasswordConfirmInput.classList.remove('border-red-300', 'focus:ring-red-500');
        }
    }

    /**
     * Validar nome de usuário em tempo real
     */
    function validateUsername() {
        const username = adminUsernameInput.value;
        
        if (username && !/^[a-zA-Z0-9._-]+$/.test(username)) {
            adminUsernameInput.setCustomValidity('Apenas letras, números, pontos, hífens e underscores');
            adminUsernameInput.classList.add('border-red-300', 'focus:ring-red-500');
        } else {
            adminUsernameInput.setCustomValidity('');
            adminUsernameInput.classList.remove('border-red-300', 'focus:ring-red-500');
        }
    }

    /**
     * Alternar visibilidade da senha
     */
    function togglePasswordVisibility() {
        const type = adminPasswordInput.type === 'password' ? 'text' : 'password';
        adminPasswordInput.type = type;
        
        const icon = type === 'password' 
            ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>`
            : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>`;
        
        togglePasswordBtn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">${icon}</svg>`;
    }

    /**
     * Limpar formulário
     */
    function clearForm() {
        createAdminForm.reset();
        hideFeedback();
        
        // Remover classes de validação
        [adminUsernameInput, adminPasswordConfirmInput].forEach(input => {
            input.classList.remove('border-red-300', 'focus:ring-red-500');
            input.setCustomValidity('');
        });
    }

    /**
     * Estados de loading
     */
    function setLoadingState(loading) {
        createAdminBtn.disabled = loading;
        createBtnText.textContent = loading ? 'Criando...' : 'Criar Administrador';
        
        if (loading) {
            createAdminBtn.classList.add('opacity-75', 'cursor-not-allowed');
        } else {
            createAdminBtn.classList.remove('opacity-75', 'cursor-not-allowed');
        }
    }

    function showLoadingState() {
        adminsLoading.classList.remove('hidden');
        adminsTableBody.parentElement.classList.add('hidden');
        adminsEmpty.classList.add('hidden');
    }

    function hideLoadingState() {
        adminsLoading.classList.add('hidden');
        adminsTableBody.parentElement.classList.remove('hidden');
    }

    function showEmptyState() {
        adminsEmpty.classList.remove('hidden');
        adminsTableBody.parentElement.classList.add('hidden');
    }

    function hideEmptyState() {
        adminsEmpty.classList.add('hidden');
        adminsTableBody.parentElement.classList.remove('hidden');
    }

    /**
     * Feedback visual
     */
    function showSuccess(title, message = '') {
        formFeedback.className = 'p-4 rounded-xl bg-green-50 border border-green-200';
        feedbackIcon.innerHTML = `
            <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
        `;
        feedbackTitle.textContent = title;
        feedbackTitle.className = 'font-semibold text-green-800';
        feedbackMessage.textContent = message;
        feedbackMessage.className = 'text-sm text-green-700';
        formFeedback.classList.remove('hidden');
        
        // Auto-hide após 5 segundos
        setTimeout(hideFeedback, 5000);
    }

    function showError(message) {
        formFeedback.className = 'p-4 rounded-xl bg-red-50 border border-red-200';
        feedbackIcon.innerHTML = `
            <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
        `;
        feedbackTitle.textContent = 'Erro';
        feedbackTitle.className = 'font-semibold text-red-800';
        feedbackMessage.textContent = message;
        feedbackMessage.className = 'text-sm text-red-700';
        formFeedback.classList.remove('hidden');
    }

    function hideFeedback() {
        formFeedback.classList.add('hidden');
    }

    /**
     * Modal de confirmação
     */
    function showConfirmModal(message, callback) {
        confirmMessage.textContent = message;
        confirmModal.classList.remove('hidden');
        confirmModal.classList.add('flex');
        
        // Remover listeners anteriores
        confirmOk.replaceWith(confirmOk.cloneNode(true));
        const newConfirmOk = document.getElementById('confirm-ok');
        
        newConfirmOk.addEventListener('click', () => {
            hideConfirmModal();
            callback();
        });
    }

    function hideConfirmModal() {
        confirmModal.classList.add('hidden');
        confirmModal.classList.remove('flex');
    }

    /**
     * Logout
     */
    function handleLogout() {
        showConfirmModal('Tem certeza que deseja sair?', () => {
            localStorage.removeItem('super_admin_token');
            window.location.href = '/super-admin-login.html';
        });
    }

    /**
     * Utilitários
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Funções globais para os botões da tabela
    window.copyChannelId = async function(channelId) {
        try {
            await navigator.clipboard.writeText(channelId);
            
            // Feedback visual temporário
            const button = event.target.closest('button');
            const originalHTML = button.innerHTML;
            button.innerHTML = `
                <svg class="w-4 h-4 inline text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
            `;
            
            setTimeout(() => {
                button.innerHTML = originalHTML;
            }, 2000);
            
        } catch (error) {
            console.error('Erro ao copiar:', error);
        }
    };

    window.viewShareableLink = function(channelId, adminName) {
        const shareableLink = `${window.location.origin}/subscribe/?channel=${channelId}`;
        
        // Criar modal personalizado para mostrar o link
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
                <div class="text-center mb-6">
                    <div class="bg-blue-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path>
                        </svg>
                    </div>
                    <h3 class="text-xl font-bold text-slate-800 mb-2">Link Compartilhável</h3>
                    <p class="text-slate-600">Admin: ${escapeHtml(adminName)}</p>
                </div>
                
                <div class="mb-6">
                    <label class="block text-sm font-semibold text-slate-700 mb-2">URL Segura:</label>
                    <div class="flex items-center gap-2">
                        <input type="text" value="${shareableLink}" readonly 
                               class="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none">
                        <button onclick="copyShareableLink('${shareableLink}')" 
                                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="bg-slate-50 p-4 rounded-xl mb-6">
                    <p class="text-sm text-slate-600">
                        <strong>Channel ID:</strong> <code class="bg-white px-2 py-1 rounded text-xs">${channelId}</code>
                    </p>
                </div>
                
                <div class="text-center">
                    <button onclick="this.closest('.fixed').remove()" 
                            class="bg-slate-600 hover:bg-slate-700 text-white font-medium py-2 px-6 rounded-xl transition-all">
                        Fechar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Fechar clicando fora
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });
    };

    window.copyShareableLink = async function(link) {
        try {
            await navigator.clipboard.writeText(link);
            
            // Feedback visual
            const button = event.target.closest('button');
            const originalHTML = button.innerHTML;
            button.innerHTML = `
                <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
            `;
            
            setTimeout(() => {
                button.innerHTML = originalHTML;
            }, 2000);
            
        } catch (error) {
            console.error('Erro ao copiar link:', error);
        }
    };

    window.toggleAdminStatus = function(adminId, currentStatus) {
        const action = currentStatus ? 'desativar' : 'ativar';
        const message = `Tem certeza que deseja ${action} este administrador?`;
        
        showConfirmModal(message, async () => {
            const token = localStorage.getItem('super_admin_token');
            
            try {
                const response = await fetch(`${SERVER_URL}/api/super-admin/admin/${adminId}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ active: !currentStatus })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Erro ao alterar status');
                }

                // Recarregar lista
                loadAdmins();
                
                // Mostrar feedback de sucesso
                showSuccess(result.message || `Administrador ${action} com sucesso!`);

            } catch (error) {
                console.error('Erro ao alterar status:', error);
                showError(error.message || 'Erro ao alterar status do administrador');
            }
        });
    };

    // Inicializar aplicação
    init();
});