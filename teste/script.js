// script.js

// Obtenha referência ao elemento HTML
const dadosClimaDiv = document.getElementById('dadosClima');

// Função para buscar o clima com base nas coordenadas
async function buscarClimaPorCoordenadas(latitude, longitude) {
    //  USANDO API GRATUITA (Open-Meteo) - SEM LIMITES!
    const apiUrl = `http://localhost:3003/clima-gratis/coordenadas?lat=${latitude}&lon=${longitude}`;

    console.log(' Buscando clima por coordenadas:', latitude, longitude);
    console.log(' URL da API:', apiUrl);
    
    dadosClimaDiv.innerHTML = '<p>Buscando dados do clima...</p>'; // Mensagem de carregamento

    try {
        const response = await fetch(apiUrl); // Faz a requisição para sua API

        if (!response.ok) { // Se a resposta não for bem-sucedida (ex: 400, 404, 500)
            const errorData = await response.json(); // Tenta ler a mensagem de erro da API
            throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
        }

        const data = await response.json(); // Converte a resposta para JSON
        
        console.log(' Resposta completa da API:', data);
        console.log(' Coordenadas na resposta:', data.coordenadas);
        console.log(' Coordenadas originais do usuário:', latitude, longitude);

        // --- Inserir os dados do clima no HTML ---
        const fonteInfo = data.fonte ? `<p><small>Fonte: ${data.fonte}</small></p>` : '';
        const ventoInfo = data.ventoVelocidade ? `<p>Vento: ${data.ventoVelocidade} km/h</p>` : '';
        
        // SEMPRE usar as coordenadas originais do usuário para garantir precisão
        const coordenadasInfo = `<p><small>Coordenadas: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}</small></p>`;
        
        // Verificar se a resposta é do Open-Meteo (emoji) ou OpenWeather (URL)
        const tipoResposta = typeof data.icone === 'string' && data.icone.includes('http') ? 'OpenWeather' : 'Open-Meteo';
        const iconeExibir = typeof data.icone === 'string' && data.icone.includes('http') ? 
            `<img src="${data.icone}" alt="Ícone do clima" style="width: 50px; height: 50px;">` : 
            `<div style="font-size: 3em; margin: 10px 0;">${data.icone}</div>`;

        dadosClimaDiv.innerHTML = `
            <h2>${data.cidade}, ${data.pais}</h2>
            ${iconeExibir}
            <p><strong>🌡️ ${data.temperatura}°C</strong></p>
            <p>Sensação: ${data.sensacaoTermica}°C</p>
            <p>Umidade: ${data.umidade}%</p>
            ${ventoInfo}
            <p>${data.descricao}</p>
            ${coordenadasInfo}
            ${fonteInfo}
            
        `;

    } catch (error) {
        console.error('Erro ao buscar o clima:', error);
        dadosClimaDiv.innerHTML = `<p style="color: red;">Erro ao buscar o clima: ${error.message}</p>`;
    }
}

// Função para obter a localização do usuário
function obterLocalizacao() {
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            // Sucesso ao obter localização
            function(position) {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                console.log('Localização obtida:', latitude, longitude);
                buscarClimaPorCoordenadas(latitude, longitude);
            },
            // Erro ao obter localização
            function(error) {
                console.error('Erro ao obter localização:', error);
                let mensagemErro = '';
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        mensagemErro = 'Permissão negada para acessar a localização. Por favor, permita o acesso à localização nas configurações do navegador.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        mensagemErro = 'Informações de localização não estão disponíveis.';
                        break;
                    case error.TIMEOUT:
                        mensagemErro = 'Tempo limite para obter a localização foi excedido.';
                        break;
                    default:
                        mensagemErro = 'Erro desconhecido ao tentar obter a localização.';
                        break;
                }
                
                dadosClimaDiv.innerHTML = `
                    <p style="color: red;">${mensagemErro}</p>
                    <p><small>Carregando clima de Fortaleza como padrão...</small></p>
                `;
                
                // Como fallback, busca clima de Fortaleza
                setTimeout(() => {
                    buscarClimaPorCidade('Fortaleza');
                }, 2000);
            },
            // Opções para obter localização
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 600000 // 10 minutos de cache
            }
        );
    } else {
        dadosClimaDiv.innerHTML = `
            <p style="color: red;">Seu navegador não suporta geolocalização.</p>
            <p><small>Carregando clima de Fortaleza como padrão...</small></p>
        `;
        
        // Como fallback, busca clima de Fortaleza
        setTimeout(() => {
            buscarClimaPorCidade('Fortaleza');
        }, 2000);
    }
}

// Função fallback para buscar por nome da cidade
async function buscarClimaPorCidade(cidade) {
    const apiUrl = `http://localhost:3003/clima-gratis?cidade=${encodeURIComponent(cidade)}`;

    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
        }

        const data = await response.json();

        const fonteInfo = data.fonte ? `<p><small>Fonte: ${data.fonte}</small></p>` : '';
        const ventoInfo = data.ventoVelocidade ? `<p>Vento: ${data.ventoVelocidade} km/h</p>` : '';
        const coordenadasInfo = data.coordenadas ? 
            `<p><small>Coordenadas: ${data.coordenadas.lat.toFixed(4)}, ${data.coordenadas.lon.toFixed(4)}</small></p>` : '';

        dadosClimaDiv.innerHTML = `
            <h2>${data.cidade}, ${data.pais}</h2>
            <div style="font-size: 3em; margin: 10px 0;">${data.icone}</div>
            <p><strong>🌡️ ${data.temperatura}°C</strong></p>
            <p>Sensação: ${data.sensacaoTermica}°C</p>
            <p>Umidade: ${data.umidade}%</p>
            ${ventoInfo}
            <p>${data.descricao}</p>
            ${coordenadasInfo}
            ${fonteInfo}
        `;

    } catch (error) {
        console.error('Erro ao buscar o clima:', error);
        dadosClimaDiv.innerHTML = `<p style="color: red;">Erro ao buscar o clima: ${error.message}</p>`;
    }
}

// Inicia a busca de localização quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    obterLocalizacao();
});