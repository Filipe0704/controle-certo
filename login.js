/* =========================================================
   CONTROLE CERTO - login.js
   Tela de Entrar / Criar conta.
   - Senha guardada como hash PBKDF2 + salt (nunca em texto puro)
   - Validação campo a campo com mensagens acessíveis
   - Bloqueio temporário após várias tentativas erradas
   Observação: o projeto é 100% front-end (dados no navegador);
   em um sistema real, a autenticação ficaria no servidor.
   ========================================================= */
(function () {
    "use strict";

    // Se o cc.js não carregou, não há o que fazer
    if (!window.CC) return;

    const {
        CHAVES, PAGINA_INICIO, LIMITE_TEXTO,
        aoCarregar, lerJSON, salvarJSON, salvarTexto,
        limparTexto, normalizarEmail, validarEmail,
        estaLogado, limparDadosUsuario
    } = window.CC;

    // ==========================================
    // CONSTANTES
    // ==========================================
    const ITERACOES_HASH = 100000;
    const SENHA_MIN = 8;
    const SENHA_MAX = 128;
    const MAX_TENTATIVAS = 5;
    const BLOQUEIO_MS = 30000;
    const MSG_CREDENCIAIS = "E-mail ou senha incorretos.";

    let tentativasFalhas = 0;
    let bloqueadoAte = 0;

    // ==========================================
    // CRIPTOGRAFIA (SubtleCrypto / PBKDF2)
    // ==========================================
    function suportaCripto() {
        return Boolean(window.crypto && window.crypto.subtle);
    }

    function bytesParaHex(bytes) {
        return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
    }

    function hexParaBytes(hex) {
        return Uint8Array.from(String(hex).match(/.{2}/g) || [], h => parseInt(h, 16));
    }

    async function gerarHash(senha, saltBytes, iteracoes) {
        const material = await crypto.subtle.importKey(
            "raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveBits"]
        );
        const bits = await crypto.subtle.deriveBits(
            { name: "PBKDF2", salt: saltBytes, iterations: iteracoes, hash: "SHA-256" },
            material, 256
        );
        return bytesParaHex(new Uint8Array(bits));
    }

    // Comparação em tempo constante (evita vazar informação pelo tempo de resposta)
    function compararSeguro(a, b) {
        if (a.length !== b.length) return false;
        let diferenca = 0;
        for (let i = 0; i < a.length; i++) {
            diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return diferenca === 0;
    }

    async function criarRegistroConta(nome, email, senha) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const hash = await gerarHash(senha, salt, ITERACOES_HASH);
        return { nome, email, salt: bytesParaHex(salt), hash, iteracoes: ITERACOES_HASH };
    }

    function iteracoesValidas(valor) {
        return Number.isInteger(valor) && valor >= 10000 && valor <= 1000000
            ? valor
            : ITERACOES_HASH;
    }

    async function verificarSenha(conta, senha) {
        // Conta atual: compara o hash
        if (conta.hash && conta.salt) {
            const hash = await gerarHash(
                senha, hexParaBytes(conta.salt), iteracoesValidas(conta.iteracoes)
            );
            return compararSeguro(hash, String(conta.hash));
        }

        // Conta antiga (senha em texto simples): valida e migra para hash
        if (typeof conta.senha === "string" && compararSeguro(conta.senha, senha)) {
            const registro = await criarRegistroConta(
                limparTexto(conta.nome) || "Usuário", normalizarEmail(conta.email), senha
            );
            salvarJSON(CHAVES.conta, registro);
            return true;
        }

        return false;
    }

    function lerConta() {
        const conta = lerJSON(CHAVES.conta, null);
        return conta && typeof conta === "object" && !Array.isArray(conta) ? conta : null;
    }

    // ==========================================
    // MENSAGENS E ERROS DE CAMPO
    // ==========================================
    let elMensagem = null;

    function mostrarMensagem(texto, tipo) {
        elMensagem.className = `alerta alerta--${tipo}`;
        elMensagem.textContent = texto;
        elMensagem.hidden = false;
    }

    function limparMensagem() {
        elMensagem.hidden = true;
        elMensagem.textContent = "";
    }

    function definirErro(input, texto) {
        const elErro = document.getElementById(`${input.id}-erro`);
        if (elErro) elErro.textContent = texto;
        input.setAttribute("aria-invalid", texto ? "true" : "false");
    }

    function limparErros(formulario) {
        formulario.querySelectorAll("input").forEach(input => definirErro(input, ""));
    }

    // Usado nas validações: guarda o primeiro campo com erro para dar foco
    function criarValidador() {
        let primeiro = null;
        return {
            invalidar(input, texto) {
                definirErro(input, texto);
                if (!primeiro) primeiro = input;
            },
            finalizar() {
                if (primeiro) primeiro.focus();
                return primeiro === null;
            }
        };
    }

    // ==========================================
    // FORÇA DA SENHA
    // ==========================================
    function avaliarSenha(senha) {
        if (senha.length === 0) return { nivel: 0, texto: `Use no mínimo ${SENHA_MIN} caracteres.` };
        if (senha.length < SENHA_MIN) return { nivel: 1, texto: "Senha muito curta." };

        let pontos = 0;
        if (senha.length >= 12) pontos++;
        if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) pontos++;
        if (/\d/.test(senha)) pontos++;
        if (/[^A-Za-z0-9]/.test(senha)) pontos++;

        if (pontos <= 1) return { nivel: 2, texto: "Força da senha: razoável." };
        if (pontos === 2) return { nivel: 3, texto: "Força da senha: boa." };
        return { nivel: 4, texto: "Força da senha: forte." };
    }

    function atualizarForcaSenha(senha) {
        const { nivel, texto } = avaliarSenha(senha);
        const barra = document.getElementById("forca-barra");
        barra.dataset.nivel = String(nivel);
        barra.style.width = `${nivel * 25}%`;
        document.getElementById("forca-texto").textContent = texto;
    }

    // ==========================================
    // ABAS (Entrar / Criar conta) com teclado
    // ==========================================
    const abas = [];

    function selecionarAba(nome, focar) {
        limparMensagem();
        abas.forEach(item => {
            const ativa = item.nome === nome;
            item.aba.setAttribute("aria-selected", String(ativa));
            item.aba.tabIndex = ativa ? 0 : -1;
            item.painel.hidden = !ativa;
            if (ativa && focar) item.aba.focus();
        });
    }

    function iniciarAbas() {
        [
            { nome: "entrar", aba: "aba-entrar", painel: "painel-entrar" },
            { nome: "cadastro", aba: "aba-cadastro", painel: "painel-cadastro" }
        ].forEach(item => {
            abas.push({
                nome: item.nome,
                aba: document.getElementById(item.aba),
                painel: document.getElementById(item.painel)
            });
        });

        abas.forEach((item, indice) => {
            item.aba.addEventListener("click", () => selecionarAba(item.nome, false));

            item.aba.addEventListener("keydown", evento => {
                let destino = null;
                if (evento.key === "ArrowRight") destino = (indice + 1) % abas.length;
                if (evento.key === "ArrowLeft") destino = (indice - 1 + abas.length) % abas.length;
                if (evento.key === "Home") destino = 0;
                if (evento.key === "End") destino = abas.length - 1;

                if (destino !== null) {
                    evento.preventDefault();
                    selecionarAba(abas[destino].nome, true);
                }
            });
        });

        // Permite abrir direto na aba de cadastro: login.html?aba=cadastro
        const aba = new URLSearchParams(window.location.search).get("aba");
        if (aba === "cadastro") selecionarAba("cadastro", false);
    }

    // ==========================================
    // MOSTRAR / OCULTAR SENHA
    // ==========================================
    function iniciarBotoesSenha() {
        document.querySelectorAll(".campo-senha__ver").forEach(botao => {
            botao.addEventListener("click", () => {
                const input = document.getElementById(botao.dataset.alvo);
                const mostrar = input.type === "password";

                input.type = mostrar ? "text" : "password";
                botao.setAttribute("aria-pressed", String(mostrar));
                botao.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
                botao.querySelector("i").className = mostrar ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
            });
        });
    }

    // ==========================================
    // CADASTRO
    // ==========================================
    async function aoCadastrar(evento) {
        evento.preventDefault();
        const form = evento.currentTarget;
        limparMensagem();
        limparErros(form);

        if (!suportaCripto()) {
            mostrarMensagem(
                "Este navegador não suporta criptografia neste contexto. Abra o site por HTTPS ou localhost.",
                "erro"
            );
            return;
        }

        const campoNome = document.getElementById("cad-nome");
        const campoEmail = document.getElementById("cad-email");
        const campoSenha = document.getElementById("cad-senha");
        const campoConfirma = document.getElementById("cad-confirma");

        const nome = limparTexto(campoNome.value);
        const email = normalizarEmail(campoEmail.value);
        const senha = campoSenha.value;
        const confirma = campoConfirma.value;

        const validador = criarValidador();
        if (nome === null) {
            validador.invalidar(campoNome, `Informe seu nome com até ${LIMITE_TEXTO} caracteres.`);
        }
        if (!validarEmail(email)) {
            validador.invalidar(campoEmail, "Informe um e-mail válido, como nome@exemplo.com.");
        }
        if (senha.length < SENHA_MIN || senha.length > SENHA_MAX) {
            validador.invalidar(campoSenha, `A senha deve ter de ${SENHA_MIN} a ${SENHA_MAX} caracteres.`);
        } else if (confirma !== senha) {
            validador.invalidar(campoConfirma, "As senhas não são iguais.");
        }
        if (!validador.finalizar()) return;

        const contaExistente = lerConta();
        if (contaExistente) {
            const continuar = window.confirm(
                "Já existe uma conta neste navegador. Criar uma nova substitui a anterior " +
                "e apaga os dados salvos (despesas, metas e foto). Deseja continuar?"
            );
            if (!continuar) return;
        }

        const botao = form.querySelector("button[type='submit']");
        botao.disabled = true;

        try {
            const registro = await criarRegistroConta(nome, email, senha);
            if (contaExistente) limparDadosUsuario();

            if (!salvarJSON(CHAVES.conta, registro)) {
                mostrarMensagem("Não foi possível salvar a conta: o armazenamento do navegador está indisponível.", "erro");
                return;
            }
        } catch (erro) {
            console.error(erro);
            mostrarMensagem("Não foi possível criar a conta. Tente novamente.", "erro");
            return;
        } finally {
            botao.disabled = false;
        }

        form.reset();
        atualizarForcaSenha("");

        selecionarAba("entrar", false);
        document.getElementById("login-email").value = email;
        mostrarMensagem("Conta criada com sucesso! Digite sua senha para entrar.", "sucesso");
        document.getElementById("login-senha").focus();
    }

    // ==========================================
    // LOGIN
    // ==========================================
    async function aoEntrar(evento) {
        evento.preventDefault();
        const form = evento.currentTarget;
        limparMensagem();
        limparErros(form);

        const restante = Math.ceil((bloqueadoAte - Date.now()) / 1000);
        if (restante > 0) {
            mostrarMensagem(`Muitas tentativas. Aguarde ${restante} segundos para tentar de novo.`, "erro");
            return;
        }

        if (!suportaCripto()) {
            mostrarMensagem(
                "Este navegador não suporta criptografia neste contexto. Abra o site por HTTPS ou localhost.",
                "erro"
            );
            return;
        }

        const campoEmail = document.getElementById("login-email");
        const campoSenha = document.getElementById("login-senha");
        const email = normalizarEmail(campoEmail.value);
        const senha = campoSenha.value;

        const validador = criarValidador();
        if (!validarEmail(email)) {
            validador.invalidar(campoEmail, "Informe um e-mail válido, como nome@exemplo.com.");
        }
        if (senha.length === 0) {
            validador.invalidar(campoSenha, "Digite sua senha.");
        }
        if (!validador.finalizar()) return;

        const botao = form.querySelector("button[type='submit']");
        botao.disabled = true;

        let autenticado = false;
        let conta = null;

        try {
            conta = lerConta();
            if (conta && normalizarEmail(conta.email) === email) {
                autenticado = await verificarSenha(conta, senha);
            }
        } catch (erro) {
            console.error(erro);
        } finally {
            botao.disabled = false;
        }

        if (!autenticado) {
            tentativasFalhas++;
            campoSenha.value = "";

            if (tentativasFalhas >= MAX_TENTATIVAS) {
                tentativasFalhas = 0;
                bloqueadoAte = Date.now() + BLOQUEIO_MS;
                mostrarMensagem("Muitas tentativas erradas. Aguarde 30 segundos para tentar de novo.", "erro");
            } else {
                mostrarMensagem(MSG_CREDENCIAIS, "erro");
            }
            campoSenha.focus();
            return;
        }

        tentativasFalhas = 0;
        salvarTexto(CHAVES.sessao, limparTexto(conta.nome) || "Usuário");
        window.location.href = PAGINA_INICIO;
    }

    // ==========================================
    // INICIALIZAÇÃO
    // ==========================================
    aoCarregar(() => {
        // Quem já está logado vai direto para o painel
        if (estaLogado()) {
            window.location.replace(PAGINA_INICIO);
            return;
        }

        elMensagem = document.getElementById("mensagem");

        iniciarAbas();
        iniciarBotoesSenha();

        document.getElementById("painel-entrar").addEventListener("submit", aoEntrar);
        document.getElementById("painel-cadastro").addEventListener("submit", aoCadastrar);
        document.getElementById("cad-senha").addEventListener("input", evento => {
            atualizarForcaSenha(evento.target.value);
        });
    });
})();
