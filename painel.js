/* =========================================================
   CONTROLE CERTO - painel.js
   Página inicial: renda, despesas, filtro por período,
   histórico e gráfico por categoria.
   Depende de cc.js (window.CC) e, opcionalmente, do Chart.js.
   ========================================================= */
(function () {
    "use strict";

    if (!window.CC) return;

    const {
        CATEGORIAS, LIMITE_TEXTO,
        aoCarregar, criarElemento, criarIcone, formatarMoeda, mostrarToast,
        limparTexto, parseValor, lerCampoData, hojeISO, gerarId,
        chaveMes, chaveOrdem, rotuloMes, buscarCategoria,
        lerDespesas, salvarDespesas, lerRenda, salvarRenda
    } = window.CC;

    // Tons de azul, ciano e índigo (o tema não usa verde)
    const CORES_GRAFICO = [
        "#4DA3FF", "#22C7F2", "#8B9CFF", "#2F86E6",
        "#7DD3FC", "#A5B4FC", "#60A5FA", "#38BDF8"
    ];

    let despesas = [];
    let filtro = "todos";
    let grafico = null;

    // Referências do DOM (preenchidas na inicialização)
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

    // ==========================================
    // FILTRO POR MÊS (só meses que têm despesas)
    // ==========================================
    function atualizarFiltro() {
        const meses = mesesComDespesas();
        if (filtro !== "todos" && !meses.includes(filtro)) filtro = "todos";

        const valoresNovos = ["todos", ...meses];
        const valoresAtuais = Array.from(el.filtro.options, opcao => opcao.value);
        const mudou = valoresNovos.length !== valoresAtuais.length
            || valoresNovos.some((valor, i) => valor !== valoresAtuais[i]);

        // Só reconstrói quando a lista de meses muda (não atrapalha quem está escolhendo)
        if (mudou) {
            el.filtro.replaceChildren(
                criarElemento("option", { texto: "Todos os períodos", attrs: { value: "todos" } }),
                ...meses.map(mes => criarElemento("option", { texto: rotuloMes(mes), attrs: { value: mes } }))
            );
        }
        el.filtro.value = filtro;
    }

    // ==========================================
    // RESUMO
    // ==========================================
    function renderizarResumo(lista) {
        const renda = lerRenda();
        const totalDespesas = somar(lista);

        // Em "todos os períodos", a renda é multiplicada pelos meses que têm lançamentos
        const quantidadeMeses = filtro === "todos" ? Math.max(1, mesesComDespesas().length) : 1;
        const rendaPeriodo = renda * quantidadeMeses;
        const saldo = rendaPeriodo - totalDespesas;

        el.resumoRenda.textContent = formatarMoeda(rendaPeriodo);
        el.resumoRendaNota.textContent = renda === 0
            ? "Informe sua renda mensal acima."
            : quantidadeMeses > 1
                ? `${formatarMoeda(renda)} por mês × ${quantidadeMeses} meses`
                : "Renda mensal";

        el.resumoDespesas.textContent = formatarMoeda(totalDespesas);
        el.resumoDespesasNota.textContent = lista.length === 1
            ? "1 lançamento"
            : `${lista.length} lançamentos`;

        el.saldo.textContent = formatarMoeda(saldo);
        el.saldo.classList.toggle("saldo-negativo", saldo < 0);
        el.saldo.classList.toggle("saldo-positivo", saldo >= 0 && rendaPeriodo > 0);
    }

    // ==========================================
    // HISTÓRICO (tabela)
    // ==========================================
    function criarCelula(rotulo, conteudo) {
        const celula = criarElemento("td", { attrs: { "data-label": rotulo } });
        celula.append(conteudo);
        return celula;
    }

    function criarLinha(despesa) {
        const botaoExcluir = criarElemento("button", {
            classe: "btn btn--perigo btn--pequeno",
            attrs: {
                type: "button",
                "data-id": despesa.id,
                "aria-label": `Excluir despesa ${despesa.descricao}`
            }
        }, [criarIcone("fa-solid fa-trash"), document.createTextNode(" Excluir")]);

        const tipo = criarElemento("span", {
            classe: despesa.recorrente ? "etiqueta etiqueta--destaque" : "etiqueta",
            texto: despesa.recorrente ? "Recorrente" : "Única"
        });

        const linha = criarElemento("tr");
        linha.append(
            criarCelula("Data", despesa.data),
            criarCelula("Descrição", despesa.descricao),
            criarCelula("Categoria", criarElemento("span", {
                classe: "etiqueta",
                texto: buscarCategoria(despesa.categoria).nome
            })),
            criarCelula("Valor", criarElemento("span", {
                classe: "valor-despesa",
                texto: formatarMoeda(despesa.valor)
            })),
            criarCelula("Tipo", tipo),
            criarCelula("Ações", botaoExcluir)
        );
        return linha;
    }

    function renderizarTabela(lista) {
        const ordenada = [...lista].sort((a, b) => chaveOrdem(b.data).localeCompare(chaveOrdem(a.data)));

        el.corpoTabela.replaceChildren(...ordenada.map(criarLinha));

        const vazio = ordenada.length === 0;
        el.areaTabela.hidden = vazio;
        el.vazioHistorico.hidden = !vazio;
    }

    // ==========================================
    // GRÁFICO POR CATEGORIA
    // ==========================================
    function totaisPorCategoria(lista) {
        const mapa = new Map();
        lista.forEach(d => {
            const nome = buscarCategoria(d.categoria).nome;
            mapa.set(nome, (mapa.get(nome) || 0) + d.valor);
        });
        return Array.from(mapa.entries()).sort((a, b) => b[1] - a[1]);
    }

    function destruirGrafico() {
        if (grafico) {
            grafico.destroy();
            grafico = null;
        }
    }

    function renderizarGrafico(lista) {
        const totais = totaisPorCategoria(lista);
        const semDados = totais.length === 0;
        const semBiblioteca = typeof window.Chart === "undefined";

        el.areaGrafico.hidden = semDados || semBiblioteca;
        el.vazioGrafico.hidden = !(semDados || semBiblioteca);
        el.vazioGrafico.textContent = semDados
            ? "Cadastre despesas para ver o gráfico por categoria."
            : "Não foi possível carregar o gráfico. Verifique sua conexão com a internet.";

        destruirGrafico();
        if (semDados || semBiblioteca) return;

        const resumo = totais.map(([nome, valor]) => `${nome} ${formatarMoeda(valor)}`).join(", ");
        el.canvas.setAttribute("aria-label", `Gráfico de rosca dos gastos por categoria: ${resumo}`);

        grafico = new window.Chart(el.canvas, {
            type: "doughnut",
            data: {
                labels: totais.map(([nome]) => nome),
                datasets: [{
                    data: totais.map(([, valor]) => valor),
                    backgroundColor: totais.map((_, i) => CORES_GRAFICO[i % CORES_GRAFICO.length]),
                    borderColor: "#1E293B",
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: "bottom", labels: { color: "#A9B6CE", padding: 14 } },
                    tooltip: {
                        callbacks: {
                            label: contexto => ` ${contexto.label}: ${formatarMoeda(contexto.parsed)}`
                        }
                    }
                }
            }
        });
    }

    // ==========================================
    // ATUALIZAÇÃO GERAL
    // ==========================================
    function atualizarTudo() {
        atualizarFiltro();
        const lista = despesasDoPeriodo();
        renderizarResumo(lista);
        renderizarTabela(lista);
        renderizarGrafico(lista);
    }

    // ==========================================
    // ERROS DE CAMPO
    // ==========================================
    function definirErro(input, texto) {
        const elErro = document.getElementById(`${input.id}-erro`);
        if (elErro) elErro.textContent = texto;
        input.setAttribute("aria-invalid", texto ? "true" : "false");
    }

    function limparErros(form) {
        form.querySelectorAll("input").forEach(input => definirErro(input, ""));
    }

    // ==========================================
    // RENDA MENSAL
    // ==========================================
    function aoSalvarRenda(evento) {
        evento.preventDefault();
        definirErro(el.inputRenda, "");

        const renda = parseValor(el.inputRenda.value);
        if (renda === null) {
            definirErro(el.inputRenda, "Informe um valor válido, como 3500,00.");
            el.inputRenda.focus();
            return;
        }

        if (!salvarRenda(renda)) {
            mostrarToast("Não foi possível salvar: o armazenamento do navegador está indisponível.", "erro");
            return;
        }

        el.inputRenda.value = renda.toFixed(2).replace(".", ",");
        mostrarToast("Renda mensal salva.");
        atualizarTudo();
    }

    // ==========================================
    // NOVA DESPESA
    // ==========================================
    function aoCadastrarDespesa(evento) {
        evento.preventDefault();
        const form = evento.currentTarget;
        limparErros(form);

        const campoData = document.getElementById("data");
        const campoDescricao = document.getElementById("descricao");
        const campoValor = document.getElementById("valor");

        const data = lerCampoData(campoData.value);
        const descricao = limparTexto(campoDescricao.value);
        const valor = parseValor(campoValor.value);

        let primeiroInvalido = null;
        const invalidar = (campo, mensagem) => {
            definirErro(campo, mensagem);
            if (!primeiroInvalido) primeiroInvalido = campo;
        };

        if (data === null) invalidar(campoData, "Escolha uma data válida entre 2000 e 2100.");
        if (descricao === null) invalidar(campoDescricao, `Informe uma descrição de 1 a ${LIMITE_TEXTO} caracteres.`);
        if (valor === null) invalidar(campoValor, "Informe um valor maior que zero, como 150,00.");

        if (primeiroInvalido) {
            primeiroInvalido.focus();
            return;
        }

        const nova = {
            id: gerarId(),
            data,
            descricao,
            categoria: el.categoria.value,
            valor,
            recorrente: document.getElementById("recorrente").checked
        };

        const novaLista = [...despesas, nova];
        if (!salvarDespesas(novaLista)) {
            mostrarToast("Não foi possível salvar: o armazenamento do navegador está indisponível.", "erro");
            return;
        }
        despesas = novaLista;

        form.reset();
        campoData.value = hojeISO();
        atualizarTudo();
        mostrarToast(`Despesa cadastrada em ${rotuloMes(chaveMes(data))}.`);
        campoDescricao.focus();
    }

    // ==========================================
    // EXCLUIR DESPESA
    // ==========================================
    function aoClicarTabela(evento) {
        const botao = evento.target.closest("button[data-id]");
        if (!botao) return;

        const despesa = despesas.find(d => d.id === botao.dataset.id);
        if (!despesa) return;

        const confirmou = window.confirm(`Excluir a despesa "${despesa.descricao}" (${formatarMoeda(despesa.valor)})?`);
        if (!confirmou) return;

        const novaLista = despesas.filter(d => d.id !== despesa.id);
        if (!salvarDespesas(novaLista)) {
            mostrarToast("Não foi possível excluir: o armazenamento do navegador está indisponível.", "erro");
            return;
        }
        despesas = novaLista;

        atualizarTudo();
        mostrarToast("Despesa excluída.");
        el.tituloHistorico.focus();
    }

    // ==========================================
    // INICIALIZAÇÃO
    // ==========================================
    aoCarregar(() => {
        el.filtro = document.getElementById("filtro-mes");
        el.inputRenda = document.getElementById("input-renda");
        el.categoria = document.getElementById("categoria");
        el.resumoRenda = document.getElementById("resumo-renda");
        el.resumoRendaNota = document.getElementById("resumo-renda-nota");
        el.resumoDespesas = document.getElementById("resumo-despesas");
        el.resumoDespesasNota = document.getElementById("resumo-despesas-nota");
        el.saldo = document.getElementById("saldo-valor");
        el.corpoTabela = document.getElementById("corpo-tabela");
        el.areaTabela = document.getElementById("area-tabela");
        el.vazioHistorico = document.getElementById("vazio-historico");
        el.tituloHistorico = document.getElementById("titulo-historico");
        el.areaGrafico = document.getElementById("area-grafico");
        el.vazioGrafico = document.getElementById("vazio-grafico");
        el.canvas = document.getElementById("grafico-despesas");

        // Categorias disponíveis no formulário
        el.categoria.replaceChildren(
            ...CATEGORIAS.map(c => criarElemento("option", { texto: c.nome, attrs: { value: c.id } }))
        );

        // Valores iniciais
        const renda = lerRenda();
        if (renda > 0) el.inputRenda.value = renda.toFixed(2).replace(".", ",");
        document.getElementById("data").value = hojeISO();
        despesas = lerDespesas();

        // Eventos
        el.filtro.addEventListener("change", () => {
            filtro = el.filtro.value;
            atualizarTudo();
        });
        document.getElementById("form-renda").addEventListener("submit", aoSalvarRenda);
        document.getElementById("form-despesa").addEventListener("submit", aoCadastrarDespesa);
        el.corpoTabela.addEventListener("click", aoClicarTabela);

        atualizarTudo();
    });
})();
