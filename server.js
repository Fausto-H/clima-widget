// server.js
require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env
const express = require('express');
const axios = require('axios'); // Para fazer requisições HTTP para a API externa

const app = express();
const PORT = process.env.PORT || 3003; // Usa a porta definida pelo ambiente ou 3003
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY; // Sua chave de API

// Middleware para CORS (permite que outras aplicações acessem sua API)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Permite acesso de qualquer origem
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Middleware para processar JSON (se você fosse ter requisições POST/PUT)
// app.use(express.json()); // Não é estritamente necessário para esta API simples, mas boa prática

// --- Rota da API de Clima ---
// Ex: GET /clima?cidade=Sao%20Paulo
app.get('/clima', async (req, res) => {
    const cidade = req.query.cidade;

    if (!cidade) {
        return res.status(400).json({ error: 'Parâmetro "cidade" é obrigatório.' });
    }

    if (!OPENWEATHER_API_KEY) {
        console.error('OPENWEATHER_API_KEY não definida no .env');
        return res.status(500).json({ error: 'Chave de API do clima não configurada no servidor.' });
    }

    try {
        // Requisição para a API externa do OpenWeatherMap
        const response = await axios.get(`http://api.openweathermap.org/data/2.5/weather`, {
            params: {
                q: cidade,
                appid: OPENWEATHER_API_KEY,
                units: 'metric', // Para temperatura em Celsius
                lang: 'pt_br' // Para descrição em português
            }
        });

        const dadosClima = response.data;

        // --- Transformação dos dados para retornar ao cliente ---
        const climaSimplificado = {
            cidade: dadosClima.name,
            pais: dadosClima.sys.country,
            temperatura: dadosClima.main.temp,
            sensacaoTermica: dadosClima.main.feels_like,
            umidade: dadosClima.main.humidity,
            descricao: dadosClima.weather[0].description,
            icone: `http://openweathermap.org/img/wn/${dadosClima.weather[0].icon}.png`
        };

        res.json(climaSimplificado);

    } catch (error) {
        if (error.response) {
            // A requisição foi feita e o servidor respondeu com um status de erro
            console.error('Erro da API externa:', error.response.data);
            res.status(error.response.status).json({
                error: error.response.data.message || 'Erro ao buscar dados do clima na API externa.'
            });
        } else if (error.request) {
            // A requisição foi feita, mas nenhuma resposta foi recebida
            console.error('Nenhuma resposta recebida da API externa:', error.request);
            res.status(500).json({ error: 'Serviço de clima externo indisponível.' });
        } else {
            // Algo aconteceu na configuração da requisição que disparou um Erro
            console.error('Erro ao configurar requisição para API externa:', error.message);
            res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    }
});

// Rota padrão (opcional)
app.get('/', (req, res) => {
    res.send('Minha API de Clima está funcionando! Tente /clima?cidade=NomeDaCidade');
});


// Inicia o servidor
app.listen(PORT, () => {
    console.log(`API de Clima rodando em http://localhost:${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}/clima?cidade=Sao%20Paulo`);
});