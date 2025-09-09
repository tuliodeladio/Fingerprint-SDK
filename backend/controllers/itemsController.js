// backend/controllers/itemsController.js
const db = require('../config/database');

exports.list = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM itens WHERE ativo = TRUE');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao listar itens", detalhes: err.message });
  }
};
