// =================================================================
// ⚙️ CONFIGURAÇÕES DO PROJETO
// =================================================================

// SEU LINK DO GOOGLE APPS SCRIPT (JÁ CONFIGURADO)
const API_URL = "https://script.google.com/macros/s/AKfycbyrEhqu0mSebN0ot74wk1CHEMrSRjmTyTHjqsdx1a6Sk80sqfZ_M14SpjStRDCRFl_92w/exec";

// SEUS DADOS DO STRAVA
const CLIENT_ID = "198835"; 
// Importante: A URL abaixo deve ser EXATAMENTE onde seu site está hospedado
const GITHUB_URL = "https://willwebsolucoestecnologicas-jpg.github.io/lgrun/"; 

// Link de autorização (Montado automaticamente)
const AUTH_URL = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${GITHUB_URL}&approval_prompt=force&scope=read,activity:read_all`;

// =================================================================
// 🧠 ESTADO DA APLICAÇÃO (MEMÓRIA)
// =================================================================
let dadosCompletos = [];
let categoriaAtual = 'run'; // 'run', 'ride', 'geral'
let sexoAtual = 'all';      // 'all', 'M', 'F'
let timerInterval;          // Controle do cronômetro

// =================================================================
// 🚀 INICIALIZAÇÃO (QUANDO A PÁGINA CARREGA)
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Configura o botão de Login (Entrar no Desafio)
    const btnParticipar = document.getElementById('btn-participar');
    if (btnParticipar) {
        btnParticipar.onclick = () => {
            // Redireciona para o Strava
            window.location.href = AUTH_URL;
        };
    }

    // 2. Configura o botão de Sync
    const btnSync = document.getElementById('btn-sync');
    if (btnSync) {
        btnSync.onclick = sincronizarDados;
    }

    // 3. Verifica se voltou do Strava com código de login
    processarRetornoStrava();

    // 4. Carrega os dados iniciais
    carregarRanking();
    carregarDesafios();
});

// =================================================================
// 🔗 FUNÇÕES DE CONEXÃO (API)
// =================================================================

// A. Processa o retorno do Login do Strava
// A. Processa o retorno do Login do Strava (ATUALIZADA)
async function processarRetornoStrava() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        mostrarLoader(true);
        // Remove o código da URL na hora para ficar limpo
        window.history.replaceState({}, document.title, window.location.pathname);

        try {
            const response = await fetch(`${API_URL}?code=${code}`);
            const result = await response.json();
            
            if (result.success) {
                // USA A NOVA NOTIFICAÇÃO
                showToast(`Bem-vindo, ${result.atleta}! Cadastro realizado.`, 'success');
                carregarRanking();
            } else {
                console.error("Erro Strava:", result);
                showToast("Erro ao cadastrar. Tente novamente.", 'error');
            }
        } catch (error) {
            console.error("Erro de conexão:", error);
            showToast("Erro de conexão. Verifique sua internet.", 'error');
        } finally {
            mostrarLoader(false);
        }
    }
}
// B. Busca o Ranking
async function carregarRanking() {
    mostrarLoader(true);
    const rankingBody = document.getElementById('ranking-body');
    rankingBody.innerHTML = ''; 

    try {
        const response = await fetch(`${API_URL}?action=getRanking`);
        const data = await response.json();
        
        dadosCompletos = data; // Salva na memória
        renderizarTabela();    // Desenha na tela
    } catch (error) {
        console.error("Erro ao carregar ranking:", error);
        rankingBody.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">Erro ao carregar dados.</div>';
    } finally {
        mostrarLoader(false);
    }
}

// C. Sincronização Manual
// C. Sincronização Manual (ATUALIZADA)
async function sincronizarDados() {
    mostrarLoader(true);
    try {
        const res = await fetch(`${API_URL}?action=syncAll`);
        const result = await res.json();
        showToast(`Sync concluído! +${result.novasAtividades} atividades.`, 'success');
        carregarRanking();
    } catch (e) {
        showToast("Erro ao sincronizar.", 'error');
    } finally {
        mostrarLoader(false);
    }
}
// D. Busca Desafios Ativos
async function carregarDesafios() {
    try {
        const response = await fetch(`${API_URL}?action=getChallenges`);
        const desafios = await response.json();
        
        if (desafios && desafios.length > 0) {
            exibirDesafio(desafio = desafios[0]);
        } else {
            document.getElementById('challenge-container').classList.add('hidden');
        }
    } catch (error) {
        console.error("Erro ao buscar desafios:", error);
    }
}

// =================================================================
// 🎨 FUNÇÕES DE INTERFACE (UI)
// =================================================================

function renderizarTabela() {
    const rankingBody = document.getElementById('ranking-body');
    const headerResult = document.getElementById('header-result');
    rankingBody.innerHTML = '';

    // Filtragem
    let listaFiltrada = dadosCompletos.filter(atleta => {
        if (sexoAtual === 'all') return true;
        return atleta.sexo === sexoAtual;
    });

    // Ordenação
    listaFiltrada = listaFiltrada.sort((a, b) => {
        if (categoriaAtual === 'run') return b.run_km - a.run_km;
        if (categoriaAtual === 'ride') return b.ride_km - a.ride_km;
        return b.total_geral - a.total_geral;
    });

    // Remove zeros
    listaFiltrada = listaFiltrada.filter(item => {
        if (categoriaAtual === 'run') return item.run_km > 0;
        if (categoriaAtual === 'ride') return item.ride_km > 0;
        return item.total_geral > 0;
    });

    // Atualiza Header
    if (categoriaAtual === 'run') headerResult.innerText = "Distância & Pace";
    else headerResult.innerText = "Distância Total";

    if (listaFiltrada.length === 0) {
        rankingBody.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Sem dados nesta categoria.</div>';
        return;
    }

    // Gera HTML
    listaFiltrada.forEach((atleta, index) => {
        let valorPrincipal = '';
        let infoExtra = '';

        if (categoriaAtual === 'run') {
            valorPrincipal = `${atleta.run_km} km`;
            infoExtra = `<span class="rank-pace">⚡ ${atleta.run_pace}/km</span>`;
        } else if (categoriaAtual === 'ride') {
            valorPrincipal = `${atleta.ride_km} km`;
            infoExtra = `<span class="rank-pace">Bike</span>`;
        } else {
            valorPrincipal = `${atleta.total_geral} km`;
            infoExtra = `<span class="rank-pace">Acumulado</span>`;
        }

        let avatarUrl = atleta.avatar ? atleta.avatar : 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

        const itemHTML = `
            <div class="rank-item">
                <div class="rank-left">
                    <span class="rank-pos">${index + 1}</span>
                    <img src="${avatarUrl}" class="rank-avatar">
                    <div class="rank-info">
                        <span class="rank-name">${atleta.atleta}</span>
                        ${infoExtra}
                    </div>
                </div>
                <div class="rank-right">
                    <span class="rank-value">${valorPrincipal}</span>
                </div>
            </div>
        `;
        rankingBody.innerHTML += itemHTML;
    });
}

function exibirDesafio(desafio) {
    const container = document.getElementById('challenge-container');
    const titulo = document.getElementById('challenge-title');
    const info = document.getElementById('challenge-info'); 
    const timer = document.getElementById('challenge-timer');
    const actionArea = document.getElementById('challenge-action');
    const tagLive = document.querySelector('.tag-live'); 

    container.classList.remove('hidden');
    titulo.innerText = desafio.titulo;
    info.innerText = `${desafio.kmAlvo} km`; 
    
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        const agora = new Date().getTime();
        // Garante que são números. Se vier texto, converte.
        const inicio = Number(desafio.inicioMs);
        const fim = Number(desafio.fimMs);

        let distancia = 0;
        
        if (agora < inicio) {
            distancia = inicio - agora;
            tagLive.innerText = "EM BREVE";
            tagLive.style.background = "#0066ff"; 
        } else if (agora >= inicio && agora <= fim) {
            distancia = fim - agora;
            tagLive.innerText = "AO VIVO";
            tagLive.style.background = "#28a745"; 
        } else {
            clearInterval(timerInterval);
            container.classList.add('hidden');
            return;
        }

        const t = calcularTempo(distancia);
        timer.innerText = `${t.h}h ${t.m}m ${t.s}s`;

        // Botão de Participar no WhatsApp
        const dezMinutos = 10 * 60 * 1000;
        const limiteInscricao = fim - dezMinutos;
        const jaInscrito = localStorage.getItem(`desafio_${desafio.titulo}`);

        if (agora < limiteInscricao) {
            if (!jaInscrito) {
                const msgZap = `Olá, quero participar do *${desafio.titulo}*!`;
                // ⚠️ COLOQUE SEU NÚMERO ABAIXO (Mantenha o 55)
                const linkZap = `https://wa.me/5584996417551?text=${encodeURIComponent(msgZap)}`;
                
                actionArea.innerHTML = `
                    <a href="${linkZap}" target="_blank" class="btn-challenge" onclick="confirmarParticipacao('${desafio.titulo}')">
                        🙋 QUERO PARTICIPAR
                    </a>
                `;
            } else {
                actionArea.innerHTML = '<div class="challenge-closed" style="border-color:#fff; color:#fff;">✅ INSCRITO</div>';
            }
        } else {
            actionArea.innerHTML = '<div class="challenge-closed">⛔ ENCERRADO</div>';
        }

    }, 1000);
}

