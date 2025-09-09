const bcrypt = require('bcryptjs');
const db = require('../config/database.js');
const SessionManager = require('../auth/sessionManager');

class AuthController {
    static async register(req, res) {
        try {
            const { nome, email, senha } = req.body;
            if (!nome || !email || !senha) {
                return res.status(400).json({ error: "Todos os campos são obrigatórios" });
            }

            // Hash da senha
            const senhaHash = await bcrypt.hash(senha, 12);

            // Cria usuário
            const { rows } = await db.query(
                'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING id, nome, email',
                [nome, email, senhaHash]
            );
            const user = rows[0];

            // Log de auditoria (sem session_id pois ainda não existe)
            await db.query(
                `INSERT INTO audit_logs (user_id, action, resource, ip_address, user_agent, status)
                 VALUES ($1, 'user_register', 'user', $2, $3, 'success')`,
                [user.id, req.clientIp, req.headers['user-agent']]
            );

            res.status(201).json({
                success: true,
                message: 'Usuário criado com sucesso',
                user: { id: user.id, nome: user.nome, email: user.email }
            });

        } catch (err) {
            console.error('Erro no registro:', err);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: 'Não foi possível criar o usuário'
            });
        }
    }

    static async login(req, res) {
        try {
            const { email, senha } = req.body;
            if (!email || !senha) {
                return res.status(400).json({ error: "Email e senha são obrigatórios." });
            }

            // Busca usuário
            const { rows } = await db.query(
                'SELECT id, nome, email, senha, status FROM usuarios WHERE email = $1',
                [email]
            );
            if (rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'Credenciais inválidas'
                });
            }

            const user = rows[0];
            if (user.status && user.status !== 'active') {
                return res.status(403).json({ success: false, error: 'Usuário inativo/bloqueado' });
            }

            // Verifica senha
            if (!user.senha) {
                return res.status(401).json({
                    success: false,
                    error: 'Credenciais inválidas'
                });
            }

            const senhaValida = await bcrypt.compare(senha, user.senha);
            if (!senhaValida) {
                return res.status(401).json({
                    success: false,
                    error: 'Credenciais inválidas'
                });
            }

            // Cria sessão segura (retorna token e session_id)
            const { token, sessionId } = await SessionManager.createSession(user, req);

            // Log de auditoria com session_id
            await db.query(
                `INSERT INTO audit_logs (session_id, user_id, action, resource, ip_address, user_agent, status)
                 VALUES ($1, $2, 'user_login', 'session', $3, $4, 'success')`,
                [sessionId, user.id, req.clientIp, req.headers['user-agent']]
            );

            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    nome: user.nome,
                    email: user.email
                },
                risk_score: req.riskAnalysis ? req.riskAnalysis.score : 0
            });

        } catch (err) {
            console.error('Erro no login:', err);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: 'Não foi possível fazer login'
            });
        }
    }

    static async logout(req, res) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (token) {
                await SessionManager.revokeSession(token);
            }

            // Log de auditoria com session_id
            await db.query(
                `INSERT INTO audit_logs (session_id, user_id, action, resource, ip_address, user_agent, status)
                 VALUES ($1, $2, 'user_logout', 'session', $3, $4, 'success')`,
                [req.sessionId, req.authenticatedUserId, req.clientIp, req.headers['user-agent']]
            );

            res.json({ success: true, message: 'Logout realizado com sucesso' });
        } catch (err) {
            console.error('Erro no logout:', err);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
}

module.exports = AuthController;
