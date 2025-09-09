// teste.js
// Script de carga para gerar logs de fingerprint na API

const crypto = require('crypto');
const fetch = global.fetch || require('node-fetch'); // caso fetch global não exista

// Configurações do teste
const BASE_URL = 'http://localhost:3001';
const USER_EMAIL = 'teste@example.com' + crypto.randomInt(1000);
const USER_PASSWORD = 'senha1233' + String(crypto.randomInt(1000));
const NUM_SESSIONS = 50;    // número de sessões simultâneas
const CYCLE_COUNT = 20;     // número de requisições por sessão
const DELAY_MS = 200;       // intervalo entre requisições (ms)

// Gera um fingerprint de teste
function generateFingerprintVariation() {
  return {
    userAgent: `Mozilla/5.0 (TestDevice; rv:${(Math.random()*10).toFixed(1)})`,
    platform: Math.random() > 0.5 ? 'Win32' : 'Linux x86_64',
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    random: crypto.randomBytes(4).toString('hex')
  };
}

// Delay helper
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runSession(sessionIndex) {
  console.log(`Sessão #${sessionIndex} início`);

  // 1. Login
  const loginFp = generateFingerprintVariation();
  const loginRes = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Fingerprint': Buffer.from(JSON.stringify(loginFp)).toString('base64'),
      'X-Client-IP': `192.168.0.${sessionIndex}`,
      'X-Feature-Name': 'login'
    },
    body: JSON.stringify({ email: USER_EMAIL, senha: USER_PASSWORD })
  });
  const loginData = await loginRes.json();
  if (!loginData.success) {
    console.error(`Falha login sessão #${sessionIndex}:`, loginData);
    return;
  }
  const token = loginData.token;
  console.log(`Sessão #${sessionIndex} logada`);

  // 2. Ciclo de requisições variadas
  for (let i = 0; i < CYCLE_COUNT; i++) {

    const fp = generateFingerprintVariation();
    const feature = ['listando-itens', 'finaliza-compra', 'view_orders'][i % 3];
    let url = '/api/itens', options = { method: 'GET' };

    if (feature === 'finaliza-compra') {
      url = '/api/pedidos';
      options = {
        method: 'POST',
        body: JSON.stringify({ itens: [{ id: 1, quantidade: 1 }] })
      };
    } else if (feature === 'view_orders') {
      url = '/api/pedidos';
      options = { method: 'GET' };
    }

    const res = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Fingerprint': Buffer.from(JSON.stringify(fp)).toString('base64'),
        'X-Client-IP': `192.168.0.${sessionIndex}`,
        'X-Feature-Name': feature
      }
    });

    console.log(`Sessão #${sessionIndex} ciclo ${i+1}/${CYCLE_COUNT} (${feature}) => status ${res.status}`);
    await delay(DELAY_MS);
  }

  console.log(`Sessão #${sessionIndex} fim`);
}

async function main() {
  const sessions = [];
  for (let i = 1; i <= NUM_SESSIONS; i++) {
    sessions.push(runSession(i));
    await delay(100); // espaçar logins
  }
  await Promise.all(sessions);
  console.log('Teste de carga concluído');
}

main().catch(err => console.error('Erro no teste:', err));
