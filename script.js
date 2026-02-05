// =================================================================
// 📲 PWA INSTALLER LOGIC
// =================================================================
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // 1. Impede o Chrome de tentar mostrar o aviso automático (que as vezes falha)
  e.preventDefault();
  // 2. Guarda o evento para usarmos no botão
  deferredPrompt = e;
  // 3. Mostra o nosso botão de instalar na tela de login
  const installBtn = document.getElementById('btn-install-app');
  if (installBtn) {
      installBtn.classList.remove('hidden');
      installBtn.style.display = 'block'; // Garante que apareça
      showToast('Aplicativo pronto para instalar!', 'success'); // Avisa o usuário
  }
});

async function instalarPWA() {
  if (deferredPrompt) {
    // Mostra o prompt oficial de instalação
    deferredPrompt.prompt();
    // Espera o usuário aceitar ou recusar
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      deferredPrompt = null;
      // Esconde o botão depois de instalado
      document.getElementById('btn-install-app').style.display = 'none';
    }
  }
}

// ... (Aqui continua o resto do seu código: CONFIGURAÇÕES, API_URL, etc)

// =================================================================
// ⚙️ CONFIGURAÇÕES
// =================================================================
const API_URL = "https://script.google.com/macros/s/AKfycbyrEhqu0mSebN0ot74wk1CHEMrSRjmTyTHjqsdx1a6Sk80sqfZ_M14SpjStRDCRFl_92w/exec";
const STRAVA_CLIENT_ID = "198835"; 
const GITHUB_URL = "https://willwebsolucoestecnologicas-jpg.github.io/lgrun/"; 
const AUTH_URL = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${GITHUB_URL}&approval_prompt=force&scope=read,activity:read_all`;

// ✅ SEU ID DO GOOGLE CLOUD (JÁ INSERIDO)
const GOOGLE_CLIENT_ID = "619502802732-6lbbvjd0pm9ocg0keubds0aajk6s81ut.apps.googleusercontent.com"; 

// =================================================================
// 🧠 ESTADO
// =================================================================
let dadosCompletos = [];
let categoriaAtual = 'run';
let sexoAtual = 'all';
let globalTimerInterval;

// =================================================================
// 🚀 INICIALIZAÇÃO
// =================================================================
window.onload = () => {
    // 1. Verifica se já tem login do Google salvo
    const googleUser = localStorage.getItem('lg_google_user');
    
    if (googleUser) {
        // Se já logou, libera o app direto
        liberarAcessoApp(JSON.parse(googleUser));
    } else {
        // Se não, mostra o botão do Google na tela de bloqueio
        inicializarGoogleBtn();
    }

    // Configura botões internos
    const btnParticipar = document.getElementById('btn-participar');
    if(btnParticipar) btnParticipar.onclick = () => window.location.href = AUTH_URL;
    
    const btnSync = document.getElementById('btn-sync');
    if(btnSync) btnSync.onclick = sincronizarDados;
};

// =================================================================
// 🔐 LÓGICA DE LOGIN GOOGLE
// =================================================================
function inicializarGoogleBtn() {
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse
    });
    
    google.accounts.id.renderButton(
        document.getElementById("buttonDiv"),
        { theme: "filled_blue", size: "large", shape: "pill", width: "280" } 
    );
}

function handleCredentialResponse(response) {
    const data = parseJwt(response.credential);
    
    const usuario = {
        nome: data.name,
        email: data.email,
        foto: data.picture
    };

    localStorage.setItem('lg_google_user', JSON.stringify(usuario));
    liberarAcessoApp(usuario);
    showToast(`Bem-vindo, ${usuario.nome}!`, 'success');
}

function liberarAcessoApp(usuario) {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('app-content').classList.remove('hidden-app');
    
    if(usuario.foto) document.getElementById('user-photo').src = usuario.foto;

    // Carrega o sistema
    processarRetornoStrava();
    carregarRanking();
    carregarDesafios();
}

function fazerLogout() {
    if(confirm("Deseja sair do aplicativo?")) {
        localStorage.removeItem('lg_google_user');
        location.reload(); 
    }
}

function parseJwt (token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// =================================================================
// 🔗 API E DADOS
// =================================================================
async function processarRetornoStrava() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
        window.history.replaceState({}, document.title, window.location.pathname);
        showToast("Conectando ao Strava...", 'success');
        
        try {
            const response = await fetch(`${API_URL}?code=${code}`);
            const result = await response.json();
            if (result.success) {
                showToast(`Conta Strava conectada: ${result.atleta}!`, 'success');
                carregarRanking();
            } else {
                showToast("Erro ao conectar Strava.", 'error');
            }
        } catch (error) {
            showToast("Erro de conexão.", 'error');
        }
    }
}

async function carregarRanking() {
    const rankingBody = document.getElementById('ranking-body');
    const loader = document.getElementById('loader');
    rankingBody.innerHTML = '';
    if(loader) loader.classList.remove('hidden');

    try {
        const response = await fetch(`${API_URL}?action=getRanking`);
        const data = await response.json();
        dadosCompletos = data;
        renderizarTabela();
    } catch (error) {
        console.error("Erro ranking:", error);
    } finally {
        if(loader) loader.classList.add('hidden');
    }
}

async function sincronizarDados() {
    showToast("Sincronizando...", 'success');
    try {
        const res = await fetch(`${API_URL}?action=syncAll`);
        const result = await res.json();
        showToast(`Sync ok! +${result.novasAtividades} atividades.`, 'success');
        carregarRanking();
    } catch (e) {
        showToast("Erro no Sync.", 'error');
    }
}

// =================================================================
// 🔥 MULTI-DESAFIOS
// =================================================================
async function carregarDesafios() {
    try {
        const response = await fetch(`${API_URL}?action=getChallenges`);
        const desafios = await response.json();
        
        const container = document.getElementById('challenge-container');
        container.innerHTML = ''; 

        if (desafios && desafios.length > 0) {
            container.classList.remove('hidden');
            desafios.forEach((desafio, index) => {
                const cardHTML = criarHTMLCard(desafio, index);
                container.innerHTML += cardHTML;
            });
            iniciarCronometroGlobal(desafios);
        } else {
            container.classList.add('hidden');
        }
    } catch (error) {
        console.error("Erro desafios:", error);
    }
}

function criarHTMLCard(desafio, index) {
    const jaInscrito = localStorage.getItem(`desafio_${desafio.titulo}`);
    let botaoHTML = '';
    const msgZap = `Olá, quero participar do *${desafio.titulo}*!`;
    const linkZap = `https://wa.me/5584996417551?text=${encodeURIComponent(msgZap)}`;

    if (jaInscrito) {
        botaoHTML = `<div class="challenge-closed" style="border-color:#fff;">✅ INSCRITO</div>`;
    } else {
        botaoHTML = `
            <a href="${linkZap}" target="_blank" class="btn-challenge" 
               id="btn-action-${index}"
               onclick="confirmarParticipacao('${desafio.titulo}')">
                🙋 QUERO PARTICIPAR
            </a>
        `;
    }

    return `
        <div class="hero-card" id="card-${index}">
            <div class="hero-glow"></div>
            <div class="hero-header">
                <span class="tag-live" id="status-${index}">CARREGANDO...</span>
                <span class="hero-icon">${desafio.tipo === 'run' ? '🏃' : '🚴'}</span>
            </div>
            <h2>${desafio.titulo}</h2>
            <div class="hero-stats">
                <div class="stat-item">
                    <span class="label">Meta</span>
                    <span class="value">${desafio.kmAlvo} km</span>
                </div>
                <div class="stat-item">
                    <span class="label">Tempo Restante</span>
                    <span class="value timer" id="timer-${index}">--:--:--</span>
                </div>
            </div>
            <div id="action-area-${index}">
                ${botaoHTML}
            </div>
        </div>
    `;
}

