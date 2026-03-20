require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

const DB_PATH = path.join(__dirname, 'agendamentos.json');
const BLOQUEIOS_PATH = path.join(__dirname, 'bloqueios.json');
const BARBEIROS_PATH = path.join(__dirname, 'barbeiros.json');

if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, '[]');
if (!fs.existsSync(BLOQUEIOS_PATH)) fs.writeFileSync(BLOQUEIOS_PATH, '[]');
if (!fs.existsSync(BARBEIROS_PATH)) fs.writeFileSync(BARBEIROS_PATH, JSON.stringify([
  { nome: "Thiago", senha: "thiago123" },
  { nome: "Adriano", senha: "adriano123" },
  { nome: "Carlos", senha: "carlos123" }
]));

function lerAgendamentos() { return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')); }
function salvarAgendamentos(dados) { fs.writeFileSync(DB_PATH, JSON.stringify(dados, null, 2)); }
function lerBloqueios() { return JSON.parse(fs.readFileSync(BLOQUEIOS_PATH, 'utf-8')); }
function salvarBloqueios(dados) { fs.writeFileSync(BLOQUEIOS_PATH, JSON.stringify(dados, null, 2)); }
function lerBarbeiros() { return JSON.parse(fs.readFileSync(BARBEIROS_PATH, 'utf-8')); }
function salvarBarbeiros(dados) { fs.writeFileSync(BARBEIROS_PATH, JSON.stringify(dados, null, 2)); }

// ── Login ─────────────────────────────────────────────────

app.post('/api/login', (req, res) => {
  const { nome, senha } = req.body;
  
  // Admin
  if (nome === 'admin' && senha === 'admin123') {
    return res.json({ tipo: 'admin', nome: 'Admin' });
  }
  
  // Barbeiro
  const barbeiros = lerBarbeiros();
  const barbeiro = barbeiros.find(b => b.nome === nome && b.senha === senha);
  if (barbeiro) {
    return res.json({ tipo: 'barbeiro', nome: barbeiro.nome });
  }
  
  res.status(401).json({ erro: 'Nome ou senha incorretos.' });
});

// ── Agendamentos ──────────────────────────────────────────

app.get('/api/agendamentos', (req, res) => { res.json(lerAgendamentos()); });

app.post('/api/agendamentos', (req, res) => {
  const { nome, telefone, servico, barbeiro, data, horario } = req.body;
  if (!nome || !telefone || !servico || !barbeiro || !data || !horario)
    return res.status(400).json({ erro: 'Preencha todos os campos.' });

  const agendamentos = lerAgendamentos();
  const conflito = agendamentos.find(a => a.data === data && a.horario === horario && a.barbeiro === barbeiro && a.status !== 'cancelado');
  if (conflito) return res.status(409).json({ erro: 'Horário já reservado!' });

  const bloqueios = lerBloqueios();
  const bloqueado = bloqueios.find(b => b.data === data && b.hora === horario);
  if (bloqueado) return res.status(409).json({ erro: 'Horário bloqueado pelo barbeiro.' });

  const novo = { id: Date.now(), nome, telefone, servico, barbeiro, data, horario, status: 'pendente' };
  agendamentos.push(novo);
  salvarAgendamentos(agendamentos);
  res.status(201).json(novo);
});

app.patch('/api/agendamentos/:id', (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  const agendamentos = lerAgendamentos();
  const idx = agendamentos.findIndex(a => a.id === id);
  if (idx === -1) return res.status(404).json({ erro: 'Não encontrado.' });
  agendamentos[idx].status = status;
  salvarAgendamentos(agendamentos);
  res.json(agendamentos[idx]);
});

// ── Bloqueios ─────────────────────────────────────────────

app.get('/api/bloqueios', (req, res) => { res.json(lerBloqueios()); });

app.post('/api/bloqueios', (req, res) => {
  const { data, hora } = req.body;
  if (!data || !hora) return res.status(400).json({ erro: 'Data e hora obrigatórios.' });
  const bloqueios = lerBloqueios();
  const novo = { id: Date.now(), data, hora };
  bloqueios.push(novo);
  salvarBloqueios(bloqueios);
  res.status(201).json(novo);
});

app.delete('/api/bloqueios/:id', (req, res) => {
  const id = Number(req.params.id);
  const bloqueios = lerBloqueios().filter(b => b.id !== id);
  salvarBloqueios(bloqueios);
  res.json({ ok: true });
});

// ── Barbeiros ─────────────────────────────────────────────

app.get('/api/barbeiros', (req, res) => {
  const barbeiros = lerBarbeiros();
  res.json(barbeiros.map(b => b.nome));
});

app.post('/api/barbeiros', (req, res) => {
  const { nome, senha } = req.body;
  if (!nome || !senha) return res.status(400).json({ erro: 'Nome e senha obrigatórios.' });
  const barbeiros = lerBarbeiros();
  if (barbeiros.find(b => b.nome === nome)) return res.status(409).json({ erro: 'Barbeiro já existe.' });
  barbeiros.push({ nome, senha });
  salvarBarbeiros(barbeiros);
  res.status(201).json(barbeiros.map(b => b.nome));
});

app.patch('/api/barbeiros', (req, res) => {
  const { nomeAntigo, nomeNovo, senha } = req.body;
  if (!nomeAntigo || !nomeNovo) return res.status(400).json({ erro: 'Dados incompletos.' });
  const barbeiros = lerBarbeiros().map(b => b.nome === nomeAntigo ? { nome: nomeNovo, senha: senha || b.senha } : b);
  salvarBarbeiros(barbeiros);
  res.json(barbeiros.map(b => b.nome));
});

app.delete('/api/barbeiros/:nome', (req, res) => {
  const nome = decodeURIComponent(req.params.nome);
  const barbeiros = lerBarbeiros().filter(b => b.nome !== nome);
  salvarBarbeiros(barbeiros);
  res.json(barbeiros.map(b => b.nome));
});

// ── Status ────────────────────────────────────────────────

app.get('/api/status', (req, res) => { res.json({ ok: true }); });

app.listen(4000, function () {
  console.log('Rodando em http://localhost:4000');
});
