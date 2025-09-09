const SessionManager = require('../auth/sessionManager');

module.exports = async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: 'Token de acesso requerido',
                code: 'MISSING_TOKEN'
            });
        }

        const token = authHeader.split(' ')[1];
        const user = await SessionManager.validateSession(token, req);
        
        req.user = user;
        req.sessionToken = token;
        next();

    } catch (err) {
        console.error('Erro na autenticação:', err);
        return res.status(401).json({ 
            error: 'Token inválido ou expirado',
            code: 'INVALID_TOKEN'
        });
    }
};
