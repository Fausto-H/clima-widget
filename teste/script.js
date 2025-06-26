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

    // URL da sua API de clima (use o IP do seu computador se for testar no celular)
    // Se estiver testando no mesmo computador que a API:
    const apiUrl = `http://localhost:3003/clima?cidade=${encodeURIComponent(cidade)}`;
    // Se estiver testando no celular (na mesma rede Wi-Fi que o PC):
    // const apiUrl = `http://192.168.111.142:3003/clima?cidade=${encodeURIComponent(cidade)}`;
    // Lembre-se de trocar o IP 192.168.111.142 pelo IP atual do seu computador!

    dadosClimaDiv.innerHTML = '<p>Buscando dados do clima...</p>'; // Mensagem de carregamento

    try {
        const response = await fetch(apiUrl); // Faz a requisição para sua API

        if (!response.ok) { // Se a resposta não for bem-sucedida (ex: 400, 404, 500)
            const errorData = await response.json(); // Tenta ler a mensagem de erro da API
            throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
        }

        const data = await response.json(); // Converte a resposta para JSON

        // --- Inserir os dados do clima no HTML ---
        dadosClimaDiv.innerHTML = `
            <h2>${data.cidade}, ${data.pais}</h2>
            <p>Temperatura: ${data.temperatura}°C</p>
            <p>Sensação térmica: ${data.sensacaoTermica}°C</p>
            <p>Umidade: ${data.umidade}%</p>
            <p>Condição: ${data.descricao}</p>
            <img src="${data.icone}" alt="Ícone do clima">
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