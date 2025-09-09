const crypto = require('crypto');

class RiskEngine {
    static calculateRiskScore(data) {
        let score = 0;
        let factors = [];
        const { sessionId, userId, ip, fingerprint, feature, historicalData, sessionData } = data;

        // 1. Análise de mudanças de IP baseada na sessão
        if (historicalData.length > 0) {
            const lastLog = historicalData[0];
            if (lastLog.ip_address && lastLog.ip_address !== ip) {
                score += 30;
                factors.push('ip_change');
            }
        }

        // 2. Análise de fingerprint
        if (historicalData.length > 0 && fingerprint) {
            const lastFp = historicalData[0].fingerprint_json;
            if (lastFp) {
                const fpChanges = this.compareFingerprints(lastFp, fingerprint);
                if (fpChanges.critical > 0) {
                    score += fpChanges.critical * 25;
                    factors.push('fingerprint_critical_change');
                }
                if (fpChanges.moderate > 0) {
                    score += fpChanges.moderate * 10;
                    factors.push('fingerprint_moderate_change');
                }
            }
        }

        // 3. Análise de velocidade de requests (por sessão)
        const recentLogs = historicalData.filter(log =>
            Date.now() - new Date(log.event_time).getTime() < 60000
        );
        if (recentLogs.length > 10) {
            score += 40;
            factors.push('high_request_velocity');
        }

        // 4. Análise de comportamento suspeito
        if (feature === 'login') {
            const recentLogins = historicalData.filter(log =>
                log.feature === 'login' &&
                Date.now() - new Date(log.event_time).getTime() < 300000
            ).length;
            if (recentLogins > 5) {
                score += 35;
                factors.push('excessive_login_attempts');
            }
        }

        // 5. Detecção de session hijacking
        if (sessionData && sessionData.length > 1) {
            const activeSessions = sessionData.filter(s => s.is_active);
            if (activeSessions.length > 3) {
                score += 50;
                factors.push('multiple_active_sessions');
            }
        }

        // 6. Análise geográfica (simulada)
        if (this.isHighRiskLocation(ip)) {
            score += 20;
            factors.push('high_risk_geo_location');
        }

        return {
            score: Math.min(score, 100),
            level: this.getRiskLevel(score),
            factors,
            shouldBlock: score >= 80
        };
    }

    static compareFingerprints(oldFp, newFp) {
        let critical = 0;
        let moderate = 0;

        if (oldFp.platform !== newFp.platform) critical++;
        if (oldFp.userAgent !== newFp.userAgent) critical++;
        if (oldFp.language !== newFp.language) moderate++;
        if (oldFp.timezone !== newFp.timezone) moderate++;

        return { critical, moderate };
    }

    static getRiskLevel(score) {
        if (score < 30) return 'low';
        if (score < 60) return 'medium';
        if (score < 80) return 'high';
        return 'critical';
    }

    static isHighRiskLocation(ip) {
        // Implementação simplificada - em produção usar serviços de geolocalização
        return false;
    }

    static generateFingerprintHash(fingerprint) {
        return crypto.createHash('sha256')
            .update(JSON.stringify(fingerprint))
            .digest('hex');
    }
}

module.exports = RiskEngine;
