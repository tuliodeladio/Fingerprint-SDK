<h1 align="center">🛡️ Fingerprint SDK Node.js – Sistema Antifraude Plugável</h1>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0-green" alt="Node version">
  <img src="https://img.shields.io/badge/database-PostgreSQL-blue" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/status-MVP%20Ready-brightgreen" alt="project status">
</p>

## 📖 Descrição

O **Fingerprint SDK** é uma solução antifraude plugável para projetos Node.js/Express e frontend JS. Ele rastreia dispositivos, controla sessões, calcula risco e bloqueia atividades suspeitas em APIs REST, com log detalhado para monitoração em Grafana/Kibana. Ideal para e-commerce, fintechs, autenticações e sistemas sensíveis.

---

## 🚀 Funcionalidades

- Captura fingerprint detalhado do navegador e aparelho do usuário
- Controle seguro de sessões JWT vinculadas ao fingerprint
- Middleware para análise e bloqueio antifraude: fácil plug & play no Express
- Score de risco customizável baseado em comportamento, fingerprints e sessões simultâneas
- Armazenamento inteligente de logs em PostgreSQL otimizados para análise
- Pronto para integração com ferramentas profissionais de monitoramento (Grafana, Kibana)

---

## 🏗️ Tecnologias

- Node.js (v18+)
- Express
- PostgreSQL
- bcryptjs, jsonwebtoken
- Suporte a Docker (em breve)
- Ferramentas de análise: Grafana, Kibana (opcional)

---

## 💻 Instalação

1. **Clone o projeto:**
git clone https://github.com/seu-usuario/fingerprint-sdk-node.git
cd fingerprint-sdk-node

text

2. **Instale as dependências:**
npm install

text

3. **Configuração do ambiente:**
Copie `.env.example` para `.env` e preencha os dados do seu PostgreSQL:

DATABASE_URL=postgresql://usuario:senha@localhost:5432/fakestore
JWT_SECRET=sua_chave_ultra_secreta

text

4. **Configure o banco de dados:**
- Execute o script SQL `db-init.sql` fornecido em `/scripts` para criar as tabelas.
- Se preferir, adapte a tabela conforme necessário.

---

## ▶️ Como usar

### 1. Backend (Node.js/Express)

**Adicione os middlewares no seu app:**
const fingerprintMiddleware = require('./middleware/fingerprintMiddleware');
const antifraudMiddleware = require('./middleware/antifraudMiddleware');

app.use(fingerprintMiddleware);
app.use(antifraudMiddleware);

// Suas rotas...

text

**Rotas recomendadas:**
- `POST /api/login` e `/api/usuarios` (registro)
- Rotas protegidas: use `authMiddleware` após antifraude

### 2. Frontend

**Inclua o SDK JS de fingerprint (consulte `/public/js/sdkFingerprintFrontend.js`). Antes de cada requisição, envie:**

fetch('/api/login', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'X-Fingerprint': btoa(JSON.stringify(SDK_Fingerprint.fingerprint)),
'X-Client-IP': SDK_Fingerprint.ip,
'X-Feature-Name': 'login'
},
body: JSON.stringify({ email, senha })
});

text
Adapte o envio em React, Angular, Vue ou Vanilla conforme desejar.

---

## ⚡ Executando localmente

npm start

ou
node index.js

text

A API estará em: [http://localhost:3001](http://localhost:3001)

---

## 🧪 Teste de Carga e Geração de Logs

Use o script `/test/teste.js` para simular usuários/sessões simultâneas:

node test/teste.js

text

O script irá simular múltiplos logins e operações, gerando logs no banco!

---

## 📊 Monitoramento com Grafana/Kibana

No painel Grafana, para visualizar o JSON de fingerprints corretamente:

SELECT
fingerprint_json::text AS fingerprint_json
FROM
fingerprint_logs
LIMIT 50;

text

Você pode filtrar, visualizar e analisar eventos de risco e fraudes facilmente!

---

## 🛠️ Personalização Avançada

- **Altere as regras de risco** no arquivo `/utils/riskEngine.js` para customizar critérios e pontuação de bloqueio.
- Use hooks do middleware para auditar ações sensíveis.

---

## 🤝 Contribuição

Pull requests são bem-vindos!  
Sugestões, formulários de bug e feedbacks podem ser abertos diretamente no GitHub.

---

## 📄 Licença

Este projeto está sob a licença MIT.

---

## 🙋 FAQ

**_Como altero os fatores de risco?_**  
> Edite `/utils/riskEngine.js`, ajuste pesos e critérios conforme seu contexto.

**_Funciona com Docker?_**  
> O banco e o app podem ser dockerizados facilmente (em breve, docker-compose.yml).

**_Integra com outros bancos?_**  
> No momento, suporte oficial é para PostgreSQL.

---

<div align="center">
  <strong>Pronto para proteger sua aplicação JS de fraudes com poucos passos!</strong>
</div>
