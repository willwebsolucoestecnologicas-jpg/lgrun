// Configurações do seu projeto
const API_URL = "https://script.google.com/macros/s/AKfycbyrEhqu0mSebN0ot74wk1CHEMrSRjmTyTHjqsdx1a6Sk80sqfZ_M14SpjStRDCRFl_92w/exec";
const CLIENT_ID = "198835";
// URL exata do seu projeto no GitHub
const GITHUB_URL = "https://willwebsolucoestecnologicas-jpg.github.io/lgrun/";

// Link de autorização apontando para o seu GitHub como retorno
const AUTH_URL = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${GITHUB_URL}&approval_prompt=force&scope=read,activity:read_all`;

const rankingBody = document.getElementById('ranking-body');
const loader = document.getElementById('loader');

/**
 * Verifica se o usuário acabou de voltar da autorização do Strava
 * Se houver um 'code' na URL, envia para o Google Script salvar o atleta
 */
async function processarRetornoStrava() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        if (loader) loader.classList.remove('hidden');
        try {
            // Envia o código para o backend processar o Refresh Token
            const response = await fetch(`${API_URL}?code=${code}`);
            const result = await response.json();
            
            if (result.success) {
                alert(`Sucesso! Bem-vindo ao LG Run, ${result.atleta}!`);
                // Limpa o 'code' da barra de endereço para não repetir o processo
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                console.error("Erro no cadastro:", result.error);
            }
        } catch (error) {
            console.error("Erro na comunicação com o servidor:", error);
        } finally {
            if (loader) loader.classList.add('hidden');
            carregarRanking();
        }
    }
}

/**
 * Busca os dados consolidados da planilha e monta a tabela de ranking
 */
async function carregarRanking() {
    if (loader) loader.classList.remove('hidden');
    try {
        const response = await fetch(`${API_URL}?action=getRanking`);
        const data = await response.json();
        
        if (rankingBody) {
            rankingBody.innerHTML = data.map((item, index) => `
                <tr>
                    <td class="col-pos">${index + 1}º</td>
                    <td>${item.atleta}</td>
                    <td class="col-km">${item.totalKm} km</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error("Erro ao carregar o ranking:", error);
    } finally {
        if (loader) loader.classList.add('hidden');
    }
}

// Botão "Participar do Desafio"
const btnParticipar = document.getElementById('btn-participar');
if (btnParticipar) {
    btnParticipar.onclick = () => {
        window.location.href = AUTH_URL;
    };
}

// Botão "Sincronizar Ranking" (Força a atualização manual)
const btnSync = document.getElementById('btn-sync');
if (btnSync) {
    btnSync.onclick = async () => {
        if (loader) loader.classList.remove('hidden');
        try {
            const res = await fetch(`${API_URL}?action=syncAll`);
            const result = await res.json();
            alert(`Sincronização concluída!`);
            carregarRanking();
        } catch (e) {
            alert("Erro ao sincronizar. Tente novamente mais tarde.");
        } finally {
            if (loader) loader.classList.add('hidden');
        }
    };
}

// Inicia as funções ao carregar a página
window.onload = () => {
    processarRetornoStrava();
    carregarRanking();
};
