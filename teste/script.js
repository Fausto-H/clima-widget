// script.js

// Obtenha referências aos elementos HTML
const cidadeInput = document.getElementById('cidadeInput');
const buscarClimaBtn = document.getElementById('buscarClimaBtn');
const dadosClimaDiv = document.getElementById('dadosClima');

// Adicione um "escutador" de eventos ao botão de buscar
buscarClimaBtn.addEventListener('click', async () => {
    const cidade = cidadeInput.value; // Pega o valor digitado no input

    if (!cidade) {
        dadosClimaDiv.innerHTML = '<p>Por favor, digite o nome de uma cidade.</p>';
        return;
    }

    // 🆓 USANDO API GRATUITA (Open-Meteo) - SEM LIMITES!
    // const apiUrl = `http://localhost:3003/clima?cidade=${encodeURIComponent(cidade)}`; // API limitada
    const apiUrl = `http://localhost:3003/clima-gratis?cidade=${encodeURIComponent(cidade)}`; // API gratuita

    dadosClimaDiv.innerHTML = '<p>Buscando dados do clima...</p>'; // Mensagem de carregamento

    try {
        const response = await fetch(apiUrl); // Faz a requisição para sua API

        if (!response.ok) { // Se a resposta não for bem-sucedida (ex: 400, 404, 500)
            const errorData = await response.json(); // Tenta ler a mensagem de erro da API
            throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
        }

        const data = await response.json(); // Converte a resposta para JSON

        // --- Inserir os dados do clima no HTML ---
        const fonteInfo = data.fonte ? `<p><small>📡 Fonte: ${data.fonte}</small></p>` : '';
        const ventoInfo = data.ventoVelocidade ? `<p>💨 Vento: ${data.ventoVelocidade} km/h</p>` : '';
        const coordenadasInfo = data.coordenadas ? 
            `<p><small>📍 Coordenadas: ${data.coordenadas.lat.toFixed(4)}, ${data.coordenadas.lon.toFixed(4)}</small></p>` : '';

        dadosClimaDiv.innerHTML = `
            <h2>${data.cidade}, ${data.pais}</h2>
            <div style="font-size: 3em; margin: 10px 0;">${data.icone}</div>
            <p><strong>🌡️ ${data.temperatura}°C</strong></p>
            <p>🤔 Sensação: ${data.sensacaoTermica}°C</p>
            <p>💧 Umidade: ${data.umidade}%</p>
            ${ventoInfo}
            <p>☁️ ${data.descricao}</p>
            ${coordenadasInfo}
            ${fonteInfo}
        `;

    } catch (error) {
        console.error('Erro ao buscar o clima:', error);
        dadosClimaDiv.innerHTML = `<p style="color: red;">Erro ao buscar o clima: ${error.message}</p>`;
    }
});

// Opcional: Carregar o clima de uma cidade padrão ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    cidadeInput.value = 'Fortaleza'; // Define uma cidade padrão
    buscarClimaBtn.click(); // Simula um clique no botão para carregar o clima inicial
});