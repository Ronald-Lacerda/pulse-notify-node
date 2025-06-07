document.addEventListener('DOMContentLoaded', () => {
    const SERVER_URL =  window.location.origin;

    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const errorMessage = document.getElementById('error-message');

    // Verifica se já está logado
    checkAuthStatus();

    loginForm.addEventListener('submit', handleLogin);

    /**
     * Verifica se o usuário já está autenticado
     */
    function checkAuthStatus() {
        const token = localStorage.getItem('admin_token');
        const adminId = localStorage.getItem('admin_id');

        if (token && adminId) {
            // Verifica se o token ainda é válido
            validateToken(token).then(isValid => {
                if (isValid) {
                    // Redireciona para o painel admin
                    window.location.href = 'admin.html';
                }
            });
        }
    }

    /**
     * Valida o token no servidor
     */
    async function validateToken(token) {
        try {
            const response = await fetch(`${SERVER_URL}/api/admin/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Erro ao validar token:', error);
            return false;
        }
    }

    /**
     * Manipula o login
     */
    async function handleLogin(e) {
        e.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            showError('Por favor, preencha todos os campos.');
            return;
        }

        try {
            loginBtn.disabled = true;
            loginBtn.textContent = 'Entrando...';
            hideError();

            const response = await fetch(`${SERVER_URL}/api/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Salva o token e informações do admin
                localStorage.setItem('admin_token', data.token);
                localStorage.setItem('admin_id', data.adminId);
                localStorage.setItem('admin_username', data.username);
                localStorage.setItem('admin_name', data.name);

                // Redireciona para o painel
                window.location.href = 'admin.html';
            } else {
                showError(data.error || 'Erro ao fazer login');
            }

        } catch (error) {
            console.error('Erro no login:', error);
            showError('Erro de conexão. Verifique se o servidor está rodando.');
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Entrar';
        }
    }

    /**
     * Mostra mensagem de erro
     */
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }

    /**
     * Esconde mensagem de erro
     */
    function hideError() {
        errorMessage.classList.add('hidden');
    }
});