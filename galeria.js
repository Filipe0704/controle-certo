/* =========================================================
   CONTROLE CERTO - galeria.js
   Galeria de imagens com:
   - 12 ilustrações em SVG desenhadas no próprio código
     (azul, ciano, índigo e dourado; sem verde);
   - filtro por categoria;
   - lightbox acessível (teclado, foco preso, Esc, setas).

   PARA USAR SUAS PRÓPRIAS FOTOS: em ITENS, acrescente a
   propriedade  imagem: "fotos/minha-foto.jpg"  no item
   desejado. Ela tem prioridade sobre o desenho em SVG.
   ========================================================= */
(function () {
    "use strict";

    if (!window.CC) return;

    const { aoCarregar, criarElemento } = window.CC;

    // ==========================================
    // 1. DESENHOS EM SVG
    // ==========================================
    const OURO = "#FFCC00";
    const OURO_ESCURO = "#E6B800";

    // Moldura comum a todas as ilustrações (fundo em degradê + brilhos suaves)
    function moldura(conteudo) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 400 300">` +
            `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
            `<stop offset="0" stop-color="#1E293B"/><stop offset="1" stop-color="#0F172A"/>` +
            `</linearGradient></defs>` +
            `<rect width="400" height="300" fill="url(#g)"/>` +
            `<circle cx="352" cy="48" r="92" fill="#4DA3FF" opacity=".08"/>` +
            `<circle cx="40" cy="272" r="112" fill="#22C7F2" opacity=".07"/>` +
            conteudo + `</svg>`;
    }

    function pilhaDeMoedas(x, quantidade) {
        let desenho = "";
        for (let i = 0; i < quantidade; i++) {
            const y = 232 - i * 18;
            desenho += `<rect x="${x - 40}" y="${y - 8}" width="80" height="18" fill="${OURO_ESCURO}"/>` +
                `<ellipse cx="${x}" cy="${y + 10}" rx="40" ry="10" fill="${OURO_ESCURO}"/>` +
                `<ellipse cx="${x}" cy="${y - 8}" rx="40" ry="10" fill="${OURO}"/>`;
        }
        return desenho;
    }

    function botoesCalculadora() {
        let desenho = "";
        for (let linha = 0; linha < 4; linha++) {
            for (let coluna = 0; coluna < 3; coluna++) {
                const cor = coluna === 2 ? "#8B9CFF" : "#4DA3FF";
                desenho += `<rect x="${146 + coluna * 38}" y="${122 + linha * 34}" width="30" height="24" rx="6" fill="${cor}"/>`;
            }
        }
        return desenho;
    }

    function diasDoCalendario() {
        let desenho = "";
        for (let linha = 0; linha < 3; linha++) {
            for (let coluna = 0; coluna < 5; coluna++) {
                desenho += `<circle cx="${112 + coluna * 44}" cy="${140 + linha * 40}" r="7" fill="#3B4F70"/>`;
            }
        }
        return desenho;
    }

    const DESENHOS = {
        cofrinho: () => moldura(
            `<path d="M97 165 q-26 -8 -12 -38" stroke="#4DA3FF" stroke-width="8" fill="none" stroke-linecap="round"/>` +
            `<rect x="140" y="222" width="28" height="42" rx="9" fill="#2F86E6"/>` +
            `<rect x="228" y="222" width="28" height="42" rx="9" fill="#2F86E6"/>` +
            `<path d="M150 112 L162 74 L192 104 Z" fill="#2F86E6"/>` +
            `<ellipse cx="200" cy="172" rx="108" ry="76" fill="#4DA3FF"/>` +
            `<ellipse cx="296" cy="158" rx="26" ry="20" fill="#2F86E6"/>` +
            `<circle cx="288" cy="158" r="4" fill="#0F172A"/><circle cx="304" cy="158" r="4" fill="#0F172A"/>` +
            `<circle cx="258" cy="136" r="7" fill="#0F172A"/>` +
            `<rect x="174" y="104" width="52" height="9" rx="4" fill="#0F172A"/>` +
            `<circle cx="200" cy="62" r="23" fill="${OURO}"/><circle cx="200" cy="62" r="14" fill="none" stroke="${OURO_ESCURO}" stroke-width="4"/>`
        ),

        moedas: () => moldura(pilhaDeMoedas(110, 3) + pilhaDeMoedas(200, 5) + pilhaDeMoedas(290, 7)),

        carteira: () => moldura(
            `<rect x="125" y="62" width="150" height="58" rx="7" fill="#22C7F2" transform="rotate(-6 200 90)"/>` +
            `<circle cx="200" cy="92" r="14" fill="none" stroke="#0F172A" stroke-width="4" transform="rotate(-6 200 90)"/>` +
            `<rect x="90" y="100" width="220" height="145" rx="18" fill="#2F86E6"/>` +
            `<rect x="90" y="100" width="220" height="50" rx="18" fill="#4DA3FF"/>` +
            `<rect x="246" y="152" width="74" height="52" rx="12" fill="#8B9CFF"/>` +
            `<circle cx="272" cy="178" r="9" fill="#F8FAFC"/>`
        ),

        cartao: () => moldura(
            `<rect x="70" y="78" width="260" height="164" rx="16" fill="#4DA3FF"/>` +
            `<rect x="70" y="114" width="260" height="34" fill="#0F172A"/>` +
            `<rect x="96" y="170" width="46" height="36" rx="7" fill="${OURO}"/>` +
            `<rect x="96" y="218" width="120" height="8" rx="4" fill="#F8FAFC" opacity=".75"/>` +
            `<circle cx="286" cy="208" r="19" fill="#22C7F2" opacity=".95"/>` +
            `<circle cx="306" cy="208" r="19" fill="#8B9CFF" opacity=".95"/>`
        ),

        calculadora: () => moldura(
            `<rect x="130" y="38" width="140" height="224" rx="14" fill="#1E293B" stroke="#4DA3FF" stroke-width="4"/>` +
            `<rect x="146" y="56" width="108" height="48" rx="6" fill="#22C7F2"/>` +
            `<rect x="214" y="68" width="30" height="8" rx="4" fill="#0F172A"/>` +
            `<rect x="196" y="84" width="48" height="8" rx="4" fill="#0F172A" opacity=".6"/>` +
            botoesCalculadora()
        ),

        calendario: () => moldura(
            `<rect x="80" y="62" width="240" height="190" rx="14" fill="#1E293B" stroke="#4DA3FF" stroke-width="4"/>` +
            `<path d="M80 76 a14 14 0 0 1 14 -14 h212 a14 14 0 0 1 14 14 v28 h-240 z" fill="#4DA3FF"/>` +
            `<rect x="128" y="46" width="12" height="28" rx="6" fill="#F8FAFC"/>` +
            `<rect x="260" y="46" width="12" height="28" rx="6" fill="#F8FAFC"/>` +
            diasDoCalendario() +
            `<circle cx="244" cy="180" r="16" fill="#22C7F2"/>` +
            `<circle cx="156" cy="220" r="7" fill="${OURO}"/>`
        ),

        alvo: () => moldura(
            `<circle cx="190" cy="160" r="100" fill="#4DA3FF"/>` +
            `<circle cx="190" cy="160" r="76" fill="#1E293B"/>` +
            `<circle cx="190" cy="160" r="54" fill="#22C7F2"/>` +
            `<circle cx="190" cy="160" r="32" fill="#1E293B"/>` +
            `<circle cx="190" cy="160" r="14" fill="${OURO}"/>` +
            `<line x1="190" y1="160" x2="312" y2="46" stroke="#F8FAFC" stroke-width="7" stroke-linecap="round"/>` +
            `<polygon points="290,66 301,78 312,46" fill="#8B9CFF"/>` +
            `<polygon points="290,66 279,55 312,46" fill="#8B9CFF"/>`
        ),

        lista: () => moldura(
            `<rect x="106" y="46" width="188" height="224" rx="14" fill="#1E293B" stroke="#4DA3FF" stroke-width="4"/>` +
            `<rect x="162" y="34" width="76" height="28" rx="9" fill="#4DA3FF"/>` +
            [100, 150, 200].map((y, i) => i < 2
                ? `<circle cx="144" cy="${y + 14}" r="15" fill="#22C7F2"/>` +
                  `<path d="M136 ${y + 14} l6 7 l11 -13" stroke="#0F172A" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
                  `<rect x="176" y="${y + 9}" width="96" height="10" rx="5" fill="#F8FAFC" opacity=".75"/>`
                : `<circle cx="144" cy="${y + 14}" r="15" fill="none" stroke="#8B9CFF" stroke-width="4"/>` +
                  `<rect x="176" y="${y + 9}" width="70" height="10" rx="5" fill="#F8FAFC" opacity=".45"/>`
            ).join("")
        ),

        barras: () => moldura(
            `<line x1="52" y1="252" x2="350" y2="252" stroke="#3B4F70" stroke-width="4" stroke-linecap="round"/>` +
            `<rect x="76" y="202" width="44" height="50" rx="6" fill="#2F86E6"/>` +
            `<rect x="140" y="162" width="44" height="90" rx="6" fill="#4DA3FF"/>` +
            `<rect x="204" y="122" width="44" height="130" rx="6" fill="#22C7F2"/>` +
            `<rect x="268" y="72" width="44" height="180" rx="6" fill="#8B9CFF"/>` +
            `<path d="M70 168 L150 124 L218 96 L296 44" stroke="${OURO}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
            `<path d="M296 44 l-24 2 m24 -2 l-4 22" stroke="${OURO}" stroke-width="6" fill="none" stroke-linecap="round"/>`
        ),

        curva: () => moldura(
            `<polygon points="60,240 60,226 120,196 170,212 230,148 280,158 340,82 340,240" fill="#22C7F2" opacity=".18"/>` +
            `<polyline points="60,226 120,196 170,212 230,148 280,158 340,82" stroke="#22C7F2" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
            [[60, 226], [120, 196], [170, 212], [230, 148], [280, 158], [340, 82]]
                .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8" fill="#F8FAFC"/>`).join("") +
            `<line x1="52" y1="250" x2="352" y2="250" stroke="#3B4F70" stroke-width="4" stroke-linecap="round"/>`
        ),

        pizza: () => moldura(
            `<g transform="rotate(-90 200 150)" fill="none" stroke-width="64">` +
            `<circle cx="200" cy="150" r="68" stroke="#4DA3FF" stroke-dasharray="213.6 427.3" stroke-dashoffset="0"/>` +
            `<circle cx="200" cy="150" r="68" stroke="#22C7F2" stroke-dasharray="128.2 512.7" stroke-dashoffset="-213.6"/>` +
            `<circle cx="200" cy="150" r="68" stroke="#8B9CFF" stroke-dasharray="85.5 555.4" stroke-dashoffset="-341.8"/>` +
            `</g>` +
            `<circle cx="200" cy="150" r="30" fill="#0F172A"/>` +
            `<circle cx="200" cy="150" r="12" fill="${OURO}"/>`
        ),

        cofre: () => moldura(
            `<rect x="104" y="256" width="30" height="16" rx="5" fill="#2F86E6"/>` +
            `<rect x="266" y="256" width="30" height="16" rx="5" fill="#2F86E6"/>` +
            `<rect x="96" y="52" width="208" height="206" rx="16" fill="#2F86E6"/>` +
            `<rect x="116" y="72" width="168" height="166" rx="9" fill="#4DA3FF"/>` +
            `<rect x="88" y="94" width="14" height="30" rx="4" fill="#8B9CFF"/>` +
            `<rect x="88" y="188" width="14" height="30" rx="4" fill="#8B9CFF"/>` +
            `<circle cx="200" cy="155" r="48" fill="#1E293B"/>` +
            `<circle cx="200" cy="155" r="33" fill="none" stroke="#22C7F2" stroke-width="6"/>` +
            `<path d="M200 122 v66 M167 155 h66" stroke="#F8FAFC" stroke-width="6" stroke-linecap="round"/>` +
            `<circle cx="200" cy="155" r="8" fill="${OURO}"/>`
        )
    };

    // ==========================================
    // 2. ITENS DA GALERIA
    // ==========================================
    const CATEGORIAS = {
        economia: "Economia",
        planejamento: "Planejamento",
        investimentos: "Investimentos"
    };

    const ITENS = [
        { id: "cofrinho", categoria: "economia", titulo: "Cofrinho",
          descricao: "Um cofrinho azul recebendo uma moeda dourada: guardar um pouco todo mês faz diferença." },
        { id: "moedas", categoria: "economia", titulo: "Pilhas de moedas",
          descricao: "Três pilhas de moedas douradas em alturas crescentes, representando o dinheiro que se acumula." },
        { id: "carteira", categoria: "economia", titulo: "Carteira",
          descricao: "Uma carteira azul com uma nota saindo pelo topo: conhecer o que entra e o que sai é o primeiro passo." },
        { id: "cartao", categoria: "economia", titulo: "Cartão",
          descricao: "Um cartão azul com chip dourado: use o crédito com consciência e acompanhe a fatura." },

        { id: "calculadora", categoria: "planejamento", titulo: "Calculadora",
          descricao: "Uma calculadora com visor ciano: faça as contas antes de assumir um novo gasto." },
        { id: "calendario", categoria: "planejamento", titulo: "Calendário",
          descricao: "Um calendário com um dia destacado em ciano: marque as datas de vencimento das suas contas." },
        { id: "alvo", categoria: "planejamento", titulo: "Alvo da meta",
          descricao: "Um alvo azul com uma flecha no centro dourado: metas claras ajudam a manter o foco." },
        { id: "lista", categoria: "planejamento", titulo: "Lista de tarefas",
          descricao: "Uma prancheta com duas tarefas concluídas e uma pendente: planejar é acompanhar cada passo." },

        { id: "barras", categoria: "investimentos", titulo: "Barras crescentes",
          descricao: "Quatro barras de alturas crescentes com uma seta dourada para cima: o patrimônio cresce com o tempo." },
        { id: "curva", categoria: "investimentos", titulo: "Curva de crescimento",
          descricao: "Uma linha ciano com altos e baixos que termina em alta: investir exige olhar para o longo prazo." },
        { id: "pizza", categoria: "investimentos", titulo: "Divisão da carteira",
          descricao: "Um gráfico em anel dividido em três partes: diversificar reduz o risco dos investimentos." },
        { id: "cofre", categoria: "investimentos", titulo: "Cofre",
          descricao: "Um cofre azul com trava circular: reserva de emergência é segurança para imprevistos." }
    ];

    function enderecoDaImagem(item) {
        if (item.imagem) return item.imagem;
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(DESENHOS[item.id]())}`;
    }

    // ==========================================
    // 3. ESTADO
    // ==========================================
    let categoriaAtiva = "todas";
    let indiceAtual = -1;        // posição dentro da lista de itens visíveis
    let botaoQueAbriu = null;

    const el = {};

    function itensVisiveis() {
        return categoriaAtiva === "todas"
            ? ITENS
            : ITENS.filter(item => item.categoria === categoriaAtiva);
    }

    // ==========================================
    // 4. GRADE DE IMAGENS E FILTRO
    // ==========================================
    function criarItem(item) {
        const imagem = criarElemento("img", {
            classe: "galeria__img",
            attrs: {
                src: enderecoDaImagem(item),
                alt: item.descricao,
                width: "400",
                height: "300",
                loading: "lazy"
            }
        });

        const abrir = criarElemento("button", {
            classe: "galeria__abrir",
            attrs: { type: "button", "data-id": item.id, "aria-label": `Ampliar imagem: ${item.titulo}` }
        }, [imagem]);

        const legenda = criarElemento("figcaption", { classe: "galeria__legenda" }, [
            criarElemento("strong", { texto: item.titulo }),
            criarElemento("small", { texto: CATEGORIAS[item.categoria] })
        ]);

        const figura = criarElemento("figure", { classe: "galeria__figura" }, [abrir, legenda]);

        return criarElemento("li", {
            classe: "galeria__item",
            attrs: { "data-categoria": item.categoria, "data-id": item.id }
        }, [figura]);
    }

    function aplicarFiltro(categoria) {
        categoriaAtiva = categoria;

        el.filtros.forEach(botao => {
            botao.setAttribute("aria-pressed", String(botao.dataset.filtro === categoria));
        });

        el.grade.querySelectorAll(".galeria__item").forEach(li => {
            li.hidden = categoria !== "todas" && li.dataset.categoria !== categoria;
        });

        const quantidade = itensVisiveis().length;
        const nomeCategoria = categoria === "todas" ? "todas as categorias" : CATEGORIAS[categoria];
        el.status.textContent = `Mostrando ${quantidade} de ${ITENS.length} imagens (${nomeCategoria}).`;
    }

    // ==========================================
    // 5. LIGHTBOX
    // ==========================================
    function lightboxAberto() {
        return el.lightbox.classList.contains("aberto");
    }

    function mostrarNoLightbox(indice) {
        const lista = itensVisiveis();
        const total = lista.length;
        indiceAtual = (indice + total) % total;   // navegação circular

        const item = lista[indiceAtual];
        el.lbImagem.src = enderecoDaImagem(item);
        el.lbImagem.alt = item.descricao;
        el.lbTitulo.textContent = item.titulo;
        el.lbDescricao.textContent = item.descricao;
        el.lbContador.textContent = `${indiceAtual + 1} de ${total}`;

        const semNavegacao = total < 2;
        el.lbAnterior.disabled = semNavegacao;
        el.lbProxima.disabled = semNavegacao;
    }

    function abrirLightbox(idItem, botao) {
        const indice = itensVisiveis().findIndex(item => item.id === idItem);
        if (indice === -1) return;

        botaoQueAbriu = botao;
        mostrarNoLightbox(indice);

        el.lightbox.classList.add("aberto");
        document.body.classList.add("lightbox-aberto");
        el.lbFechar.focus();
    }

    function fecharLightbox() {
        if (!lightboxAberto()) return;

        const item = itensVisiveis()[indiceAtual];
        el.lightbox.classList.remove("aberto");
        document.body.classList.remove("lightbox-aberto");
        el.lbImagem.removeAttribute("src");

        // Devolve o foco à miniatura da imagem que estava aberta
        const miniatura = item && el.grade.querySelector(`button[data-id="${item.id}"]`);
        (miniatura || botaoQueAbriu || document.body).focus();
        indiceAtual = -1;
    }

    function aoPressionarTecla(evento) {
        if (!lightboxAberto()) return;

        if (evento.key === "Escape") {
            evento.preventDefault();
            fecharLightbox();
        } else if (evento.key === "ArrowRight") {
            evento.preventDefault();
            mostrarNoLightbox(indiceAtual + 1);
        } else if (evento.key === "ArrowLeft") {
            evento.preventDefault();
            mostrarNoLightbox(indiceAtual - 1);
        } else if (evento.key === "Tab") {
            // Mantém o foco dentro da janela enquanto ela está aberta
            const focaveis = Array.from(el.lightbox.querySelectorAll("button:not([disabled])"));
            if (focaveis.length === 0) return;

            const primeiro = focaveis[0];
            const ultimo = focaveis[focaveis.length - 1];
            if (evento.shiftKey && document.activeElement === primeiro) {
                evento.preventDefault();
                ultimo.focus();
            } else if (!evento.shiftKey && document.activeElement === ultimo) {
                evento.preventDefault();
                primeiro.focus();
            } else if (!el.lightbox.contains(document.activeElement)) {
                evento.preventDefault();
                primeiro.focus();
            }
        }
    }

    // ==========================================
    // 6. INICIALIZAÇÃO
    // ==========================================
    aoCarregar(() => {
        el.grade = document.getElementById("galeria");
        el.status = document.getElementById("status-galeria");
        el.filtros = Array.from(document.querySelectorAll(".filtro"));

        el.lightbox = document.getElementById("lightbox");
        el.lbImagem = document.getElementById("lightbox-img");
        el.lbTitulo = document.getElementById("lightbox-titulo");
        el.lbDescricao = document.getElementById("lightbox-descricao");
        el.lbContador = document.getElementById("lightbox-contador");
        el.lbFechar = document.getElementById("lightbox-fechar");
        el.lbAnterior = document.getElementById("lightbox-anterior");
        el.lbProxima = document.getElementById("lightbox-proxima");

        el.grade.replaceChildren(...ITENS.map(criarItem));

        el.filtros.forEach(botao => {
            botao.addEventListener("click", () => aplicarFiltro(botao.dataset.filtro));
        });

        // Delegação: um único ouvinte para todas as miniaturas
        el.grade.addEventListener("click", evento => {
            const botao = evento.target.closest("button[data-id]");
            if (botao) abrirLightbox(botao.dataset.id, botao);
        });

        el.lbFechar.addEventListener("click", fecharLightbox);
        el.lbAnterior.addEventListener("click", () => mostrarNoLightbox(indiceAtual - 1));
        el.lbProxima.addEventListener("click", () => mostrarNoLightbox(indiceAtual + 1));

        // Clicar no fundo escuro (fora da imagem e dos botões) também fecha
        el.lightbox.addEventListener("click", evento => {
            if (evento.target === el.lightbox) fecharLightbox();
        });

        document.addEventListener("keydown", aoPressionarTecla);

        aplicarFiltro("todas");
    });
})();
