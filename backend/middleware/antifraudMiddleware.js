const db = require('../config/database.js');
const RiskEngine = require('../utils/riskEngine');

module.exports = async function antifraudMiddleware(req, res, next) {
  try {
    let sessionId = null;
    let userId = null;
    let email = null;

    // 1. PRIORITY: Buscar sessão ativa pelo token (rotas autenticadas)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const { rows: sessionRows } = await db.query(
          `SELECT id, user_id FROM user_sessions 
           WHERE session_token = $1 AND is_active = true AND expires_at > NOW()`,
          [token]
        );
        if (sessionRows.length > 0) {
          sessionId = sessionRows[0].id;
          userId = sessionRows[0].user_id;
          
          // Buscar email do usuário
          const { rows: userRows } = await db.query(
            'SELECT email FROM usuarios WHERE id = $1',
            [userId]
          );
          if (userRows.length > 0) {
            email = userRows[0].email;
          }
        }
      } catch (err) {
        console.log('Token inválido no antifraud:', err.message);
      }
    }

    // 2. FALLBACK: Para login/cadastro sem sessão, usar email do body
    if (!sessionId && req.body && req.body.email) {
      email = req.body.email;
    }

    const ip = req.clientIp;
    const fingerprint = req.fingerprint || {};
    const feature = req.feature;
    const userAgent = req.headers['user-agent'] || '';

    // 3. Buscar histórico baseado em prioridade: session_id > user_id > email
    let historicalData = [];
    if (sessionId) {
      // Histórico da sessão atual
      const { rows } = await db.query(
        'SELECT * FROM fingerprint_logs WHERE session_id = $1 ORDER BY event_time DESC LIMIT 10',
        [sessionId]
      );
      historicalData = rows;
      
      // Se não tem dados da sessão, busca do usuário
      if (historicalData.length === 0 && userId) {
        const { rows: userRows } = await db.query(
          'SELECT * FROM fingerprint_logs WHERE user_id = $1 ORDER BY event_time DESC LIMIT 15',
          [userId]
        );
        historicalData = userRows;
      }
    } else if (userId) {
      const { rows } = await db.query(
        'SELECT * FROM fingerprint_logs WHERE user_id = $1 ORDER BY event_time DESC LIMIT 20',
        [userId]
      );
      historicalData = rows;
    } else if (email) {
      const { rows } = await db.query(
        'SELECT * FROM fingerprint_logs WHERE email = $1 ORDER BY event_time DESC LIMIT 20',
        [email]
      );
      historicalData = rows;
    }

    // 4. Buscar todas as sessões do usuário para detecção de hijacking
    let sessionData = [];
    if (userId) {
      const { rows } = await db.query(
        'SELECT * FROM user_sessions WHERE user_id = $1 AND is_active = true',
        [userId]
      );
      sessionData = rows;
    }

    // 5. Anexar informações à request para controllers
    req.sessionId = sessionId;
    req.authenticatedUserId = userId;

    // 6. Calcular score de risco
    const riskAnalysis = RiskEngine.calculateRiskScore({
      sessionId,
      userId,
      ip,
      fingerprint,
      feature,
      historicalData,
      sessionData
    });

    // 7. Log estruturado para Kibana/Elastic
    const logEntry = {
      '@timestamp': req.timestamp || new Date().toISOString(),
      event: {
        category: 'security',
        type: 'authentication',
        action: feature
      },
      session: { 
        id: sessionId,
        active_sessions: sessionData.length 
      },
      user: { 
        id: userId, 
        email 
      },
      source: { 
        ip, 
        user_agent: userAgent 
      },
      fingerprint,
      risk: {
        score: riskAnalysis.score,
        level: riskAnalysis.level,
        factors: riskAnalysis.factors,
        blocked: riskAnalysis.shouldBlock
      }
    };
    console.log(JSON.stringify(logEntry));

    // 8. Salvar no banco (session_id é o campo principal)
    await db.query(
      `INSERT INTO fingerprint_logs
       (session_id, user_id, email, ip_address, feature, fingerprint_json, user_agent,
        risk_score, risk_level, is_blocked, risk_factors, event_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [
        sessionId,
        userId,
        email,
        ip,
        feature,
        fingerprint,
        userAgent,
        riskAnalysis.score,
        riskAnalysis.level,
        riskAnalysis.shouldBlock,
        riskAnalysis.factors
      ]
    );

    // 9. Bloquear se necessário
    if (riskAnalysis.shouldBlock) {
      return res.status(403).json({
        error: 'Access blocked due to suspicious activity',
        risk_score: riskAnalysis.score,
        factors: riskAnalysis.factors,
        message: 'Your request has been flagged as potentially fraudulent'
      });
    }

    req.riskAnalysis = riskAnalysis;
    next();

  } catch (err) {
    console.error('Erro no antifraudMiddleware:', err);
    next(); // Continua execução
  }
};
