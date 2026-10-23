/* =========================================================
   CONTROLE CERTO - sobre.js
   Página "Sobre":
   1) formulário de contato (demonstração, guarda no navegador);
   2) edição da conta: foto e nome de exibição;
   3) apagar os dados financeiros.
   Depende de cc.js (window.CC).
   ========================================================= */
(function () {
    "use strict";

    if (!window.CC) return;

    const {
        CHAVES, LIMITE_TEXTO, REGEX_FOTO,
        aoCarregar, lerJSON, salvarJSON, salvarTexto, lerTexto, remover,
        limparTexto, validarEmail, normalizarEmail, mostrarToast,
        aplicarFoto, aplicarNome, usuarioAtual, gerarId
    } = window.CC;

    const CHAVE_MENSAGENS = "mensagensContato";
    const MAX_MENSAGENS_GUARDADAS = 20;
    const MENSAGEM_MIN = 10;
    const MENSAGEM_MAX = 500;
    const FOTO_MAX_BYTES = 1024 * 1024; // 1 MB
    const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];
    const ASSUNTOS = ["duvida", "sugestao", "problema", "elogio"];

    const el = {};

    // ==========================================
    // ERROS DE CAMPO
    // ==========================================
    function definirErro(campo, texto) {
        const elErro = document.getElementById(`${campo.id}-erro`);
        if (elErro) elErro.textContent = texto;
        campo.setAttribute("aria-invalid", texto ? "true" : "false");
    }

    function lerContaSalva() {
        const conta = lerJSON(CHAVES.conta, null);
        return conta && typeof conta === "object" && !Array.isArray(conta) ? conta : null;
    }

    // ==========================================
    // 1) CONTATO
    // ==========================================
    function atualizarContador() {
        el.contador.textContent = `${el.mensagem.value.length}/${MENSAGEM_MAX} caracteres`;
    }

    function preencherDadosDoContato() {
        const conta = lerContaSalva();
        el.contatoNome.value = usuarioAtual().slice(0, LIMITE_TEXTO);
        el.contatoEmail.value = conta && typeof conta.email === "string" ? conta.email : "";
        atualizarContador();
    }

    function aoEnviarContato(evento) {
        evento.preventDefault();
        const form = evento.currentTarget;

        [el.contatoNome, el.contatoEmail, el.assunto, el.mensagem].forEach(campo => definirErro(campo, ""));
        el.msgContato.hidden = true;

        const nome = limparTexto(el.contatoNome.value);
        const email = normalizarEmail(el.contatoEmail.value);
        const assunto = el.assunto.value;
        const mensagem = el.mensagem.value.trim();

        let primeiroInvalido = null;
        const invalidar = (campo, texto) => {
            definirErro(campo, texto);
            if (!primeiroInvalido) primeiroInvalido = campo;
        };

        if (nome === null) invalidar(el.contatoNome, `Informe seu nome com até ${LIMITE_TEXTO} caracteres.`);
        if (!validarEmail(email)) invalidar(el.contatoEmail, "Informe um e-mail válido, como nome@exemplo.com.");
        if (!ASSUNTOS.includes(assunto)) invalidar(el.assunto, "Escolha um assunto.");
        if (mensagem.length < MENSAGEM_MIN) {
            invalidar(el.mensagem, `Escreva pelo menos ${MENSAGEM_MIN} caracteres.`);
        } else if (mensagem.length > MENSAGEM_MAX) {
            invalidar(el.mensagem, `A mensagem pode ter no máximo ${MENSAGEM_MAX} caracteres.`);
        }

        if (primeiroInvalido) {
            primeiroInvalido.focus();
            return;
        }

        const guardadas = lerJSON(CHAVE_MENSAGENS, []);
        const novaLista = [
            ...guardadas,
            { id: gerarId(), data: new Date().toISOString(), nome, email, assunto, mensagem }
        ].slice(-MAX_MENSAGENS_GUARDADAS);

        if (!salvarJSON(CHAVE_MENSAGENS, novaLista)) {
            mostrarToast("Não foi possível registrar a mensagem: o armazenamento do navegador está indisponível.", "erro");
            return;
        }

        form.reset();
        preencherDadosDoContato();
        el.msgContato.textContent = "Mensagem registrada com sucesso! Obrigado pelo contato (demonstração: ela fica salva só neste navegador).";
        el.msgContato.hidden = false;
        mostrarToast("Mensagem registrada.");
    }

    // ==========================================
    // 2) FOTO DE PERFIL
    // ==========================================
    function atualizarBotaoRemoverFoto() {
        el.removerFoto.disabled = lerTexto(CHAVES.foto) === "";
    }

    function aoEscolherFoto(evento) {
        const entrada = evento.target;
        const arquivo = entrada.files && entrada.files[0];
        el.fotoErro.textContent = "";
        if (!arquivo) return;

        if (!TIPOS_FOTO.includes(arquivo.type)) {
            el.fotoErro.textContent = "Escolha uma imagem JPG, PNG ou WebP.";
            entrada.value = "";
            return;
        }
        if (arquivo.size > FOTO_MAX_BYTES) {
            el.fotoErro.textContent = "A imagem deve ter até 1 MB. Escolha uma menor.";
            entrada.value = "";
            return;
        }

        const leitor = new FileReader();

        leitor.onload = () => {
            const resultado = String(leitor.result);

            if (!REGEX_FOTO.test(resultado)) {
                el.fotoErro.textContent = "Não foi possível usar esta imagem. Tente outra.";
            } else if (!salvarTexto(CHAVES.foto, resultado)) {
                el.fotoErro.textContent = "Não há espaço para salvar a foto. Tente uma imagem menor.";
            } else {
                aplicarFoto(resultado);
                atualizarBotaoRemoverFoto();
                mostrarToast("Foto atualizada.");
            }
            entrada.value = "";
        };

        leitor.onerror = () => {
            el.fotoErro.textContent = "Não foi possível ler o arquivo. Tente novamente.";
            entrada.value = "";
        };

        leitor.readAsDataURL(arquivo);
    }

    function aoRemoverFoto() {
        el.fotoErro.textContent = "";
        remover(CHAVES.foto);
        aplicarFoto("");
        atualizarBotaoRemoverFoto();
        mostrarToast("Foto removida.");
    }

    // ==========================================
    // 3) NOME DE EXIBIÇÃO
    // ==========================================
    function aoSalvarNome(evento) {
        evento.preventDefault();
        definirErro(el.nomeConta, "");

        const nome = limparTexto(el.nomeConta.value);
        if (nome === null) {
            definirErro(el.nomeConta, `Informe um nome de 1 a ${LIMITE_TEXTO} caracteres.`);
            el.nomeConta.focus();
            return;
        }

        // O nome precisa mudar na sessão E na conta: o login lê o nome da conta
        const conta = lerContaSalva();
        if (conta && !salvarJSON(CHAVES.conta, { ...conta, nome })) {
            mostrarToast("Não foi possível salvar: o armazenamento do navegador está indisponível.", "erro");
            return;
        }
        if (!salvarTexto(CHAVES.sessao, nome)) {
            mostrarToast("Não foi possível salvar: o armazenamento do navegador está indisponível.", "erro");
            return;
        }

        el.nomeConta.value = nome;
        aplicarNome(nome);
        mostrarToast("Nome atualizado.");
    }

    // ==========================================
    // 4) APAGAR DADOS FINANCEIROS
    // ==========================================
    function aoApagarDados() {
        const confirmou = window.confirm(
            "Apagar a renda, as despesas e as metas? Essa ação não pode ser desfeita."
        );
        if (!confirmou) return;

        [CHAVES.renda, CHAVES.despesas, CHAVES.metas].forEach(remover);
        mostrarToast("Dados financeiros apagados.");
    }

    // ==========================================
    // INICIALIZAÇÃO
    // ==========================================
    aoCarregar(() => {
        el.contatoNome = document.getElementById("contato-nome");
        el.contatoEmail = document.getElementById("contato-email");
        el.assunto = document.getElementById("contato-assunto");
        el.mensagem = document.getElementById("contato-mensagem");
        el.contador = document.getElementById("contato-contador");
        el.msgContato = document.getElementById("msg-contato");
        el.fotoErro = document.getElementById("foto-erro");
        el.removerFoto = document.getElementById("foto-remover");
        el.nomeConta = document.getElementById("editar-nome");

        preencherDadosDoContato();
        el.nomeConta.value = usuarioAtual();
        atualizarBotaoRemoverFoto();

        document.getElementById("form-contato").addEventListener("submit", aoEnviarContato);
        el.mensagem.addEventListener("input", atualizarContador);

        document.getElementById("foto-input").addEventListener("change", aoEscolherFoto);
        el.removerFoto.addEventListener("click", aoRemoverFoto);
        document.getElementById("form-conta").addEventListener("submit", aoSalvarNome);
        document.getElementById("apagar-dados").addEventListener("click", aoApagarDados);
    });
})();
