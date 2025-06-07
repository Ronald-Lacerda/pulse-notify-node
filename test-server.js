// Script de teste para verificar se o servidor está funcionando
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001; // Porta diferente para teste

app.use(cors());
app.use(express.json());

// Teste simples
app.get('/test', (req, res) => {
    res.json({ message: 'Servidor de teste funcionando!' });
});

app.post('/api/admin/login', (req, res) => {
    console.log('Endpoint de login chamado:', req.body);
    res.json({ 
        success: true, 
        message: 'Endpoint funcionando',
        received: req.body 
    });
});

app.listen(PORT, () => {
    console.log(`Servidor de teste rodando na porta ${PORT}`);
    console.log(`Teste: http://localhost:${PORT}/test`);
    console.log(`Login: http://localhost:${PORT}/api/admin/login`);
});