function iniciarCronometroGlobal(desafios) {
    if (globalTimerInterval) clearInterval(globalTimerInterval);

    globalTimerInterval = setInterval(() => {
        const agora = new Date().getTime();

        desafios.forEach((desafio, index) => {
            const timerElement = document.getElementById(`timer-${index}`);
            const statusElement = document.getElementById(`status-${index}`);
            const actionArea = document.getElementById(`action-area-${index}`);
            const cardElement = document.getElementById(`card-${index}`);

            if (!timerElement) return;

            const inicio = Number(desafio.inicioMs);
            const fim = Number(desafio.fimMs);
            let distancia = 0;

            if (agora < inicio) {
                distancia = inicio - agora;
                statusElement.innerText = "EM BREVE";
                statusElement.style.background = "#0066ff"; 
            } else if (agora >= inicio && agora <= fim) {
                distancia = fim - agora;
                statusElement.innerText = "AO VIVO";
                statusElement.style.background = "#28a745"; 
            } else {
                if (cardElement) cardElement.style.display = 'none';
                return;
            }

            const t = calcularTempo(distancia);
            timerElement.innerText = `${t.h}h ${t.m}m ${t.s}s`;

            const limiteInscricao = fim - (10 * 60 * 1000);
            if (agora >= limiteInscricao && agora <= fim) {
                actionArea.innerHTML = '<div class="challenge-closed">⛔ ENCERRADO</div>';
            }
        });
    }, 1000);
}

