class ApiClient {
    constructor() {
        this.baseUrl = 'http://localhost:3001';
        this.fingerprintSDK = new FingerprintSDK();
        this.token = localStorage.getItem('auth_token');
    }

    getToken() {
        return localStorage.getItem('auth_token');
    }

    setToken(token) {
        localStorage.setItem('auth_token', token);
        this.token = token;
    }

    clearToken() {
        localStorage.removeItem('auth_token');
        this.token = null;
    }

    async request(endpoint, options = {}, feature = 'unknown') {
        await this.fingerprintSDK.ensureReady();

        const headers = {
            'Content-Type': 'application/json',
            'X-Fingerprint': btoa(JSON.stringify(this.fingerprintSDK.fingerprint)),
            'X-Client-IP': this.fingerprintSDK.ip,
            'X-Feature-Name': feature,
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers
            });

            return response;
        } catch (err) {
            console.error('Erro na requisição:', err);
            throw err;
        }
    }

    // Métodos específicos
    async login(email, senha) {
        const response = await this.request('/api/login', {
            method: 'POST',
            body: JSON.stringify({ email, senha })
        }, 'login');
        
        const data = await response.json();
        
        if (data.success && data.token) {
            this.setToken(data.token);
            localStorage.setItem('user_data', JSON.stringify(data.user));
        }
        
        return data;
    }

    async register(nome, email, senha) {
        const response = await this.request('/api/usuarios', {
            method: 'POST',
            body: JSON.stringify({ nome, email, senha })
        }, 'register');
        
        return response.json();
    }

    async getItens() {
        const response = await this.request('/api/itens', {}, 'browse_items');
        return response.json();
    }

    async createPedido(itens) {
        const response = await this.request('/api/pedidos', {
            method: 'POST',
            body: JSON.stringify({ itens })
        }, 'checkout');
        
        return response;
    }

    async getPedidos() {
        const response = await this.request('/api/pedidos', {}, 'view_orders');
        return response.json();
    }

    async logout() {
        try {
            await this.request('/api/logout', { method: 'POST' }, 'logout');
        } finally {
            this.clearToken();
            localStorage.removeItem('user_data');
            window.location.href = '/login.html';
        }
    }
}

window.apiClient = new ApiClient();
