/* =========================================================
   CONTROLE CERTO - relatorios.js
   Página "Relatórios e dicas":
   1) gastos por categoria, com filtro de período;
   2) regra 50/30/20 comparando o limite ideal com o gasto real.
   Depende de cc.js (window.CC).
   ========================================================= */
(function () {
    "use strict";

    if (!window.CC) return;

    const {
        CATEGORIAS,
        aoCarregar, criarElemento, criarIcone, formatarMoeda,
        chaveMes, rotuloMes,
        lerDespesas, lerMetas, lerRenda
    } = window.CC;

    // Ícone de cada categoria (Font Awesome)
    const ICONES = {
        moradia: "fa-house",
        alimentacao: "fa-utensils",
        transporte: "fa-bus",
        saude: "fa-heart-pulse",
        educacao: "fa-graduation-cap",
        lazer: "fa-gamepad",
        compras: "fa-bag-shopping",
        outros: "fa-ellipsis"
    };

    // Regra 50/30/20: prefixo dos ids no HTML, percentual e grupo de categorias
    const REGRA = [
        { sigla: "nec", percentual: 0.5, grupo: "necessidade", nome: "necessidades" },
        { sigla: "des", percentual: 0.3, grupo: "desejo", nome: "desejos" },
        { sigla: "poup", percentual: 0.2, grupo: null, nome: "poupança" }
    ];

    let despesas = [];
    let filtro = "todos";
    const el = {};

    // ==========================================
    // DADOS DO PERÍODO
    // ==========================================
    function mesesComDespesas() {
        return Array.from(new Set(despesas.map(d => chaveMes(d.data)))).sort().reverse();
    }

    function despesasDoPeriodo() {
        if (filtro === "todos") return despesas;
        return despesas.filter(d => chaveMes(d.data) === filtro);
    }

    function somar(lista) {
        return lista.reduce((total, d) => total + d.valor, 0);
    }

    // Em "todos os períodos", a renda vale por cada mês que tem lançamentos
    function rendaDoPeriodo() {
        const meses = filtro === "todos" ? Math.max(1, mesesComDespesas().length) : 1;
        return lerRenda() * meses;
    }

    // ==========================================
    // FILTRO DE PERÍODO
    // ==========================================
    function atualizarFiltro() {
        const meses = mesesComDespesas();
        if (filtro !== "todos" && !meses.includes(filtro)) filtro = "todos";

        const novos = ["todos", ...meses];
        const atuais = Array.from(el.filtro.options, opcao => opcao.value);
        const mudou = novos.length !== atuais.length || novos.some((v, i) => v !== atuais[i]);

        if (mudou) {
            el.filtro.replaceChildren(
                criarElemento("option", { texto: "Todos os períodos", attrs: { value: "todos" } }),
                ...meses.map(mes => criarElemento("option", { texto: rotuloMes(mes), attrs: { value: mes } }))
            );
        }
        el.filtro.value = filtro;
    }

    // ==========================================
    // 1) GASTOS POR CATEGORIA
    // ==========================================
    function totaisPorCategoria(lista) {
        const totais = new Map();
        lista.forEach(d => totais.set(d.categoria, (totais.get(d.categoria) || 0) + d.valor));

        return CATEGORIAS
            .filter(c => totais.has(c.id))
            .map(c => ({ categoria: c, total: totais.get(c.id) }))
            .sort((a, b) => b.total - a.total);
    }

    function criarItemRelatorio(item, totalGeral) {
        const percentual = totalGeral > 0 ? Math.round((item.total / totalGeral) * 100) : 0;

        const nome = criarElemento("span", { classe: "relatorio-item__nome" }, [
            criarIcone(`fa-solid ${ICONES[item.categoria.id] || "fa-ellipsis"}`),
            document.createTextNode(`${item.categoria.nome} · ${percentual}%`)
        ]);

        const valor = criarElemento("strong", {
            classe: "relatorio-item__valor",
            texto: formatarMoeda(item.total)
        });

        return criarElemento("div", { classe: "relatorio-item" }, [nome, valor]);
    }

    function renderizarCategorias(lista) {
        const totais = totaisPorCategoria(lista);
        const totalGeral = somar(lista);
        const vazio = totais.length === 0;

        el.areaRelatorio.hidden = vazio;
        el.vazioRelatorio.hidden = !vazio;

        el.lista.replaceChildren(...totais.map(item => criarItemRelatorio(item, totalGeral)));
        el.totalGeral.textContent = formatarMoeda(totalGeral);
    }

    // ==========================================
    // 2) REGRA 50/30/20
    // ==========================================
    function gastoDoGrupo(lista, grupo) {
        const ids = CATEGORIAS.filter(c => c.grupo === grupo).map(c => c.id);
        return somar(lista.filter(d => ids.includes(d.categoria)));
    }

    function nomesDoGrupo(grupo) {
        return CATEGORIAS.filter(c => c.grupo === grupo).map(c => c.nome).join(", ");
    }

    // Mostra a mensagem de situação (ícone + texto, nunca só cor)
    function definirStatus(elemento, tipo, icone, texto) {
        elemento.className = tipo ? `dica__status dica__status--${tipo}` : "dica__status";
        elemento.replaceChildren(criarIcone(`fa-solid ${icone}`), document.createTextNode(texto));
    }

    function renderizarRegra(lista) {
        const renda = rendaDoPeriodo();
        const metas = lerMetas();
        const guardado = metas.reduce((soma, m) => soma + m.guardado, 0);

        el.avisoRenda.hidden = renda > 0;

        REGRA.forEach(regra => {
            const limite = renda * regra.percentual;
            const ehPoupanca = regra.grupo === null;
            const real = ehPoupanca ? guardado : gastoDoGrupo(lista, regra.grupo);

            const campoLimite = document.getElementById(`${regra.sigla}-limite`);
            const campoReal = document.getElementById(`${regra.sigla}-real`);
            const rotuloReal = document.getElementById(`${regra.sigla}-rotulo-real`);
            const inclui = document.getElementById(`${regra.sigla}-inclui`);
            const progresso = document.getElementById(`${regra.sigla}-progresso`);
            const barra = document.getElementById(`${regra.sigla}-barra`);
            const status = document.getElementById(`${regra.sigla}-status`);

            campoLimite.textContent = formatarMoeda(limite);
            campoReal.textContent = formatarMoeda(real);

            if (ehPoupanca) {
                rotuloReal.textContent = "Total guardado nas metas (acumulado)";
                inclui.textContent = "Soma do que você já guardou na página Metas.";
            } else {
                rotuloReal.textContent = "Gasto real no período";
                inclui.textContent = `Categorias: ${nomesDoGrupo(regra.grupo)}.`;
            }

            const uso = limite > 0 ? (real / limite) * 100 : 0;
            const pct = Math.min(100, Math.round(uso));
            const excedeu = !ehPoupanca && limite > 0 && real > limite;

            barra.style.width = `${pct}%`;
            barra.classList.toggle("progresso__barra--excedido", excedeu);
            progresso.setAttribute("aria-valuenow", String(pct));

            if (limite === 0) {
                definirStatus(status, "", "fa-circle-info", "Informe sua renda para ver a comparação.");
            } else if (ehPoupanca && real >= limite) {
                definirStatus(status, "ok", "fa-circle-check", "Meta de poupança atingida!");
            } else if (ehPoupanca) {
                definirStatus(status, "", "fa-circle-info", `Faltam ${formatarMoeda(limite - real)} para chegar nos 20%.`);
            } else if (excedeu) {
                definirStatus(status, "alerta", "fa-triangle-exclamation", `Acima do limite em ${formatarMoeda(real - limite)}.`);
            } else {
                definirStatus(status, "ok", "fa-circle-check", `Dentro do limite. Ainda restam ${formatarMoeda(limite - real)}.`);
            }
        });
    }

    // ==========================================
    // ATUALIZAÇÃO GERAL
    // ==========================================
    function atualizarTudo() {
        atualizarFiltro();
        const lista = despesasDoPeriodo();
        renderizarCategorias(lista);
        renderizarRegra(lista);
    }

    // ==========================================
    // INICIALIZAÇÃO
    // ==========================================
    aoCarregar(() => {
        el.filtro = document.getElementById("filtro-mes");
        el.areaRelatorio = document.getElementById("area-relatorio");
        el.vazioRelatorio = document.getElementById("vazio-relatorio");
        el.lista = document.getElementById("lista-relatorio");
        el.totalGeral = document.getElementById("total-geral-relatorio");
        el.avisoRenda = document.getElementById("aviso-renda");

        despesas = lerDespesas();

        el.filtro.addEventListener("change", () => {
            filtro = el.filtro.value;
            atualizarTudo();
        });

        atualizarTudo();
    });
})();
