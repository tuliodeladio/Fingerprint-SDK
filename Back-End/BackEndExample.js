const express = require('express');
const cors = require('cors');

const app = express();
const port = 4444;

// Habilita o CORS para todas as rotas
app.use(cors());

// Habilita o parsing de JSON no corpo das requisições
app.use(express.json());

// Middleware de segurança
const securityMiddleware = (req, res, next) => {
  console.log('Middleware de Segurança Ativado.');
  
  // Exemplo de como acessar dados de segurança do corpo da requisição
  const securityData = req.body.securityPayload;
  console.log('Dados de segurança recebidos:', securityData);
  
  // Simulação de uma validação de segurança
  console.log('Validação de segurança (simulada) concluída.');
  
  // Passa para o próximo middleware ou para a rota
  next();
};

// Rota para processar o pagamento que utiliza o middleware de segurança
app.post('/api/process-payment', securityMiddleware, (req, res) => {
  const { userId, amount } = req.body.transactionData;
  
  console.log(`Processando pagamento de R$ ${amount} para o usuário ${userId}`);
  
  res.status(200).json({
    message: 'Pagamento processado com sucesso!',
    status: 'Approved'
  });
});

// Inicia o servidor na porta especificada
app.listen(port, () => {
  console.log(`Servidor de exemplo rodando em http://localhost:${port}`);
});
