require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Middlewares
const fingerprintMiddleware = require('./middleware/fingerprintMiddleware');
const antifraudMiddleware = require('./middleware/antifraudMiddleware');
const authMiddleware = require('./middleware/authMiddleware');

// Controllers
const AuthController = require('./controllers/authController');
const ItemsController = require('./controllers/itemsController');
const OrdersController = require('./controllers/ordersController');

const app = express();

// Segurança básica
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP
    message: { error: 'Too many requests, please try again later' }
});
app.use(limiter);

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middlewares customizados
app.use(fingerprintMiddleware);
app.use(antifraudMiddleware);

// Rotas públicas
app.post('/api/usuarios', AuthController.register);
app.post('/api/login', AuthController.login);
app.get('/api/itens', ItemsController.list);

// Rotas protegidas
app.use('/api/pedidos', authMiddleware);
app.use('/api/logout', authMiddleware);

app.post('/api/pedidos', OrdersController.create);
app.get('/api/pedidos', OrdersController.list);
app.post('/api/logout', AuthController.logout);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({ 
        error: 'Erro interno do servidor',
        requestId: req.headers['x-request-id'] || 'unknown'
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🔒 Sistema antifraude ativo`);
    console.log(`📊 Logs estruturados para Kibana habilitados`);
});