// =================================================================
// 🎨 UI HELPERS
// =================================================================
function showToast(mensagem, tipo = 'success') {
    const area = document.getElementById('notification-area');
    if(!area) return;
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    const icon = tipo === 'success' ? '✅' : '❌';
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${mensagem}</span>`;
    area.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = "toastFadeOut 0.5s forwards";
        setTimeout(() => toast.remove(), 500);
    }, 4000);
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

function renderizarTabela() {
    const rankingBody = document.getElementById('ranking-body');
    const headerResult = document.getElementById('header-result');
    rankingBody.innerHTML = '';

    let listaFiltrada = dadosCompletos.filter(atleta => sexoAtual === 'all' || atleta.sexo === sexoAtual);

    listaFiltrada = listaFiltrada.sort((a, b) => {
        if (categoriaAtual === 'run') return b.run_km - a.run_km;
        if (categoriaAtual === 'ride') return b.ride_km - a.ride_km;
        return b.total_geral - a.total_geral;
    });

    listaFiltrada = listaFiltrada.filter(item => {
        if (categoriaAtual === 'run') return item.run_km > 0;
        if (categoriaAtual === 'ride') return item.ride_km > 0;
        return item.total_geral > 0;
    });

    if (categoriaAtual === 'run') headerResult.innerText = "Distância & Pace";
    else headerResult.innerText = "Distância Total";

    if (listaFiltrada.length === 0) {
        rankingBody.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Sem dados.</div>';
        return;
    }

    listaFiltrada.forEach((atleta, index) => {
        let valorPrincipal = categoriaAtual === 'run' ? `${atleta.run_km} km` : (categoriaAtual === 'ride' ? `${atleta.ride_km} km` : `${atleta.total_geral} km`);
        let infoExtra = categoriaAtual === 'run' ? `⚡ ${atleta.run_pace}/km` : (categoriaAtual === 'ride' ? `Bike` : `Acumulado`);
        let avatarUrl = atleta.avatar ? atleta.avatar : 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

        const itemHTML = `
            <div class="rank-item">
                <div class="rank-left">
                    <span class="rank-pos" style="${index===0?'color:#FFD700; text-shadow:0 0 10px rgba(255,215,0,0.4)':(index===1?'color:#C0C0C0':(index===2?'color:#CD7F32':''))}">${index + 1}</span>
                    <img src="${avatarUrl}" class="rank-avatar">
                    <div class="rank-info">
                        <span class="rank-name">${atleta.atleta}</span>
                        <span class="rank-pace" style="color:#8b9bb4; font-size:0.75rem">${infoExtra}</span>
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

function toggleModal() {
    const modal = document.getElementById('modal-regras');
    if (modal.classList.contains('hidden')) modal.classList.remove('hidden');
    else modal.classList.add('hidden');
}

