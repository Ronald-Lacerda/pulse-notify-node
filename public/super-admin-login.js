/**
 * Super Admin Login - Sistema de Notificações Push
 * Página de login para Super Administradores
 */

document.addEventListener('DOMContentLoaded', function() {
    // Configuração
    const SERVER_URL = window.location.origin;
    
    // Elementos DOM
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login-btn');
    const errorMessage = document.getElementById('error-message');
    const loadingSpinner = document.getElementById('loading-spinner');

    // Verificar se já está logado
    checkExistingLogin();

    // Event listeners
    loginForm.addEventListener('submit', handleLogin);
    
    // Permitir login com Enter
    [usernameInput, passwordInput].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleLogin(e);
            }
        });
    });

    /**
     * Verificar se já existe um login válido
     */
    async function checkExistingLogin() {
        const token = localStorage.getItem('super_admin_token');
        
        if (token) {
            try {
                const response = await fetch(`${SERVER_URL}/api/super-admin/validate`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    // Token válido, redirecionar
                    window.location.href = '/admin-management';
                    return;
                }
            } catch (error) {
                console.log('Token inválido, removendo...');
            }
            
            // Token inválido, remover
            localStorage.removeItem('super_admin_token');
        }
    }

    /**
     * Manipular login
     */
    async function handleLogin(e) {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        
        // Validação básica
        if (!username || !password) {
            showError('Por favor, preencha todos os campos');
            return;
        }
        
        try {
            setLoadingState(true);
            hideError();
            
            const response = await fetch(`${SERVER_URL}/api/super-admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Login bem-sucedido
                localStorage.setItem('super_admin_token', data.token);
                
                // Feedback visual
                showSuccess('Login realizado com sucesso!');
                
                // Redirecionar após um breve delay
                setTimeout(() => {
                    window.location.href = '/admin-management';
                }, 1000);
                
            } else {
                // Erro no login
                showError(data.error || 'Erro ao fazer login');
            }
            
        } catch (error) {
            console.error('Erro no login:', error);
            showError('Erro de conexão. Tente novamente.');
        } finally {
            setLoadingState(false);
        }
    }

    /**
     * Mostrar/ocultar estado de carregamento
     */
    function setLoadingState(loading) {
        if (loading) {
            loginButton.disabled = true;
            loginButton.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Entrando...
            `;
            usernameInput.disabled = true;
            passwordInput.disabled = true;
        } else {
            loginButton.disabled = false;
            loginButton.innerHTML = `
                <span class="flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                    Entrar como Super Admin
                </span>
            `;
            usernameInput.disabled = false;
            passwordInput.disabled = false;
        }
    }

    /**
     * Mostrar mensagem de erro
     */
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        errorMessage.classList.add('animate-pulse');
        
        // Remover animação após um tempo
        setTimeout(() => {
            errorMessage.classList.remove('animate-pulse');
        }, 1000);
    }

    /**
     * Ocultar mensagem de erro
     */
    function hideError() {
        errorMessage.classList.add('hidden');
    }

    /**
     * Mostrar mensagem de sucesso
     */
    function showSuccess(message) {
        // Criar elemento de sucesso temporário
        const successDiv = document.createElement('div');
        successDiv.className = 'bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-xl mb-6 animate-pulse';
        successDiv.innerHTML = `
            <div class="flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                ${message}
            </div>
        `;
        
        // Inserir antes do formulário
        loginForm.parentNode.insertBefore(successDiv, loginForm);
        
        // Remover após 3 segundos
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    /**
     * Animação de entrada da página
     */
    function initPageAnimation() {
        const container = document.querySelector('.container');
        if (container) {
            container.style.opacity = '0';
            container.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                container.style.transition = 'all 0.6s ease-out';
                container.style.opacity = '1';
                container.style.transform = 'translateY(0)';
            }, 100);
        }
    }

    // Inicializar animação
    initPageAnimation();

    // Focar no campo de usuário
    setTimeout(() => {
        usernameInput.focus();
    }, 500);
});