const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database.js');
const RiskEngine = require('../utils/riskEngine');

class SessionManager {
    static async createSession(user, req) {
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'minhasecretachave',
            { expiresIn: '2h' }
        );

        const fingerprintHash = RiskEngine.generateFingerprintHash(req.fingerprint || {});
        const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas

        // Salva sessão no banco e retorna o ID
        const { rows } = await db.query(
            `INSERT INTO user_sessions
             (user_id, session_token, fingerprint_hash, ip_address, user_agent, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [user.id, token, fingerprintHash, req.clientIp, req.headers['user-agent'], expiresAt]
        );

        const sessionId = rows[0].id;
        return { token, sessionId };
    }

    static async validateSession(token, req) {
        try {
            // Verifica JWT
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'minhasecretachave');
            
            // Verifica se sessão existe no banco
            const { rows } = await db.query(
                `SELECT * FROM user_sessions
                 WHERE session_token = $1 AND is_active = true AND expires_at > NOW()`,
                [token]
            );

            if (rows.length === 0) {
                throw new Error('Session not found or expired');
            }

            const session = rows[0];
            
            // Verifica consistência de fingerprint (detecção de hijacking)
            if (req.fingerprint) {
                const currentFpHash = RiskEngine.generateFingerprintHash(req.fingerprint);
                if (session.fingerprint_hash !== currentFpHash) {
                    // Possível session hijacking
                    await this.flagSuspiciousSession(session.id, 'fingerprint_mismatch');
                }
            }

            // Atualiza última atividade
            await db.query(
                'UPDATE user_sessions SET last_activity = NOW() WHERE id = $1',
                [session.id]
            );

            return decoded;
        } catch (err) {
            throw new Error('Invalid or compromised session');
        }
    }

    static async revokeSession(token) {
        await db.query(
            'UPDATE user_sessions SET is_active = false WHERE session_token = $1',
            [token]
        );
    }

    static async revokeAllUserSessions(userId) {
        await db.query(
            'UPDATE user_sessions SET is_active = false WHERE user_id = $1',
            [userId]
        );
    }

    static async flagSuspiciousSession(sessionId, reason) {
        await db.query(
            `INSERT INTO audit_logs (session_id, action, resource, details, created_at)
             VALUES ($1, 'session_hijacking_detected', 'session', $2, NOW())`,
            [sessionId, JSON.stringify({ session_id: sessionId, reason })]
        );
    }
}

module.exports = SessionManager;
