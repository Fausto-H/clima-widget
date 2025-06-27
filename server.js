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

// --- ROTA: Clima gratuito por coordenadas (DEVE VIR ANTES da rota /clima-gratis) ---
// Ex: GET /clima-gratis/coordenadas?lat=-23.5505&lon=-46.6333
app.get('/clima-gratis/coordenadas', async (req, res) => {
    const { lat, lon } = req.query;
    
    console.log('🔍 ROTA /clima-gratis/coordenadas CHAMADA!');
    console.log('📍 Parâmetros recebidos - lat:', lat, 'lon:', lon);

    if (!lat || !lon) {
        console.log('❌ Erro: Parâmetros lat/lon não fornecidos');
        return res.status(400).json({ 
            error: 'Parâmetros "lat" (latitude) e "lon" (longitude) são obrigatórios.' 
        });
    }

    try {
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);
        
        console.log('🌍 Coordenadas parseadas:', latitude, longitude);

        // Buscar dados do clima usando Open-Meteo
        const weatherResponse = await axios.get(`https://api.open-meteo.com/v1/forecast`, {
            params: {
                latitude,
                longitude,
                current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
                timezone: 'auto',
                forecast_days: 1
            }
        });

        const weatherData = weatherResponse.data.current;
        
        // Obter nome da cidade pelas coordenadas (reverse geocoding)
        let cidadeInfo = { display_name: `Lat: ${latitude}, Lon: ${longitude}` };
        try {
            const geocodeResponse = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
                params: {
                    lat: latitude,
                    lon: longitude,
                    format: 'json',
                    'accept-language': 'pt-BR,pt'
                },
                headers: {
                    'User-Agent': 'Clima-API/1.0 (teste)'
                }
            });
            if (geocodeResponse.data) {
                cidadeInfo = geocodeResponse.data;
            }
        } catch (geoError) {
            console.log('Erro ao buscar nome da cidade, usando coordenadas');
        }

        const weatherDescriptions = {
            0: 'Céu limpo', 1: 'Principalmente limpo', 2: 'Parcialmente nublado', 3: 'Nublado',
            45: 'Névoa', 48: 'Névoa com geada', 51: 'Garoa leve', 53: 'Garoa moderada', 55: 'Garoa intensa',
            61: 'Chuva leve', 63: 'Chuva moderada', 65: 'Chuva intensa',
            80: 'Pancadas de chuva leves', 81: 'Pancadas de chuva moderadas', 82: 'Pancadas de chuva intensas',
            95: 'Tempestade', 96: 'Tempestade com granizo leve', 99: 'Tempestade com granizo intenso'
        };

        const getWeatherIcon = (code) => {
            if (code === 0 || code === 1) return '☀️';
            if (code === 2 || code === 3) return '⛅';
            if (code >= 45 && code <= 48) return '🌫️';
            if (code >= 51 && code <= 65) return '🌧️';
            if (code >= 80 && code <= 82) return '🌦️';
            if (code >= 95) return '⛈️';
            return '🌤️';
        };

        // Processar o display_name para extrair bairro e município
        function extrairBairroMunicipio(displayName) {
            console.log('🏠 Display name completo:', displayName);
            
            const partes = displayName.split(',').map(parte => parte.trim());
            console.log('📍 Partes do endereço:', partes);
            
            // Formato típico: "Logradouro, Bairro, Município, Estado, País"
            // Queremos: "Bairro, Município" 
            
            if (partes.length >= 3) {
                // Pega o bairro (segunda parte) e município (terceira parte)
                const bairro = partes[1] || '';
                const municipio = partes[2] || '';
                const resultado = bairro && municipio ? `${bairro}, ${municipio}` : municipio || bairro || partes[0];
                console.log('🏘️ Resultado extraído:', resultado);
                return resultado;
            } else if (partes.length >= 2) {
                // Se não tem bairro, usa município e estado
                return `${partes[0]}, ${partes[1]}`;
            } else {
                // Fallback para o primeiro elemento
                return partes[0] || 'Localização não identificada';
            }
        }

        const localidadeFormatada = extrairBairroMunicipio(cidadeInfo.display_name);

        const climaSimplificado = {
            cidade: localidadeFormatada,
            pais: cidadeInfo.display_name.split(',').pop().trim(),
            temperatura: Math.round(weatherData.temperature_2m * 10) / 10,
            sensacaoTermica: Math.round(weatherData.temperature_2m * 10) / 10,
            umidade: weatherData.relative_humidity_2m,
            descricao: weatherDescriptions[weatherData.weather_code] || 'Condição desconhecida',
            icone: getWeatherIcon(weatherData.weather_code),
            ventoVelocidade: weatherData.wind_speed_10m,
            coordenadas: { lat: latitude, lon: longitude },
            fonte: 'Open-Meteo (Gratuito)',
            horario: weatherData.time
        };

        console.log('✅ Resposta da rota coordenadas:', climaSimplificado);
        res.json(climaSimplificado);

    } catch (error) {
        console.error('Erro ao buscar clima por coordenadas:', error.message);
        res.status(500).json({ 
            error: 'Erro ao buscar clima por coordenadas.',
            message: error.message 
        });
    }
});

