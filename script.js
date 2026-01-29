const API_URL = "https://script.google.com/macros/s/AKfycbyrEhqu0mSebN0ot74wk1CHEMrSRjmTyTHjqsdx1a6Sk80sqfZ_M14SpjStRDCRFl_92w/exec";
const CLIENT_ID = "198835";

// Link que envia o atleta para autorizar e ser salvo na aba "Usuários"
const AUTH_URL = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${API_URL}&approval_prompt=force&scope=read,activity:read_all`;

const rankingBody = document.getElementById('ranking-body');
const loader = document.getElementById('loader');

// Função para buscar o ranking consolidado
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

// Botão Participar
document.getElementById('btn-participar').onclick = () => {
    window.location.href = AUTH_URL;
};

// Botão Sincronizar Tudo
document.getElementById('btn-sync').onclick = async () => {
    loader.classList.remove('hidden');
    try {
        const res = await fetch(`${API_URL}?action=syncAll`);
        const result = await res.json();
        alert(`Sucesso! ${result.novasAtividades} novas atividades sincronizadas.`);
        carregarRanking();
    } catch (e) {
        alert("Erro na sincronização.");
    } finally {
        loader.classList.add('hidden');
    }
};

// Iniciar
window.onload = carregarRanking;