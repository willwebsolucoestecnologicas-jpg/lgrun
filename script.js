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
    const rankingBody = document.getElementById('ranking-body');
    const headerResult = document.getElementById('header-result');
    
    rankingBody.innerHTML = '';

    // Filtragem (igual ao anterior)
    let listaFiltrada = dadosCompletos.filter(atleta => {
        if (sexoAtual === 'all') return true;
        return atleta.sexo === sexoAtual;
    });

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

    // Atualiza Texto do Header
    if (categoriaAtual === 'run') headerResult.innerText = "Distância & Pace";
    else headerResult.innerText = "Distância Total";

    if (listaFiltrada.length === 0) {
        rankingBody.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Sem dados ainda.</div>';
        return;
    }

    // GERAÇÃO DO HTML (Novo formato Divs em vez de TR/TD)
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
    
    // 1. Remove a classe 'active' de TODOS os botões da categoria
    // (Note que agora usamos .seg-btn em vez de .tab-btn)
    document.querySelectorAll('.seg-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // 2. Adiciona 'active' apenas no botão clicado
    const btnAtivo = document.getElementById(`tab-${novaCat}`);
    if (btnAtivo) {
        btnAtivo.classList.add('active');
    }
    
    renderizarTabela();
}

function mudarSexo(novoSexo, elemento) {
    sexoAtual = novoSexo;
    
    // 1. Remove a classe 'active' de TODOS os botões de filtro
    // (Note que agora usamos .pill em vez de .chip)
    document.querySelectorAll('.pill').forEach(btn => {
        btn.classList.remove('active');
    });

    // 2. Adiciona 'active' apenas no botão que você clicou
    if (elemento) {
        elemento.classList.add('active');
    }
    
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
    const info = document.getElementById('challenge-info'); // Agora é o campo "Meta"
    const timer = document.getElementById('challenge-timer');
    const actionArea = document.getElementById('challenge-action');
    const tagLive = document.querySelector('.tag-live'); // A etiqueta "AO VIVO"

    // Exibe o container
    container.classList.remove('hidden');
    
    // 1. Preenche os dados básicos
    titulo.innerText = desafio.titulo;
    info.innerText = `${desafio.kmAlvo} km`; // Preenche apenas o número da meta
    
    // Limpa timer anterior para não sobrepor
    if (timerInterval) clearInterval(timerInterval);

    // 2. Inicia o Loop do Cronômetro
    timerInterval = setInterval(() => {
        const agora = new Date().getTime();
        const inicio = desafio.inicioMs; // Certifique-se que o Google envia isso
        const fim = desafio.fimMs;

        let distancia = 0;
        
        // CENÁRIO A: Desafio ainda vai começar
        if (agora < inicio) {
            distancia = inicio - agora;
            tagLive.innerText = "EM BREVE";
            tagLive.style.background = "#f5a623"; // Laranja
            tagLive.style.color = "#000";
        } 
        // CENÁRIO B: Desafio está rolando
        else if (agora >= inicio && agora <= fim) {
            distancia = fim - agora;
            tagLive.innerText = "AO VIVO AGORA";
            tagLive.style.background = "#0066ff"; // Azul Tech
            tagLive.style.color = "#fff";
        } 
        // CENÁRIO C: Acabou
        else {
            clearInterval(timerInterval);
            container.classList.add('hidden'); // Esconde o card se acabou
            return;
        }

        // 3. Formata e escreve o tempo na tela
        const t = calcularTempo(distancia);
        timer.innerText = `${t.h}h ${t.m}m ${t.s}s`;

        // 4. Lógica do Botão (Aparece/Some)
        const dezMinutos = 10 * 60 * 1000;
        const limiteInscricao = fim - dezMinutos;
        const jaInscrito = localStorage.getItem(`desafio_${desafio.titulo}`);

        if (agora < limiteInscricao) {
            if (!jaInscrito) {
                const msgZap = `Olá, quero participar do *${desafio.titulo}*!`;
                // IMPORTANTE: Troque pelo seu número real abaixo
                const linkZap = `https://wa.me/5584996106961?text=${encodeURIComponent(msgZap)}`;
                
                actionArea.innerHTML = `
                    <a href="${linkZap}" target="_blank" class="btn-challenge" onclick="confirmarParticipacao('${desafio.titulo}')">
                        ⚡ QUERO PARTICIPAR
                    </a>
                `;
            } else {
                actionArea.innerHTML = '<div class="challenge-closed" style="border-color:#28a745; color:#28a745;">✅ VOCÊ JÁ ESTÁ DENTRO</div>';
            }
        } else {
            actionArea.innerHTML = '<div class="challenge-closed">⛔ INSCRIÇÕES ENCERRADAS</div>';
        }

    }, 1000);
}
// Nova função para salvar que a pessoa clicou (Simula inscrição)
// Função para salvar inscrição
function confirmarParticipacao(titulo) {
    localStorage.setItem(`desafio_${titulo}`, 'true');
    // Recarrega parte da tela para atualizar botão
    setTimeout(() => location.reload(), 1000);
}

function calcularTempo(ms) {
    return {
        h: Math.floor(ms / (1000 * 60 * 60)),
        m: Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((ms % (1000 * 60)) / 1000)
    };
}

// Função Auxiliar de Tempo
function calcularTempo(ms) {
    return {
        h: Math.floor(ms / (1000 * 60 * 60)),
        m: Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((ms % (1000 * 60)) / 1000)
    };
}


