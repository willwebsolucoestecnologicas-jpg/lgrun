// --- CONFIGURAÇÕES DO PROJETO ---
const API_URL = "https://script.google.com/macros/s/AKfycbyrEhqu0mSebN0ot74wk1CHEMrSRjmTyTHjqsdx1a6Sk80sqfZ_M14SpjStRDCRFl_92w/exec";
const CLIENT_ID = "198835";
const GITHUB_URL = "https://willwebsolucoestecnologicas-jpg.github.io/lgrun/"; // Sua URL exata

// Link de autorização (Montado dinamicamente)
const AUTH_URL = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${GITHUB_URL}&approval_prompt=force&scope=read,activity:read_all`;

// --- VARIÁVEIS DE ESTADO (MEMÓRIA) ---
let dadosCompletos = [];
let categoriaAtual = 'run'; // 'run', 'ride', 'geral'
let sexoAtual = 'all';      // 'all', 'M', 'F'

// Elementos do DOM
const rankingBody = document.getElementById('ranking-body');
const loader = document.getElementById('loader');
const headerResult = document.getElementById('header-result');

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Configura o botão de participar
    const btnParticipar = document.getElementById('btn-participar');
    if (btnParticipar) {
        btnParticipar.onclick = () => window.location.href = AUTH_URL;
    }

    // 2. Configura o botão de atualizar
    const btnSync = document.getElementById('btn-sync');
    if (btnSync) {
        btnSync.onclick = sincronizarDados;
    }

    // 3. Verifica se o Strava devolveu um código (Cadastro Novo)
    processarRetornoStrava();

    // 4. Carrega o Ranking Inicial
    carregarRanking();

    // === ADICIONE ESTA LINHA ABAIXO ===
    carregarDesafios(); 
    // =================================
});

// --- FUNÇÕES DE LÓGICA ---

/**
 * 1. Processa o retorno do Strava (Cadastro de novo usuário)
 */
async function processarRetornoStrava() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        mostrarLoader(true);
        try {
            const response = await fetch(`${API_URL}?code=${code}`);
            const result = await response.json();
            
            if (result.success) {
                alert(`Sucesso! Bem-vindo ao LG Run, ${result.atleta}!`);
                // Limpa a URL para não cadastrar de novo ao recarregar
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                console.error("Erro no cadastro:", result.error);
                alert("Erro ao cadastrar. Tente novamente.");
            }
        } catch (error) {
            console.error("Erro de conexão:", error);
        } finally {
            mostrarLoader(false);
            // Recarrega o ranking para o novo usuário aparecer
            carregarRanking();
        }
    }
}

/**
 * 2. Busca os dados do Google Sheets
 */
async function carregarRanking() {
    mostrarLoader(true);
    rankingBody.innerHTML = ''; // Limpa tabela

    try {
        const response = await fetch(`${API_URL}?action=getRanking`);
        const data = await response.json();
        
        dadosCompletos = data; // Guarda na memória
        renderizarTabela();    // Desenha na tela
    } catch (error) {
        console.error("Erro ao carregar ranking:", error);
        rankingBody.innerHTML = '<tr><td colspan="3">Erro ao carregar dados.</td></tr>';
    } finally {
        mostrarLoader(false);
    }
}

/**
 * 3. Renderiza a Tabela baseada nos Filtros Atuais
 */
function renderizarTabela() {
    rankingBody.innerHTML = '';

    // A. Filtrar por Sexo
    let listaFiltrada = dadosCompletos.filter(atleta => {
        if (sexoAtual === 'all') return true;
        return atleta.sexo === sexoAtual;
    });

    // B. Ordenar e Filtrar Zeros pela Categoria
    listaFiltrada = listaFiltrada.sort((a, b) => {
        if (categoriaAtual === 'run') return b.run_km - a.run_km;
        if (categoriaAtual === 'ride') return b.ride_km - a.ride_km;
        return b.total_geral - a.total_geral;
    });

    // Remove quem tem 0km na categoria
    listaFiltrada = listaFiltrada.filter(item => {
        if (categoriaAtual === 'run') return item.run_km > 0;
        if (categoriaAtual === 'ride') return item.ride_km > 0;
        return item.total_geral > 0;
    });

    // C. Atualiza o Cabeçalho da Tabela
    if (categoriaAtual === 'run') headerResult.innerText = "Distância & Pace";
    else headerResult.innerText = "Distância Total";

    // D. Feedback se lista vazia
    if (listaFiltrada.length === 0) {
        rankingBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">Nenhum atleta nesta categoria ainda.</td></tr>';
        return;
    }

    // E. Gera o HTML
    listaFiltrada.forEach((atleta, index) => {
        let valorPrincipal = '';
        let infoExtra = '';

        if (categoriaAtual === 'run') {
            valorPrincipal = `${atleta.run_km} km`;
            // Ícone de raio para o pace
            infoExtra = `<span class="pace-info" style="font-size:0.8rem; color:#666; display:block;">⚡ ${atleta.run_pace}/km</span>`;
        } else if (categoriaAtual === 'ride') {
            valorPrincipal = `${atleta.ride_km} km`;
        } else {
            valorPrincipal = `${atleta.total_geral} km`;
            infoExtra = `<span style="font-size:0.8rem; color:#666; display:block;">Acumulado</span>`;
        }

        // Avatar Padrão se vier vazio
        let avatarUrl = atleta.avatar ? atleta.avatar : 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

        // Ícones de Medalha
        let medalha = '';
        if (index === 0) medalha = '🥇 ';
        if (index === 1) medalha = '🥈 ';
        if (index === 2) medalha = '🥉 ';

        const linha = `
            <tr>
                <td class="col-pos"><strong>${index + 1}</strong></td>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${avatarUrl}" style="width:35px; height:35px; border-radius:50%; object-fit:cover;">
                        <div>
                            <strong>${medalha}${atleta.atleta}</strong>
                            ${infoExtra}
                        </div>
                    </div>
                </td>
                <td class="col-km"><strong>${valorPrincipal}</strong></td>
            </tr>
        `;
        rankingBody.innerHTML += linha;
    });
}

/**
 * 4. Função de Sincronização Manual
 */
async function sincronizarDados() {
    mostrarLoader(true);
    try {
        const res = await fetch(`${API_URL}?action=syncAll`);
        const result = await res.json();
        alert(`Sincronização concluída! Novas atividades: ${result.novasAtividades}`);
        carregarRanking();
    } catch (e) {
        alert("Erro ao sincronizar. Tente novamente.");
    } finally {
        mostrarLoader(false);
    }
}

// --- FUNÇÕES DE UI (CHAMADAS PELO HTML) ---

function mudarCategoria(novaCat) {
    categoriaAtual = novaCat;
    
    // Atualiza classes dos botões
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${novaCat}`).classList.add('active');
    
    renderizarTabela();
}