// --- NOVA ROTA: Clima GRATUITO usando Open-Meteo API ---
// Ex: GET /clima-gratis?cidade=Sao%20Paulo
app.get('/clima-gratis', async (req, res) => {
    const cidade = req.query.cidade;

    if (!cidade) {
        return res.status(400).json({ error: 'Parâmetro "cidade" é obrigatório.' });
    }

    try {
        // 1. Primeiro, obter coordenadas da cidade usando Nominatim (OpenStreetMap - gratuito)
        console.log(`Buscando coordenadas para: ${cidade}`);
        const geocodeResponse = await axios.get(`https://nominatim.openstreetmap.org/search`, {
            params: {
                q: cidade,
                format: 'json',
                limit: 1,
                'accept-language': 'pt-BR,pt'
            },
            headers: {
                'User-Agent': 'Clima-API/1.0 (teste)'
            }
        });

        if (!geocodeResponse.data || geocodeResponse.data.length === 0) {
            return res.status(404).json({ 
                error: `Cidade "${cidade}" não encontrada.`,
                sugestao: 'Tente usar o nome completo da cidade ou inclua o estado/país.'
            });
        }

        const location = geocodeResponse.data[0];
        const lat = parseFloat(location.lat);
        const lon = parseFloat(location.lon);

        console.log(`Coordenadas encontradas: ${lat}, ${lon} para ${location.display_name}`);

        // 2. Buscar dados do clima usando Open-Meteo (gratuito e sem limites)
        const weatherResponse = await axios.get(`https://api.open-meteo.com/v1/forecast`, {
            params: {
                latitude: lat,
                longitude: lon,
                current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
                timezone: 'auto',
                forecast_days: 1
            }
        });

        const weatherData = weatherResponse.data.current;
        
        // 3. Converter código do tempo para descrição em português
        const weatherDescriptions = {
            0: 'Céu limpo',
            1: 'Principalmente limpo',
            2: 'Parcialmente nublado',
            3: 'Nublado',
            45: 'Névoa',
            48: 'Névoa com geada',
            51: 'Garoa leve',
            53: 'Garoa moderada',
            55: 'Garoa intensa',
            61: 'Chuva leve',
            63: 'Chuva moderada',
            65: 'Chuva intensa',
            80: 'Pancadas de chuva leves',
            81: 'Pancadas de chuva moderadas',
            82: 'Pancadas de chuva intensas',
            95: 'Tempestade',
            96: 'Tempestade com granizo leve',
            99: 'Tempestade com granizo intenso'
        };

        // 4. Determinar ícone baseado no código do tempo
        const getWeatherIcon = (code) => {
            if (code === 0 || code === 1) return '☀️';
            if (code === 2 || code === 3) return '⛅';
            if (code >= 45 && code <= 48) return '🌫️';
            if (code >= 51 && code <= 65) return '🌧️';
            if (code >= 80 && code <= 82) return '🌦️';
            if (code >= 95) return '⛈️';
            return '🌤️';
        };

        // Processar o display_name para extrair bairro e município
        function extrairBairroMunicipio(displayName) {
            console.log('🏠 Display name completo:', displayName);
            
            const partes = displayName.split(',').map(parte => parte.trim());
            console.log('📍 Partes do endereço:', partes);
            
            // Formato típico: "Logradouro, Bairro, Município, Estado, País"
            // Queremos: "Bairro, Município" 
            
            if (partes.length >= 3) {
                // Pega o bairro (segunda parte) e município (terceira parte)
                const bairro = partes[1] || '';
                const municipio = partes[2] || '';
                const resultado = bairro && municipio ? `${bairro}, ${municipio}` : municipio || bairro || partes[0];
                console.log('🏘️ Resultado extraído:', resultado);
                return resultado;
            } else if (partes.length >= 2) {
                // Se não tem bairro, usa município e estado
                return `${partes[0]}, ${partes[1]}`;
            } else {
                // Fallback para o primeiro elemento
                return partes[0] || 'Localização não identificada';
            }
        }

        const localidadeFormatada = extrairBairroMunicipio(location.display_name);

        const climaSimplificado = {
            cidade: localidadeFormatada,
            pais: location.display_name.split(',').pop().trim(), // País
            temperatura: Math.round(weatherData.temperature_2m * 10) / 10, // Arredonda para 1 decimal
            sensacaoTermica: Math.round(weatherData.temperature_2m * 10) / 10, // Open-Meteo não tem feels_like
            umidade: weatherData.relative_humidity_2m,
            descricao: weatherDescriptions[weatherData.weather_code] || 'Condição desconhecida',
            icone: getWeatherIcon(weatherData.weather_code),
            ventoVelocidade: weatherData.wind_speed_10m,
            coordenadas: { lat, lon },
            fonte: 'Open-Meteo (Gratuito)',
            horario: weatherData.time
        };

        console.log('Dados do clima obtidos com sucesso:', climaSimplificado.cidade);
        res.json(climaSimplificado);

    } catch (error) {
        console.error('Erro ao buscar clima gratuito:', error.message);
        
        if (error.response) {
            console.error('Detalhes do erro:', error.response.data);
            res.status(error.response.status).json({
                error: 'Erro ao consultar serviço de clima gratuito.',
                detalhes: error.response.data
            });
        } else if (error.request) {
            res.status(500).json({ 
                error: 'Serviço de clima gratuito indisponível no momento.' 
            });
        } else {
            res.status(500).json({ 
                error: 'Erro interno do servidor.',
                message: error.message 
            });
        }
    }
});

// Rota padrão (opcional)
app.get('/', (req, res) => {
    res.json({
        message: '🌤️ API de Clima funcionando!',
        'APIs Disponíveis': {
            '🆓 GRATUITAS (Recomendado)': {
                'Por cidade': '/clima-gratis?cidade=NomeDaCidade',
                'Por coordenadas': '/clima-gratis/coordenadas?lat=-23.5505&lon=-46.6333'
            },
            '🔑 OpenWeatherMap (Limitado)': {
                'Por cidade': '/clima?cidade=NomeDaCidade',
                'Por localização automática (IP)': '/clima/auto',
                'Por coordenadas': '/clima/coordenadas?lat=-23.5505&lon=-46.6333'
            }
        },
        exemplos: {
            '🆓 Gratuito': 'http://localhost:3003/clima-gratis?cidade=Sao%20Paulo',
            '🔑 Limitado': 'http://localhost:3003/clima?cidade=Sao%20Paulo'
        },
        nota: 'Use as rotas /clima-gratis para evitar limites de API!'
    });
});


// Inicia o servidor
app.listen(PORT, () => {
    console.log(`API de Clima rodando em http://localhost:${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}/clima?cidade=Sao%20Paulo`);
});