function calcularTempo(ms) {
    return {
        h: Math.floor(ms / (1000 * 60 * 60)),
        m: Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((ms % (1000 * 60)) / 1000)
    };
}

function confirmarParticipacao(titulo) {
    localStorage.setItem(`desafio_${titulo}`, 'true');
    setTimeout(() => location.reload(), 1000);
}

function mudarCategoria(novaCat) {
    categoriaAtual = novaCat;
    document.querySelectorAll('.seg-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${novaCat}`).classList.add('active');
    renderizarTabela();
}

function mudarSexo(novoSexo, elemento) {
    sexoAtual = novoSexo;
    document.querySelectorAll('.pill').forEach(btn => btn.classList.remove('active'));
    if (elemento) elemento.classList.add('active');
    renderizarTabela();
}

function mostrarLoader(show) {
    const loader = document.getElementById('loader');
    if (show) loader.classList.remove('hidden');
    else loader.classList.add('hidden');
}

function toggleModal() {
    const modal = document.getElementById('modal-regras');
    if (modal.classList.contains('hidden')) modal.classList.remove('hidden');
    else modal.classList.add('hidden');
}

// Função para mostrar notificação bonita
function showToast(mensagem, tipo = 'success') {
    const area = document.getElementById('notification-area');
    
    // Cria o elemento da notificação
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    
    // Ícone baseado no tipo
    const icon = tipo === 'success' ? '✅' : '❌';
    
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span>${mensagem}</span>
    `;
    
    // Adiciona na tela
    area.appendChild(toast);
    
    // Remove automaticamente depois de 4 segundos
    setTimeout(() => {
        toast.style.animation = "toastFadeOut 0.5s forwards";
        setTimeout(() => toast.remove(), 500); // Espera a animação acabar
    }, 4000);
}