function mudarSexo(novoSexo, elemento) {
    sexoAtual = novoSexo;
    
    // Atualiza classes dos chips
    document.querySelectorAll('.chip').forEach(chip => chip.classList.remove('active'));
    elemento.classList.add('active');
    
    renderizarTabela();
}

function mostrarLoader(show) {
    if (show) loader.classList.remove('hidden');
    else loader.classList.add('hidden');
}

function toggleModal() {
    const modal = document.getElementById('modal-regras');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
}

// Adicione no topo do script.js junto com as outras variáveis de estado
let timerInterval;

// No final da função window.onload ou DOMContentLoaded, chame:
// carregarDesafios();

async function carregarDesafios() {
    try {
        const response = await fetch(`${API_URL}?action=getChallenges`);
        const desafios = await response.json();
        
        if (desafios && desafios.length > 0) {
            const desafio = desafios[0]; // Pega o primeiro desafio ativo
            exibirDesafio(desafio);
        } else {
            document.getElementById('challenge-container').classList.add('hidden');
        }
    } catch (error) {
        console.error("Erro ao buscar desafios:", error);
    }
}

function exibirDesafio(desafio) {
    const container = document.getElementById('challenge-container');
    const titulo = document.getElementById('challenge-title');
    const info = document.getElementById('challenge-info');
    const timer = document.getElementById('challenge-timer');
    const badge = document.querySelector('.challenge-badge');
    const card = document.querySelector('.challenge-card');

    container.classList.remove('hidden');
    titulo.innerText = desafio.titulo;
    info.innerText = `Meta: ${desafio.kmAlvo}km | Categoria: ${desafio.tipo === 'run' ? '🏃 Corrida' : '🚴 Bike'}`;

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        const agora = new Date().getTime();
        
        // CENÁRIO A: Ainda não começou
        if (agora < desafio.inicioMs) {
            const dist = desafio.inicioMs - agora;
            const t = calcularTempo(dist);
            
            badge.innerText = "🔜 EM BREVE";
            badge.style.background = "rgba(255,255,255,0.2)";
            card.style.background = "linear-gradient(135deg, #555 0%, #222 100%)";
            timer.innerHTML = `<span style="font-size:0.8rem; opacity:0.8;">COMEÇA EM:</span><br>${t.h}h ${t.m}m ${t.s}s`;
        } 
        // CENÁRIO B: Está acontecendo
        else if (agora >= desafio.inicioMs && agora <= desafio.fimMs) {
            const dist = desafio.fimMs - agora;
            const t = calcularTempo(dist);

            badge.innerText = "🔥 DESAFIO ATIVO";
            badge.style.background = "rgba(0,0,0,0.2)";
            card.style.background = "linear-gradient(135deg, #fc4c02 0%, #ff8c00 100%)";
            timer.innerHTML = `<span style="font-size:0.8rem; opacity:0.8;">TERMINA EM:</span><br>${t.h}h ${t.m}m ${t.s}s`;
        }
        // CENÁRIO C: Expirou
        else {
            clearInterval(timerInterval);
            container.classList.add('hidden');
        }
    }, 1000);
}

// Função auxiliar para não repetir código de cálculo
function calcularTempo(ms) {
    return {
        h: Math.floor(ms / (1000 * 60 * 60)),
        m: Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((ms % (1000 * 60)) / 1000)
    };
}
