/* =========================================================
   CONTROLE CERTO - metas.js
   Página "Minhas Metas": criar objetivos, guardar dinheiro em
   cada meta (mini-formulário, sem prompt) e acompanhar o progresso.
   Depende de cc.js (window.CC).
   ========================================================= */
(function () {
    "use strict";

    if (!window.CC) return;

    const {
        LIMITE_TEXTO,
        aoCarregar, criarElemento, criarIcone, formatarMoeda, mostrarToast,
        limparTexto, parseValor, gerarId, lerMetas, salvarMetas
    } = window.CC;

    const MAX_METAS = 30;

    let metas = [];
    const el = {};

    // ==========================================
    // CÁLCULOS
    // ==========================================
    function arredondar(numero) {
        return Math.round(numero * 100) / 100;
    }

    function percentual(meta) {
        return Math.min(100, Math.floor((meta.guardado / meta.objetivo) * 100));
    }

    function concluida(meta) {
        return meta.guardado >= meta.objetivo;
    }

    // ==========================================
    // ERROS DE CAMPO
    // ==========================================
    function definirErro(input, texto) {
        const elErro = document.getElementById(`${input.id}-erro`);
        if (elErro) elErro.textContent = texto;
        input.setAttribute("aria-invalid", texto ? "true" : "false");
    }

    // ==========================================
    // RENDERIZAÇÃO
    // ==========================================
    function criarFormularioGuardar(meta) {
        const idCampo = `guardar-${meta.id}`;

        const rotulo = criarElemento("label", {
            classe: "sr-only",
            texto: `Valor a guardar na meta ${meta.nome}`,
            attrs: { for: idCampo }
        });

        const campo = criarElemento("input", {
            attrs: {
                type: "text",
                id: idCampo,
                inputmode: "decimal",
                autocomplete: "off",
                placeholder: "Valor (R$)",
                "aria-describedby": `${idCampo}-erro`
            }
        });

        const botao = criarElemento("button", {
            classe: "btn btn--pequeno",
            attrs: { type: "submit" }
        }, [criarIcone("fa-solid fa-piggy-bank"), document.createTextNode(" Guardar")]);

        return criarElemento("form", {
            classe: "form-guardar",
            attrs: { novalidate: "", "data-id": meta.id }
        }, [rotulo, campo, botao]);
    }

    function criarCartaoMeta(meta) {
        const pct = percentual(meta);
        const feita = concluida(meta);

        const barra = criarElemento("div", { classe: "progresso__barra" });
        barra.style.width = `${pct}%`;

        const progresso = criarElemento("div", {
            classe: "progresso",
            attrs: {
                role: "progressbar",
                "aria-valuemin": "0",
                "aria-valuemax": "100",
                "aria-valuenow": String(pct),
                "aria-label": `Progresso da meta ${meta.nome}`
            }
        }, [barra]);

        const topo = criarElemento("div", { classe: "meta__topo" }, [
            criarElemento("h3", { classe: "meta__nome", texto: meta.nome }),
            criarElemento("span", {
                classe: "meta__valores",
                texto: `${formatarMoeda(meta.guardado)} de ${formatarMoeda(meta.objetivo)}`
            })
        ]);

        const status = feita
            ? criarElemento("span", { classe: "meta__concluida" }, [
                criarIcone("fa-solid fa-circle-check"),
                document.createTextNode(" Meta concluída!")
            ])
            : criarElemento("span", {
                classe: "meta__percentual",
                texto: `${pct}% concluído · faltam ${formatarMoeda(meta.objetivo - meta.guardado)}`
            });

        const botaoExcluir = criarElemento("button", {
            classe: "btn btn--perigo btn--pequeno",
            attrs: {
                type: "button",
                "data-excluir": meta.id,
                "aria-label": `Excluir meta ${meta.nome}`
            }
        }, [criarIcone("fa-solid fa-trash"), document.createTextNode(" Excluir")]);

        const acoes = criarElemento("div", { classe: "meta__acoes" });
        if (!feita) acoes.append(criarFormularioGuardar(meta));
        acoes.append(botaoExcluir);

        const rodape = criarElemento("div", { classe: "meta__rodape" }, [status, acoes]);

        const erro = criarElemento("p", {
            classe: "campo-erro",
            attrs: { id: `guardar-${meta.id}-erro`, role: "alert" }
        });

        return criarElemento("article", {
            classe: "meta",
            attrs: { "data-id": meta.id }
        }, [topo, progresso, rodape, erro]);
    }

    function renderizar() {
        el.lista.replaceChildren(...metas.map(criarCartaoMeta));

        const vazio = metas.length === 0;
        el.vazio.hidden = !vazio;

        if (vazio) {
            el.resumo.textContent = "";
            return;
        }

        const totalGuardado = metas.reduce((soma, m) => soma + m.guardado, 0);
        const totalObjetivo = metas.reduce((soma, m) => soma + m.objetivo, 0);
        const feitas = metas.filter(concluida).length;
        el.resumo.textContent =
            `${metas.length === 1 ? "1 meta" : `${metas.length} metas`} · ` +
            `${feitas} concluída${feitas === 1 ? "" : "s"} · ` +
            `${formatarMoeda(totalGuardado)} guardados de ${formatarMoeda(totalObjetivo)}`;
    }

    // ==========================================
    // CRIAR META
    // ==========================================
    function aoCriarMeta(evento) {
        evento.preventDefault();

        const campoNome = document.getElementById("nome-meta");
        const campoValor = document.getElementById("valor-meta");
        definirErro(campoNome, "");
        definirErro(campoValor, "");

        const nome = limparTexto(campoNome.value);
        const objetivo = parseValor(campoValor.value);

        let primeiroInvalido = null;
        if (nome === null) {
            definirErro(campoNome, `Informe um nome de 1 a ${LIMITE_TEXTO} caracteres.`);
            primeiroInvalido = campoNome;
        }
        if (objetivo === null) {
            definirErro(campoValor, "Informe um valor maior que zero, como 5000,00.");
            primeiroInvalido = primeiroInvalido || campoValor;
        }
        if (primeiroInvalido) {
            primeiroInvalido.focus();
            return;
        }

        if (metas.length >= MAX_METAS) {
            mostrarToast(`Limite de ${MAX_METAS} metas atingido. Exclua alguma para criar outra.`, "erro");
            return;
        }

        const novaLista = [...metas, { id: gerarId(), nome, objetivo, guardado: 0 }];
        if (!salvarMetas(novaLista)) {
            mostrarToast("Não foi possível salvar: o armazenamento do navegador está indisponível.", "erro");
            return;
        }
        metas = novaLista;

        evento.currentTarget.reset();
        renderizar();
        mostrarToast(`Meta "${nome}" criada.`);
        campoNome.focus();
    }

    // ==========================================
    // GUARDAR DINHEIRO NUMA META
    // ==========================================
    function aoGuardar(evento) {
        const form = evento.target.closest("form[data-id]");
        if (!form) return;
        evento.preventDefault();

        const meta = metas.find(m => m.id === form.dataset.id);
        if (!meta) return;

        const campo = form.querySelector("input");
        definirErro(campo, "");

        const valor = parseValor(campo.value);
        if (valor === null) {
            definirErro(campo, "Informe um valor maior que zero, como 100,00.");
            campo.focus();
            return;
        }

        const novoGuardado = arredondar(Math.min(meta.objetivo, meta.guardado + valor));
        const novaLista = metas.map(m => (m.id === meta.id ? { ...m, guardado: novoGuardado } : m));

        if (!salvarMetas(novaLista)) {
            mostrarToast("Não foi possível salvar: o armazenamento do navegador está indisponível.", "erro");
            return;
        }
        metas = novaLista;
        renderizar();

        const atualizada = metas.find(m => m.id === meta.id);
        if (concluida(atualizada)) {
            mostrarToast(`Parabéns! Você atingiu a meta "${meta.nome}".`);
            const botao = el.lista.querySelector(`button[data-excluir="${meta.id}"]`);
            if (botao) botao.focus();
        } else {
            mostrarToast(`${formatarMoeda(Math.min(valor, meta.objetivo - meta.guardado))} guardados em "${meta.nome}".`);
            const novoCampo = document.getElementById(`guardar-${meta.id}`);
            if (novoCampo) novoCampo.focus();
        }
    }

    // ==========================================
    // EXCLUIR META
    // ==========================================
    function aoClicarLista(evento) {
        const botao = evento.target.closest("button[data-excluir]");
        if (!botao) return;

        const meta = metas.find(m => m.id === botao.dataset.excluir);
        if (!meta) return;

        const confirmou = window.confirm(`Excluir a meta "${meta.nome}"? O valor guardado nela será perdido.`);
        if (!confirmou) return;

        const novaLista = metas.filter(m => m.id !== meta.id);
        if (!salvarMetas(novaLista)) {
            mostrarToast("Não foi possível excluir: o armazenamento do navegador está indisponível.", "erro");
            return;
        }
        metas = novaLista;

        renderizar();
        mostrarToast("Meta excluída.");
        document.getElementById("titulo-acompanhamento").focus();
    }

    // ==========================================
    // INICIALIZAÇÃO
    // ==========================================
    aoCarregar(() => {
        el.lista = document.getElementById("lista-metas");
        el.vazio = document.getElementById("vazio-metas");
        el.resumo = document.getElementById("resumo-metas");

        metas = lerMetas();

        document.getElementById("form-meta").addEventListener("submit", aoCriarMeta);
        el.lista.addEventListener("submit", aoGuardar);
        el.lista.addEventListener("click", aoClicarLista);

        renderizar();
    });
})();
