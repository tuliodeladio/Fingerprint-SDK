const db = require('../config/database');

exports.create = async (req, res) => {
    try {
        const usuarioId = req.authenticatedUserId || req.user.id;
        const sessionId = req.sessionId;
        const { itens } = req.body;
        
        if (!usuarioId || !Array.isArray(itens) || itens.length === 0) {
            return res.status(400).json({ erro: "Dados inválidos" });
        }

        // Calcula total
        let total = 0;
        for (const item of itens) {
            total += item.preco * item.quantidade;
        }

        const pedido = await db.query(
            'INSERT INTO pedidos (usuario_id, data, status, total, ip_origem, session_id) VALUES ($1, NOW(), $2, $3, $4, $5) RETURNING id',
            [usuarioId, 'novo', total, req.clientIp, sessionId]
        );
        const pedidoId = pedido.rows[0].id;

        for (const item of itens) {
            await db.query(
                'INSERT INTO pedido_itens (pedido_id, item_id, quantidade, preco_unitario) VALUES ($1, $2, $3, $4)',
                [pedidoId, item.id, item.quantidade, item.preco]
            );
        }

        // Log de auditoria
        await db.query(
            `INSERT INTO audit_logs (session_id, user_id, action, resource, details, ip_address, user_agent, status)
             VALUES ($1, $2, 'order_created', 'order', $3, $4, $5, 'success')`,
            [sessionId, usuarioId, JSON.stringify({order_id: pedidoId, total}), req.clientIp, req.headers['user-agent']]
        );

        res.sendStatus(201);
    } catch (err) {
        res.status(500).json({ erro: "Erro ao criar pedido", detalhes: err.message });
    }
};

exports.list = async (req, res) => {
    try {
        const usuarioId = req.authenticatedUserId || req.user.id;
        const { rows } = await db.query(
            'SELECT id, usuario_id, data, status, total FROM pedidos WHERE usuario_id = $1 ORDER BY data DESC',
            [usuarioId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ erro: "Erro ao consultar pedidos", detalhes: err.message });
    }
};
