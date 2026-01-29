const API_URL = "https://script.google.com/macros/s/AKfycbyrEhqu0mSebN0ot74wk1CHEMrSRjmTyTHjqsdx1a6Sk80sqfZ_M14SpjStRDCRFl_92w/exec";
const CLIENT_ID = "198835";
// URL do seu site no GitHub Pages
const GITHUB_URL = "https://willwebsolucoestecnologicas-jpg.github.io/lgrun/";

// Agora o redirecionamento aponta para o GitHub primeiro, para que o Strava valide o domínio corretamente
const AUTH_URL = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${GITHUB_URL}&approval_prompt=force&scope=read,activity:read_all`;

const rankingBody = document.getElementById('ranking-body');
const loader = document.getElementById('loader');

// Função para capturar o código do Strava na URL e enviar ao Google Sheets
async function processarRetornoStrava() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        loader.classList.remove('hidden');
        try {
            // Envia o código temporário para o seu Google Script salvar o Refresh Token
            const response = await fetch(`${API_URL}?code=${code}`);
            const result = await response.json();
            
            if (result.success) {
                alert("Sucesso! Você agora faz parte do LG Run.");
                // Limpa a URL para não processar o mesmo código duas vezes
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (error) {
            console.error("Erro ao processar cadastro:", error);
        } finally {
            loader.classList.add('hidden');
            carregarRanking();
        }
    }
}

async function carregarRanking() {
    loader.classList.remove('hidden');
    try {
        const response = await fetch(`${API_URL}?action=getRanking`);
        const data = await response.json();
        
        rankingBody.innerHTML = data.map((item, index) => `
            <tr>
                <td class="col-pos">${index + 1}º</td>
                <td>${item.atleta}</td>
                <td class="col-km">${item.totalKm} km</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error("Erro ao carregar:", error);
    } finally {
        loader.classList.add('hidden');
    }
}

document.getElementById('btn-participar').onclick = () => {
    window.location.href = AUTH_URL;
};

document.getElementById('btn-sync').onclick = async () => {
    loader.classList.remove('hidden');
    try {
        const res = await fetch(`${API_URL}?action=syncAll`);
        const result = await res.json();
        alert(`Sincronização concluída com sucesso!`);
        carregarRanking();
    } catch (e) {
        alert("Erro na sincronização.");
    } finally {
        loader.classList.add('hidden');
    }
};

window.onload = () => {
    processarRetornoStrava();
    carregarRanking();
};
