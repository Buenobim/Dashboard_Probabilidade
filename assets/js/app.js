/**
 * app.js — estado, filtros e montagem das páginas.
 *
 * Modelo mental (igual ao de uma ferramenta de BI): existe UM recorte ativo.
 * Os segmentadores da barra lateral e os cliques nos gráficos escrevem no mesmo
 * objeto `estado.filtros`; tudo na tela é recalculado a partir dele. Nenhum
 * gráfico tem filtro próprio.
 */
(function (global) {
  'use strict';

  var S = global.Stats;
  var G = global.Graficos;

  var estado = {
    pagina: 'visao',
    filtros: {},            // { chaveDaQuestao: [categoria, ...] }
    registros: [],
    origem: 'local',
    cruzamento: { linha: 'avaliacao', coluna: 'genero', forma: 'empilhado', excluirNA: true }
  };

  var CHAVES_SLICER = ['genero', 'faixa', 'cnh', 'veiculo', 'transporte', 'avaliacao'];

  // ------------------------------------------------------------------ helpers

  function h(tag, attrs, filhos) {
    var n = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === 'class') n.className = attrs[k];
        else if (k === 'html') n.innerHTML = attrs[k];
        else if (k === 'text') n.textContent = attrs[k];
        else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else if (attrs[k] != null && attrs[k] !== false) n.setAttribute(k, attrs[k]);
      }
    }
    (filhos || []).forEach(function (f) {
      if (f == null || f === false) return;
      n.appendChild(typeof f === 'string' ? document.createTextNode(f) : f);
    });
    return n;
  }

  var ICONES = {
    visao: 'M3 12h4l2.5-7 4 14 2.5-7h4',
    perfil: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4.5 20a7.5 7.5 0 0115 0',
    protecao: 'M12 3l7 3v5.5c0 4.2-2.9 7.6-7 8.5-4.1-.9-7-4.3-7-8.5V6l7-3z',
    mobilidade: 'M5 17h14M6.5 17V9.5L8.5 5h7l2 4.5V17M4 9.5h16M8 20v-3M16 20v-3',
    seguranca: 'M12 4l9 16H3l9-16zM12 10v4M12 17h.01',
    cruzamentos: 'M4 20V6M4 20h16M8 20v-7M12 20V9M16 20v-11M20 20v-5',
    tabelas: 'M4 5h16v14H4zM4 10h16M4 15h16M9.5 5v14',
    relatorio: 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5',
    baixar: 'M12 4v10m0 0l-3.5-3.5M12 14l3.5-3.5M5 18h14',
    imagem: 'M4 5h16v14H4zM4 15l4.5-4.5 4 4 3-3L20 15M9 9.5h.01',
    imprimir: 'M7 8V4h10v4M7 16H5v-6h14v6h-2M7 14h10v6H7z',
    menu: 'M4 7h16M4 12h16M4 17h16',
    sol: 'M12 7.5A4.5 4.5 0 1012 16.5 4.5 4.5 0 0012 7.5zM12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
    lua: 'M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z',
    nuvem: 'M7 18h9a4 4 0 000-8 5.5 5.5 0 00-10.6 1.5A3.5 3.5 0 007 18z'
  };

  function icone(nome, classe) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    if (classe) svg.setAttribute('class', classe);
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', ICONES[nome] || '');
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(p);
    return svg;
  }

  function avisar(msg, erro) {
    var caixa = document.getElementById('avisos');
    var el = h('div', { class: 'aviso' + (erro ? ' erro' : ''), text: msg });
    caixa.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 250);
    }, 4200);
  }

  // ------------------------------------------------------------------ filtros

  function registrosFiltrados() {
    var chaves = Object.keys(estado.filtros).filter(function (k) { return estado.filtros[k].length; });
    if (!chaves.length) return estado.registros;
    return estado.registros.filter(function (r) {
      return chaves.every(function (k) { return estado.filtros[k].indexOf(r[k]) !== -1; });
    });
  }

  /** Recorte ignorando a própria questão — usado para as contagens do slicer. */
  function registrosExceto(chave) {
    var chaves = Object.keys(estado.filtros).filter(function (k) { return k !== chave && estado.filtros[k].length; });
    if (!chaves.length) return estado.registros;
    return estado.registros.filter(function (r) {
      return chaves.every(function (k) { return estado.filtros[k].indexOf(r[k]) !== -1; });
    });
  }

  function alternarFiltro(chave, valor) {
    var lista = estado.filtros[chave] || (estado.filtros[chave] = []);
    var i = lista.indexOf(valor);
    if (i === -1) lista.push(valor); else lista.splice(i, 1);
    if (!lista.length) delete estado.filtros[chave];
    renderizar();
  }

  function limparFiltro(chave) {
    delete estado.filtros[chave];
    renderizar();
  }

  function limparTudo() {
    estado.filtros = {};
    renderizar();
  }

  function totalFiltros() {
    return Object.keys(estado.filtros).reduce(function (s, k) { return s + estado.filtros[k].length; }, 0);
  }

  // ------------------------------------------------------------- componentes

  function cartao(opts) {
    var ferramentas = h('div', { class: 'ferramentas-cartao' });
    var corpo = h('div', { class: 'cartao-corpo' + (opts.semPad ? ' sem-pad' : '') });

    var topo = h('div', { class: 'cartao-topo' }, [
      h('div', { style: 'min-width:0' }, [
        h('h3', { class: 'cartao-titulo', text: opts.titulo }),
        opts.nota ? h('p', { class: 'cartao-nota', text: opts.nota }) : null
      ]),
      ferramentas
    ]);

    var el = h('section', { class: 'cartao ' + (opts.span || 'c6') }, [topo, corpo]);
    if (opts.rodape) el.appendChild(h('div', { class: 'cartao-rodape' }, [opts.rodape]));

    return { el: el, corpo: corpo, ferramentas: ferramentas };
  }

  function botaoFerramenta(nomeIcone, titulo, aoClicar) {
    var b = h('button', { class: 'mini-btn', type: 'button', title: titulo, 'aria-label': titulo, onclick: aoClicar });
    b.appendChild(icone(nomeIcone));
    return b;
  }

  /**
   * Tabela de questão isolada no modelo pedido no enunciado:
   * Respostas | Quantidades | Porcentagens | Total, com a fonte embaixo.
   */
  function tabelaFrequencia(f, opts) {
    opts = opts || {};
    var corpo = h('tbody', null, f.linhas.map(function (l) {
      var trilho = h('div', { class: 'barra-trilho' }, [
        h('span', {
          class: 'barra-inline',
          style: 'width:' + Math.max(2, (l.pct / Math.max(1, Math.max.apply(null, f.linhas.map(function (x) { return x.pct; })))) * 100) + '%'
        })
      ]);
      return h('tr', null, [
        h('td', { class: 'esq', text: l.rotulo }),
        h('td', { text: S.fmtNum(l.n) }),
        h('td', { text: S.fmtPct(l.pct, 1) }),
        opts.semBarra ? null : h('td', { class: 'bar-cel' }, [trilho])
      ]);
    }));

    corpo.appendChild(h('tr', { class: 'total' }, [
      h('td', { class: 'esq', text: 'Total' }),
      h('td', { text: S.fmtNum(f.total) }),
      h('td', { text: S.fmtPct(f.total ? 100 : 0, 1) }),
      opts.semBarra ? null : h('td', { class: 'bar-cel' })
    ]));

    var tabela = h('table', { class: 'dados' }, [
      opts.legenda === false ? null : h('caption', { text: opts.legenda || f.titulo }),
      h('thead', null, [h('tr', null, [
        h('th', { class: 'esq', scope: 'col', text: 'Respostas' }),
        h('th', { scope: 'col', text: 'Quantidades' }),
        h('th', { scope: 'col', text: 'Porcentagens' }),
        opts.semBarra ? null : h('th', { scope: 'col', 'aria-label': 'Proporção' })
      ])]),
      corpo
    ]);

    var env = h('div', null, [
      h('div', { class: 'rolagem-tabela' }, [tabela]),
      h('p', { class: 'fonte-tabela', text: 'Fonte: o autor (n = ' + f.total + ').' })
    ]);
    env._csv = function () { return csvFrequencia(f); };
    env._nome = 'tabela-' + f.key;
    return env;
  }

  /** Tabela de cruzamento: porcentagem por coluna, cada coluna fechando 100%. */
  function tabelaCruzamento(tab) {
    var cabecalho = [h('th', { class: 'esq', scope: 'col', text: tab.tituloLinha })];
    tab.colunas.forEach(function (c, j) {
      cabecalho.push(h('th', { scope: 'col', text: tab.rotulosColuna[j] }));
      cabecalho.push(h('th', { scope: 'col', text: '%' }));
    });

    var linhas = tab.linhas.map(function (l, i) {
      var tds = [h('td', { class: 'esq', text: tab.rotulosLinha[i] })];
      tab.colunas.forEach(function (c, j) {
        tds.push(h('td', { text: S.fmtNum(tab.celulas[i][j].n) }));
        tds.push(h('td', { text: S.fmtPct(tab.celulas[i][j].pct, 1) }));
      });
      return h('tr', null, tds);
    });

    var tdsTotal = [h('td', { class: 'esq', text: 'Total' })];
    tab.colunas.forEach(function (c, j) {
      tdsTotal.push(h('td', { text: S.fmtNum(tab.totalCol[j]) }));
      tdsTotal.push(h('td', { text: S.fmtPct(tab.totalCol[j] ? 100 : 0, 1) }));
    });
    linhas.push(h('tr', { class: 'total' }, tdsTotal));

    var tabela = h('table', { class: 'dados' }, [
      h('caption', { text: tab.tituloLinha + ' segundo ' + tab.tituloColuna.toLowerCase() + ' (% por coluna)' }),
      h('thead', null, [h('tr', null, cabecalho)]),
      h('tbody', null, linhas)
    ]);

    var env = h('div', null, [
      h('div', { class: 'rolagem-tabela' }, [tabela]),
      h('p', { class: 'fonte-tabela', text: 'Fonte: o autor (n = ' + tab.geral + '). Cada coluna soma 100%.' })
    ]);
    env._csv = function () { return csvCruzamento(tab); };
    env._nome = 'cruzamento-' + tab.linhaKey + '-x-' + tab.colunaKey;
    return env;
  }

  function kpi(opts) {
    var caixa = h('div', { class: 'kpi' }, [
      h('p', { class: 'kpi-rotulo', text: opts.rotulo }),
      h('div', { class: 'kpi-valor', html: opts.valor + (opts.unidade ? '<span class="kpi-unidade">' + opts.unidade + '</span>' : '') }),
      h('p', { class: 'kpi-apoio', html: opts.apoio || '' })
    ]);
    var faixa = h('div');
    caixa.appendChild(faixa);
    var sec = h('section', { class: 'cartao c3' }, [caixa]);
    if (opts.pct != null) {
      requestAnimationFrame(function () { G.faixa(faixa, opts.pct, { descricao: opts.rotulo }); });
    }
    return sec;
  }

  // --------------------------------------------------------------- exportação

  function baixar(nome, conteudo, tipo) {
    var blob = new Blob(['﻿' + conteudo], { type: tipo || 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: nome });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function celulaCsv(v) {
    var s = String(v == null ? '' : v);
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function csvFrequencia(f) {
    var l = ['Respostas;Quantidades;Porcentagens'];
    f.linhas.forEach(function (x) { l.push([celulaCsv(x.categoria), x.n, S.fmtPct(x.pct, 1)].join(';')); });
    l.push(['Total', f.total, S.fmtPct(f.total ? 100 : 0, 1)].join(';'));
    return f.titulo + '\n' + l.join('\n') + '\nFonte: o autor';
  }

  function csvCruzamento(tab) {
    var cab = [tab.tituloLinha];
    tab.colunas.forEach(function (c, j) { cab.push(celulaCsv(tab.rotulosColuna[j]), '%' + celulaCsv(tab.rotulosColuna[j])); });
    var l = [cab.join(';')];
    tab.linhas.forEach(function (lin, i) {
      var row = [celulaCsv(tab.rotulosLinha[i])];
      tab.colunas.forEach(function (c, j) { row.push(tab.celulas[i][j].n, S.fmtPct(tab.celulas[i][j].pct, 1)); });
      l.push(row.join(';'));
    });
    var tot = ['Total'];
    tab.colunas.forEach(function (c, j) { tot.push(tab.totalCol[j], S.fmtPct(tab.totalCol[j] ? 100 : 0, 1)); });
    l.push(tot.join(';'));
    return tab.tituloLinha + ' x ' + tab.tituloColuna + ' (% por coluna)\n' + l.join('\n') + '\nFonte: o autor';
  }

  function csvBase(registros) {
    var chaves = global.SCHEMA.map(function (q) { return q.key; });
    var cab = ['id', 'data_hora'].concat(global.SCHEMA.map(function (q) { return celulaCsv(q.titulo); }));
    var linhas = registros.map(function (r) {
      return ['id', 'ts'].concat(chaves).map(function (k) { return celulaCsv(r[k]); }).join(';');
    });
    return cab.join(';') + '\n' + linhas.join('\n');
  }

  /** Exporta o SVG de um gráfico como PNG com a superfície do tema no fundo. */
  function exportarPng(container, nome) {
    var svg = container.querySelector('svg');
    if (!svg) { avisar('Nada para exportar neste cartão.', true); return; }

    var clone = svg.cloneNode(true);
    var estilo = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    estilo.textContent = "text{font-family:'IBM Plex Sans','Segoe UI',system-ui,sans-serif}" +
      "text.num{font-variant-numeric:tabular-nums}";
    clone.insertBefore(estilo, clone.firstChild);

    var w = svg.getAttribute('width') | 0, alt = svg.getAttribute('height') | 0;
    var fundo = getComputedStyle(document.documentElement).getPropertyValue('--superficie').trim() || '#fff';
    var escala = 2;

    var dados = new XMLSerializer().serializeToString(clone);
    var img = new Image();
    img.onload = function () {
      var cv = document.createElement('canvas');
      cv.width = (w + 32) * escala;
      cv.height = (alt + 32) * escala;
      var ctx = cv.getContext('2d');
      ctx.scale(escala, escala);
      ctx.fillStyle = fundo;
      ctx.fillRect(0, 0, w + 32, alt + 32);
      ctx.drawImage(img, 16, 16, w, alt);
      cv.toBlob(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = h('a', { href: url, download: nome + '.png' });
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      });
    };
    img.onerror = function () { avisar('Não foi possível gerar a imagem.', true); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(dados);
  }

  // ------------------------------------------------------------------- slicers

  function montarSlicers() {
    var alvo = document.getElementById('slicers');
    alvo.innerHTML = '';

    CHAVES_SLICER.forEach(function (chave) {
      var q = global.Q[chave];
      var base = registrosExceto(chave);
      var f = S.frequencia(base, chave);
      var ativos = estado.filtros[chave] || [];

      var opcoes = h('div', { class: 'opcoes' }, f.linhas.map(function (l) {
        var ligado = ativos.indexOf(l.categoria) !== -1;
        return h('button', {
          class: 'opcao', type: 'button', 'aria-pressed': ligado ? 'true' : 'false',
          title: l.categoria + ' — ' + l.n + ' resposta(s)',
          onclick: function () { alternarFiltro(chave, l.categoria); }
        }, [
          document.createTextNode(l.rotulo),
          h('span', { class: 'cont', text: String(l.n) })
        ]);
      }));

      alvo.appendChild(h('div', { class: 'slicer' + (ativos.length ? ' ativo' : '') }, [
        h('div', { class: 'slicer-topo' }, [
          h('span', { class: 'slicer-titulo', text: q.curto }),
          h('button', { class: 'slicer-limpar', type: 'button', text: 'limpar', onclick: function () { limparFiltro(chave); } })
        ]),
        opcoes
      ]));
    });
  }

  function montarChips(destino, recorte) {
    destino.innerHTML = '';
    var n = totalFiltros();

    if (!n) {
      destino.appendChild(h('span', { class: 'aviso-vazio', text: 'Nenhum filtro ativo — as ' + estado.registros.length + ' respostas estão no cálculo.' }));
      return;
    }

    Object.keys(estado.filtros).forEach(function (chave) {
      estado.filtros[chave].forEach(function (valor) {
        destino.appendChild(h('span', { class: 'chip-filtro' }, [
          h('span', { class: 'dim', text: global.Q[chave].curto + ':' }),
          h('b', { text: global.rotulo(chave, valor) }),
          h('button', {
            class: 'chip-x', type: 'button', 'aria-label': 'Remover filtro ' + valor, text: '×',
            onclick: function () { alternarFiltro(chave, valor); }
          })
        ]));
      });
    });

    destino.appendChild(h('button', { class: 'btn btn-sutil', type: 'button', text: 'Limpar tudo', onclick: limparTudo }));
    destino.appendChild(h('span', {
      class: 'aviso-vazio',
      text: recorte.length + ' de ' + estado.registros.length + ' respostas no recorte (' +
        S.fmtPct(S.pct(recorte.length, estado.registros.length), 0) + ').'
    }));
  }

  // -------------------------------------------------------------- blocos comuns

  /**
   * Cartão padrão de questão isolada: gráfico + tabela sob o mesmo título,
   * com alternância entre as duas leituras e exportação.
   */
  function cartaoQuestao(recorte, chave, opts) {
    opts = opts || {};
    var q = global.Q[chave];
    var f = S.frequencia(recorte, chave, { excluirNaoAplica: opts.excluirNA });
    var forma = opts.forma || (q.escala === 'ordinal' ? 'colunas' : 'barras');

    var c = cartao({
      titulo: 'Q' + q.num + '. ' + q.titulo,
      nota: opts.nota || (q.escala === 'ordinal' ? 'Escala ordinal — a cor acompanha a ordem da escala.' : null),
      span: opts.span || 'c6',
      semPad: true
    });

    var areaGrafico = h('div');
    var areaTabela = h('div', { style: 'display:none;padding:4px 8px 0' });
    c.corpo.appendChild(areaGrafico);
    c.corpo.appendChild(areaTabela);

    var tabelaEl = tabelaFrequencia(f, { legenda: false });
    areaTabela.appendChild(tabelaEl);

    function desenhar() {
      var ativos = estado.filtros[chave] || [];
      var comum = {
        total: f.total,
        descricao: q.titulo,
        selecionado: ativos.length === 1 ? ativos[0] : null,
        aoClicar: function (cat) { alternarFiltro(chave, cat); }
      };
      // Escala ordinal recebe a rampa do tema (a cor acompanha a ordem);
      // escala nominal recebe a paleta categórica, porque colorir categoria sem
      // ordem por intensidade duplicaria o comprimento da barra em outro canal.
      var cores = q.escala === 'ordinal'
        ? global.Tema.rampaDe(f.linhas.length)
        : global.Tema.categorica(f.linhas.length);

      if (forma === 'rosca') {
        G.rosca(areaGrafico, f.linhas, Object.assign({ altura: opts.altura || 220, cores: cores }, comum));
      } else if (forma === 'colunas') {
        G.colunas(areaGrafico, f.linhas, Object.assign({ altura: opts.altura || 250, cores: cores }, comum));
      } else {
        G.barras(areaGrafico, f.linhas, Object.assign({ cor: global.Tema.marca() }, comum));
      }
    }
    desenhar();

    var vendoTabela = false;
    var btnTabela = botaoFerramenta('tabelas', 'Alternar entre gráfico e tabela', function () {
      vendoTabela = !vendoTabela;
      areaGrafico.style.display = vendoTabela ? 'none' : '';
      areaTabela.style.display = vendoTabela ? '' : 'none';
      btnTabela.setAttribute('aria-pressed', vendoTabela ? 'true' : 'false');
    });
    c.ferramentas.appendChild(btnTabela);
    c.ferramentas.appendChild(botaoFerramenta('imagem', 'Baixar gráfico em PNG', function () {
      exportarPng(areaGrafico, 'grafico-q' + q.num + '-' + chave);
    }));
    c.ferramentas.appendChild(botaoFerramenta('baixar', 'Baixar tabela em CSV', function () {
      baixar('tabela-q' + q.num + '-' + chave + '.csv', csvFrequencia(f));
      avisar('Tabela da questão ' + q.num + ' exportada em CSV.');
    }));

    var moda = f.linhas.length ? f.linhas.reduce(function (a, b) { return b.n > a.n ? b : a; }) : null;
    c.el.appendChild(h('div', { class: 'cartao-rodape' }, [
      h('span', {
        html: moda
          ? 'Resposta mais frequente: <b style="color:var(--ink-1)">' + moda.rotulo + '</b> (' + S.fmtPct(moda.pct, 1) + ')'
          : 'Sem respostas no recorte.'
      }),
      h('span', { text: 'n = ' + f.total })
    ]));

    return { el: c.el, f: f, redesenhar: desenhar };
  }

  /** Cartão de cruzamento: gráfico 100% empilhado + tabela com % por coluna. */
  function cartaoCruzamento(recorte, linhaKey, colunaKey, opts) {
    opts = opts || {};
    var tab = S.cruzamento(recorte, linhaKey, colunaKey, { excluirNaoAplica: opts.excluirNA !== false });
    var qq = S.quiQuadrado(tab);

    var c = cartao({
      titulo: opts.titulo || (global.Q[linhaKey].curto + ' × ' + global.Q[colunaKey].curto),
      nota: opts.nota || 'Cada coluna fecha 100% — a comparação é entre os grupos, não entre os tamanhos dos grupos.',
      span: opts.span || 'c12',
      semPad: true
    });

    var areaGrafico = h('div');
    var areaTabela = h('div', { style: 'display:none;padding:4px 8px 0' });
    c.corpo.appendChild(areaGrafico);
    c.corpo.appendChild(areaTabela);
    areaTabela.appendChild(tabelaCruzamento(tab));

    function desenhar() {
      var forma = opts.forma || 'empilhado';
      var fn = forma === 'agrupado' ? G.agrupado : G.empilhado100;
      fn(areaGrafico, tab, { altura: opts.altura || 290, descricao: global.Q[linhaKey].curto + ' por ' + global.Q[colunaKey].curto });
    }
    desenhar();

    var vendoTabela = false;
    var btnTabela = botaoFerramenta('tabelas', 'Alternar entre gráfico e tabela', function () {
      vendoTabela = !vendoTabela;
      areaGrafico.style.display = vendoTabela ? 'none' : '';
      areaTabela.style.display = vendoTabela ? '' : 'none';
      btnTabela.setAttribute('aria-pressed', vendoTabela ? 'true' : 'false');
    });
    c.ferramentas.appendChild(btnTabela);
    c.ferramentas.appendChild(botaoFerramenta('imagem', 'Baixar gráfico em PNG', function () {
      exportarPng(areaGrafico, 'cruzamento-' + linhaKey + '-x-' + colunaKey);
    }));
    c.ferramentas.appendChild(botaoFerramenta('baixar', 'Baixar tabela em CSV', function () {
      baixar('cruzamento-' + linhaKey + '-x-' + colunaKey + '.csv', csvCruzamento(tab));
      avisar('Tabela de cruzamento exportada em CSV.');
    }));

    c.el.appendChild(h('div', { class: 'cartao-rodape' }, [notaQuiQuadrado(qq, tab)]));
    return { el: c.el, tab: tab, qq: qq, redesenhar: desenhar };
  }

  function notaQuiQuadrado(qq, tab) {
    if (!qq) return h('span', { class: 'nota-teste', text: 'Cruzamento sem variação suficiente para o teste.' });

    var forca = qq.cramerV >= 0.5 ? 'forte' : qq.cramerV >= 0.3 ? 'moderada' : qq.cramerV >= 0.1 ? 'fraca' : 'desprezível';
    var significa = qq.p < 0.05;

    return h('span', { class: 'nota-teste' }, [
      h('span', { html: '&chi;&sup2; = <b class="num">' + qq.x2.toFixed(2).replace('.', ',') + '</b> · gl = ' + qq.gl + ' · p = <b class="num">' + qq.p.toFixed(3).replace('.', ',') + '</b>' }),
      h('span', { html: 'V de Cramér = <b class="num">' + qq.cramerV.toFixed(2).replace('.', ',') + '</b> (associação ' + forca + ')' }),
      h('span', {
        class: 'selo ' + (qq.confiavel && significa ? 'ok' : 'alerta'),
        text: !qq.confiavel
          ? 'amostra pequena: ' + Math.round(qq.pctEsperadasBaixas) + '% das caselas com esperada < 5 — leia como indício'
          : (significa ? 'diferença estatisticamente significativa (α = 0,05)' : 'sem diferença significativa (α = 0,05)')
      })
    ]);
  }

  function secao(titulo) {
    return h('div', { class: 'secao-titulo' }, [h('h2', { text: titulo })]);
  }

  // ------------------------------------------------------------------- páginas

  var PAGINAS = {};

  PAGINAS.visao = function (recorte) {
    var frag = document.createDocumentFragment();
    var n = recorte.length;

    var carro = S.pctDe(recorte, 'transporte', ['Carro próprio']);
    var acid = S.pctDe(recorte, 'acidente', ['Sim, há mais de 1 ano', 'Sim, nos últimos 12 meses']);
    var recente = S.pctDe(recorte, 'acidente', ['Sim, nos últimos 12 meses']);
    var segura = S.pctDe(recorte, 'avaliacao', ['Segura']);
    var comVeiculo = recorte.filter(function (r) { return r.veiculo !== 'Não possuo veículo'; });
    var protegido = S.pctDe(comVeiculo, 'seguro', [
      'Sim, seguro total (cobertura completa)',
      'Sim, apenas seguro contra terceiros ou roubo/furto',
      'Não possui seguro, mas possui proteção veicular (associação/cooperativa)'
    ]);
    var minutos = S.tempoMedio(recorte);
    var nuncaTp = S.pctDe(recorte, 'freqTp', ['Nunca utilizo', 'Raramente']);

    var kpis = h('div', { class: 'grelha' }, [
      kpi({
        rotulo: 'Respondentes no recorte', valor: S.fmtNum(n),
        apoio: n === estado.registros.length
          ? 'Base completa da pesquisa.'
          : 'De <b>' + estado.registros.length + '</b> respostas coletadas.',
        pct: S.pct(n, estado.registros.length)
      }),
      kpi({
        rotulo: 'Dependem do carro próprio', valor: S.fmtDec(carro.pct), unidade: '%',
        apoio: '<b>' + carro.n + '</b> de ' + carro.total + ' usam o carro como transporte principal.',
        pct: carro.pct
      }),
      kpi({
        rotulo: 'Já se envolveram em acidente', valor: S.fmtDec(acid.pct), unidade: '%',
        apoio: '<b>' + acid.n + '</b> pessoas; <b>' + recente.n + '</b> nos últimos 12 meses.',
        pct: acid.pct
      }),
      kpi({
        rotulo: 'Tempo médio de trajeto', valor: S.fmtDec(minutos), unidade: ' min',
        apoio: 'Estimado pelo ponto médio das faixas declaradas.',
        pct: Math.min(100, (minutos / 90) * 100)
      }),
      kpi({
        rotulo: 'Veículos com alguma proteção', valor: S.fmtDec(protegido.pct), unidade: '%',
        apoio: '<b>' + protegido.n + '</b> de ' + protegido.total + ' entre quem possui veículo.',
        pct: protegido.pct
      }),
      kpi({
        rotulo: 'Consideram o trânsito seguro', valor: S.fmtDec(segura.pct), unidade: '%',
        apoio: '<b>' + segura.n + '</b> avaliaram a região como segura.',
        pct: segura.pct
      }),
      kpi({
        rotulo: 'Nunca ou raramente usam ônibus', valor: S.fmtDec(nuncaTp.pct), unidade: '%',
        apoio: '<b>' + nuncaTp.n + '</b> de ' + nuncaTp.total + ' declararam uso residual do transporte público.',
        pct: nuncaTp.pct
      }),
      kpi({
        rotulo: 'Trajetos de até 30 minutos',
        valor: S.fmtDec(S.pctDe(recorte, 'tempo', ['Menos de 15 minutos', 'Entre 15 e 30 minutos']).pct), unidade: '%',
        apoio: 'Deslocamentos curtos predominam na amostra.',
        pct: S.pctDe(recorte, 'tempo', ['Menos de 15 minutos', 'Entre 15 e 30 minutos']).pct
      })
    ]);

    frag.appendChild(secao('Indicadores do recorte'));
    frag.appendChild(kpis);

    frag.appendChild(secao('Panorama'));
    var g = h('div', { class: 'grelha' });
    g.appendChild(cartaoQuestao(recorte, 'transporte', { span: 'c6', forma: 'barras' }).el);
    g.appendChild(cartaoQuestao(recorte, 'avaliacao', { span: 'c6', forma: 'colunas', altura: 250 }).el);
    g.appendChild(cartaoQuestao(recorte, 'acidente', { span: 'c6', forma: 'barras' }).el);
    g.appendChild(cartaoQuestao(recorte, 'tempo', { span: 'c6', forma: 'colunas', altura: 250 }).el);
    frag.appendChild(g);

    frag.appendChild(secao('Leitura dos resultados'));
    frag.appendChild(h('div', { class: 'grelha' }, [
      (function () {
        var c = cartao({ titulo: 'O que estes números dizem', span: 'c12' });
        c.corpo.appendChild(h('div', { class: 'leitura', html: textoLeitura(recorte) }));
        return c.el;
      })()
    ]));

    return frag;
  };

  /** Análise escrita recalculada a partir do recorte ativo. */
  function textoLeitura(recorte) {
    var n = recorte.length;
    if (!n) return '<p>Nenhuma resposta atende aos filtros selecionados. Remova um filtro para retomar a leitura.</p>';

    var carro = S.pctDe(recorte, 'transporte', ['Carro próprio']);
    var conforto = S.pctDe(recorte, 'fator', ['Conforto e praticidade']);
    var tpRes = S.pctDe(recorte, 'freqTp', ['Nunca utilizo', 'Raramente']);
    var acid = S.pctDe(recorte, 'acidente', ['Sim, há mais de 1 ano', 'Sim, nos últimos 12 meses']);
    var graves = S.pctDe(recorte, 'gravidade', ['Acidente com ferimentos leves', 'Acidente com ferimentos graves']);
    var segura = S.pctDe(recorte, 'avaliacao', ['Segura']);
    var insegura = S.pctDe(recorte, 'avaliacao', ['Insegura']);
    var curto = S.pctDe(recorte, 'tempo', ['Menos de 15 minutos', 'Entre 15 e 30 minutos']);
    var comVeiculo = recorte.filter(function (r) { return r.veiculo !== 'Não possuo veículo'; });
    var seguroTotal = S.pctDe(comVeiculo, 'seguro', ['Sim, seguro total (cobertura completa)']);

    var p = [];

    p.push('<p>No recorte atual, com <strong>' + n + '</strong> respondentes, o deslocamento diário é ' +
      'organizado em torno do automóvel: <strong>' + S.fmtPct(carro.pct, 1) + '</strong> apontam o carro próprio como ' +
      'meio principal e <strong>' + S.fmtPct(tpRes.pct, 1) + '</strong> declaram uso apenas residual do transporte ' +
      'público (nunca ou raramente). O motivo declarado reforça o quadro: <strong>' + S.fmtPct(conforto.pct, 1) +
      '</strong> escolhem o transporte por conforto e praticidade, à frente de economia, rapidez e segurança. ' +
      'A escolha modal, portanto, não é explicada por custo nem por tempo, mas por conveniência.</p>');

    p.push('<p>O tempo de trajeto ajuda a entender essa preferência: <strong>' + S.fmtPct(curto.pct, 1) +
      '</strong> gastam até 30 minutos até o trabalho ou o local de estudo, com média estimada de <strong>' +
      S.fmtDec(S.tempoMedio(recorte)) + ' minutos</strong>. Em deslocamentos curtos, a vantagem de tempo do ' +
      'transporte coletivo praticamente desaparece, e a conveniência do veículo individual prevalece.</p>');

    p.push('<p>Na dimensão de segurança, a exposição ao risco é alta: <strong>' + S.fmtPct(acid.pct, 1) +
      '</strong> dos respondentes já se envolveram em algum acidente de trânsito, ainda que a maior parte ' +
      'desses episódios tenha ficado restrita a danos materiais. Eventos com vítimas alcançam <strong>' +
      S.fmtPct(graves.pct, 1) + '</strong> da amostra. Mesmo assim, <strong>' + S.fmtPct(segura.pct, 1) +
      '</strong> avaliam como segura a região onde mais circulam e apenas <strong>' + S.fmtPct(insegura.pct, 1) +
      '</strong> a consideram insegura — um descompasso entre o risco vivido e o risco percebido que é, ' +
      'em si, um achado relevante da pesquisa.</p>');

    p.push('<p>A proteção patrimonial acompanha a centralidade do veículo: entre quem possui veículo na ' +
      'residência, <strong>' + S.fmtPct(seguroTotal.pct, 1) + '</strong> mantêm seguro com cobertura completa. ' +
      'A justificativa predominante é a busca por segurança e tranquilidade, e não uma exigência externa, ' +
      'o que sugere contratação por percepção de risco — ainda que esse mesmo grupo avalie o trânsito local como seguro.</p>');

    return p.join('');
  }

  function paginaBloco(bloco, recorte, formas) {
    return function () {
      var frag = document.createDocumentFragment();
      var questoes = global.SCHEMA.filter(function (q) { return q.bloco === bloco; });
      frag.appendChild(secao(global.BLOCOS[bloco]));
      var g = h('div', { class: 'grelha' });
      questoes.forEach(function (q) {
        var o = (formas && formas[q.key]) || {};
        g.appendChild(cartaoQuestao(recorte, q.key, Object.assign({ span: 'c6' }, o)).el);
      });
      frag.appendChild(g);
      return frag;
    };
  }

  PAGINAS.perfil = function (recorte) {
    var frag = paginaBloco('perfil', recorte, {
      genero: { forma: 'rosca', altura: 210 },
      faixa: { forma: 'colunas' },
      cnh: { forma: 'barras' },
      veiculo: { forma: 'barras' }
    })();
    frag.appendChild(secao('Perfil cruzado'));
    var g = h('div', { class: 'grelha' });
    g.appendChild(cartaoCruzamento(recorte, 'veiculo', 'faixa', {
      span: 'c12', altura: 280,
      titulo: 'Posse de veículo segundo a faixa etária',
      nota: 'Leitura por coluna: dentro de cada faixa etária, como se distribui a posse de veículo.'
    }).el);
    frag.appendChild(g);
    return frag;
  };

  PAGINAS.protecao = function (recorte) {
    var frag = document.createDocumentFragment();
    frag.appendChild(secao('Proteção veicular'));
    frag.appendChild(h('p', {
      class: 'destaque-analise',
      html: 'As questões 5 e 6 só se aplicam a quem possui veículo na residência. As <b>' +
        recorte.filter(function (r) { return r.veiculo === 'Não possuo veículo'; }).length +
        '</b> pessoas sem veículo aparecem como “não se aplica” e podem ser retiradas da base de porcentagem ' +
        'no botão de cada cartão.'
    }));
    var g = h('div', { class: 'grelha' });
    g.appendChild(cartaoQuestao(recorte, 'seguro', { span: 'c6', forma: 'barras', excluirNA: true, nota: 'Base: apenas quem possui veículo.' }).el);
    g.appendChild(cartaoQuestao(recorte, 'motivo', { span: 'c6', forma: 'barras', excluirNA: true, nota: 'Base: apenas quem possui veículo.' }).el);
    frag.appendChild(g);

    frag.appendChild(secao('Proteção e experiência de acidente'));
    frag.appendChild(h('div', { class: 'grelha' }, [
      cartaoCruzamento(recorte, 'seguro', 'acidente', {
        span: 'c12', altura: 290,
        titulo: 'Tipo de cobertura segundo o histórico de acidente',
        nota: 'Cada coluna fecha 100%: compara a composição da cobertura entre quem já se acidentou e quem nunca se acidentou.'
      }).el
    ]));
    return frag;
  };

  PAGINAS.mobilidade = function (recorte) {
    var frag = paginaBloco('mobilidade', recorte, {
      transporte: { forma: 'barras' },
      freqTp: { forma: 'colunas' },
      fator: { forma: 'barras' },
      tempo: { forma: 'colunas' }
    })();
    frag.appendChild(secao('Padrão de deslocamento por grupo'));
    var g = h('div', { class: 'grelha' });
    g.appendChild(cartaoCruzamento(recorte, 'tempo', 'transporte', {
      span: 'c12', altura: 300,
      titulo: 'Tempo de trajeto segundo o meio de transporte principal',
      nota: 'Cada coluna fecha 100%: mostra como o tempo se distribui dentro de cada modo de transporte.'
    }).el);
    frag.appendChild(g);
    return frag;
  };

  PAGINAS.seguranca = function (recorte) {
    var frag = paginaBloco('seguranca', recorte, {
      acidente: { forma: 'barras' },
      gravidade: { forma: 'barras' },
      avaliacao: { forma: 'colunas' }
    })();
    frag.appendChild(secao('Risco vivido × risco percebido'));
    var g = h('div', { class: 'grelha' });
    g.appendChild(cartaoCruzamento(recorte, 'avaliacao', 'acidente', {
      span: 'c12', altura: 290,
      titulo: 'Percepção de segurança segundo o histórico de acidente',
      nota: 'Testa se quem já se acidentou avalia o trânsito de forma diferente de quem nunca se acidentou.'
    }).el);
    frag.appendChild(g);
    return frag;
  };

  PAGINAS.cruzamentos = function (recorte) {
    var frag = document.createDocumentFragment();
    frag.appendChild(secao('Construtor de cruzamentos'));

    var opcoesQ = function (selecionada) {
      return global.SCHEMA.map(function (q) {
        return h('option', { value: q.key, selected: q.key === selecionada ? 'selected' : null, text: 'Q' + q.num + ' · ' + q.curto });
      });
    };

    var selLinha = h('select', {
      class: 'campo', id: 'sel-linha',
      onchange: function (e) { estado.cruzamento.linha = e.target.value; renderizar(); }
    }, opcoesQ(estado.cruzamento.linha));

    var selColuna = h('select', {
      class: 'campo', id: 'sel-coluna',
      onchange: function (e) { estado.cruzamento.coluna = e.target.value; renderizar(); }
    }, opcoesQ(estado.cruzamento.coluna));

    var selForma = h('select', {
      class: 'campo', id: 'sel-forma',
      onchange: function (e) { estado.cruzamento.forma = e.target.value; renderizar(); }
    }, [
      h('option', { value: 'empilhado', selected: estado.cruzamento.forma === 'empilhado' ? 'selected' : null, text: '100% empilhado' }),
      h('option', { value: 'agrupado', selected: estado.cruzamento.forma === 'agrupado' ? 'selected' : null, text: 'Barras agrupadas' })
    ]);

    frag.appendChild(h('div', { class: 'linha-controles' }, [
      h('div', { class: 'campo-grupo' }, [h('label', { class: 'campo-rotulo', for: 'sel-linha', text: 'Categorias empilhadas (linhas)' }), selLinha]),
      h('div', { class: 'campo-grupo' }, [h('label', { class: 'campo-rotulo', for: 'sel-coluna', text: 'Grupos comparados (colunas)' }), selColuna]),
      h('div', { class: 'campo-grupo' }, [h('label', { class: 'campo-rotulo', for: 'sel-forma', text: 'Forma do gráfico' }), selForma]),
      h('button', {
        class: 'btn', type: 'button', text: 'Inverter eixos',
        onclick: function () {
          var t = estado.cruzamento.linha;
          estado.cruzamento.linha = estado.cruzamento.coluna;
          estado.cruzamento.coluna = t;
          renderizar();
        }
      })
    ]));

    if (estado.cruzamento.linha === estado.cruzamento.coluna) {
      frag.appendChild(h('p', { class: 'destaque-analise', text: 'Escolha duas questões diferentes para cruzar.' }));
      return frag;
    }

    var c = cartaoCruzamento(recorte, estado.cruzamento.linha, estado.cruzamento.coluna, {
      span: 'c12', altura: 320, forma: estado.cruzamento.forma
    });
    frag.appendChild(h('div', { class: 'grelha' }, [c.el]));

    frag.appendChild(h('div', { class: 'grelha', style: 'margin-top:14px' }, [
      (function () {
        var cc = cartao({ titulo: 'Tabela de cruzamento (% por coluna)', span: 'c12', nota: 'Formato exigido no enunciado: quantidades e porcentagens, com cada coluna fechando 100%.' });
        cc.corpo.appendChild(tabelaCruzamento(c.tab));
        cc.ferramentas.appendChild(botaoFerramenta('baixar', 'Baixar em CSV', function () {
          baixar('cruzamento-' + estado.cruzamento.linha + '-x-' + estado.cruzamento.coluna + '.csv', csvCruzamento(c.tab));
          avisar('Tabela de cruzamento exportada.');
        }));
        return cc.el;
      })()
    ]));

    frag.appendChild(secao('Cruzamentos em destaque'));
    frag.appendChild(h('div', { class: 'grelha' }, [
      cartaoCruzamento(recorte, 'transporte', 'genero', {
        span: 'c12', altura: 290,
        titulo: 'Meio de transporte principal segundo o gênero',
        nota: 'Cruzamento 1 do relatório. Cada coluna fecha 100%.'
      }).el,
      cartaoCruzamento(recorte, 'gravidade', 'faixa', {
        span: 'c12', altura: 300,
        titulo: 'Gravidade do acidente mais marcante segundo a faixa etária',
        nota: 'Cruzamento 2 do relatório. Cada coluna fecha 100%.'
      }).el
    ]));

    return frag;
  };

  PAGINAS.tabelas = function (recorte) {
    var frag = document.createDocumentFragment();
    frag.appendChild(secao('Tabelas de frequência — todas as questões'));
    frag.appendChild(h('p', {
      class: 'destaque-analise',
      html: 'Uma tabela por questão fechada, no modelo do enunciado: <b>Respostas · Quantidades · Porcentagens · Total</b>, ' +
        'com a fonte indicada. As tabelas respeitam o recorte de filtros ativo.'
    }));

    var g = h('div', { class: 'grelha', style: 'margin-top:14px' });
    global.SCHEMA.forEach(function (q) {
      var f = S.frequencia(recorte, q.key);
      var c = cartao({ titulo: 'Tabela ' + q.num + ' — ' + q.curto, nota: q.titulo, span: 'c6' });
      c.corpo.appendChild(tabelaFrequencia(f, { legenda: false }));
      c.ferramentas.appendChild(botaoFerramenta('baixar', 'Baixar em CSV', function () {
        baixar('tabela-q' + q.num + '-' + q.key + '.csv', csvFrequencia(f));
        avisar('Tabela ' + q.num + ' exportada.');
      }));
      g.appendChild(c.el);
    });
    frag.appendChild(g);
    return frag;
  };

  PAGINAS.relatorio = function (recorte) {
    var frag = document.createDocumentFragment();
    var n = estado.registros.length;

    frag.appendChild(secao('Relatório da pesquisa'));

    var c = cartao({
      titulo: 'Mobilidade urbana e segurança no trânsito',
      nota: 'Texto de apoio para o relatório escrito. Os percentuais acompanham o recorte de filtros ativo.',
      span: 'c12'
    });

    var corpo = h('div', { class: 'leitura' });
    corpo.innerHTML =
      '<h3>1. Introdução</h3>' +
      '<p>A mobilidade urbana trata de como as pessoas se deslocam pela cidade e de quanto esse ' +
      'deslocamento custa em tempo, dinheiro e risco. No Brasil, a escolha entre transporte individual e ' +
      'coletivo se dá em um cenário de infraestrutura desigual, o que torna a decisão de cada pessoa um ' +
      'indicador indireto da qualidade do sistema de transporte disponível. A segurança no trânsito é a ' +
      'contrapartida dessa escolha: quanto maior a dependência do veículo individual, maior a exposição ' +
      'ao risco de acidente e maior a preocupação com proteção patrimonial.</p>' +

      '<h3>2. Objetivos</h3>' +
      '<p>O objetivo geral é descrever o padrão de deslocamento diário e a percepção de segurança no ' +
      'trânsito de um grupo de adultos residentes em área urbana. Como objetivos específicos, a pesquisa ' +
      'buscou: (i) identificar o meio de transporte principal e o motivo declarado da escolha; ' +
      '(ii) medir o tempo gasto no trajeto diário; (iii) levantar a frequência de uso do transporte ' +
      'público; (iv) verificar a ocorrência e a gravidade de acidentes de trânsito; (v) descrever a ' +
      'cobertura de seguro ou proteção veicular; e (vi) confrontar a experiência de acidente com a ' +
      'percepção de segurança da região.</p>' +

      '<h3>3. População-alvo e método</h3>' +
      '<p>A população-alvo é composta por pessoas em idade de trabalho ou estudo que realizam ' +
      'deslocamentos urbanos regulares. O questionário, com <strong>13 questões fechadas de múltipla ' +
      'escolha</strong> e resposta única, foi aplicado por formulário on-line (Google Forms) entre ' +
      '17 de agosto e 9 de setembro de 2026, obtendo <strong>' + n + ' respostas válidas</strong>. ' +
      'A amostra é não probabilística, por conveniência, de modo que os resultados descrevem o grupo ' +
      'pesquisado e não autorizam generalização para a população urbana como um todo. ' +
      (n < 30
        ? '<strong>Observação metodológica:</strong> o enunciado do trabalho pede no mínimo 30 respondentes e a ' +
          'base atual tem ' + n + '. É recomendável ampliar a coleta antes da entrega final.'
        : 'O número de respondentes atende ao mínimo de 30 previsto no enunciado.') +
      '</p>' +

      '<h3>4. Resultados</h3>' +
      textoLeitura(recorte) +

      '<h3>5. Conclusão</h3>' +
      '<p>Os dados desenham um grupo automóvel-dependente por conveniência, e não por necessidade de ' +
      'tempo: os trajetos são majoritariamente curtos, e ainda assim o transporte público é pouco ' +
      'utilizado. A exposição ao acidente é elevada e, na maior parte dos casos, de baixa gravidade — ' +
      'o que ajuda a explicar por que a percepção de insegurança permanece baixa mesmo entre quem já se ' +
      'envolveu em ocorrências. Esse descompasso entre risco vivido e risco percebido é o principal ' +
      'achado do levantamento e sugere que campanhas de segurança viária dirigidas a este perfil ' +
      'precisam trabalhar a percepção de risco, e não apenas a informação sobre risco. Para as decisões ' +
      'de proteção veicular, a motivação declarada é a tranquilidade no dia a dia, o que reforça a ' +
      'leitura de que a proteção é tratada como cuidado patrimonial rotineiro.</p>' +

      '<h3>6. Limitações</h3>' +
      '<p>A amostra é pequena e não probabilística, o que amplia a margem de erro das estimativas. ' +
      'Nos cruzamentos, várias caselas apresentam frequência esperada inferior a 5, condição em que o ' +
      'teste qui-quadrado perde validade formal; por isso os testes exibidos neste painel devem ser ' +
      'lidos como indício de associação, e não como prova estatística.</p>';

    c.corpo.appendChild(corpo);
    c.ferramentas.appendChild(botaoFerramenta('imprimir', 'Imprimir ou salvar em PDF', function () { global.print(); }));
    frag.appendChild(h('div', { class: 'grelha' }, [c.el]));
    return frag;
  };

  // ---------------------------------------------------------------- navegação

  var NAV = [
    { id: 'visao', rotulo: 'Visão geral', grupo: 'Painel' },
    { id: 'perfil', rotulo: 'Perfil', grupo: 'Blocos' },
    { id: 'protecao', rotulo: 'Proteção veicular', grupo: 'Blocos' },
    { id: 'mobilidade', rotulo: 'Mobilidade', grupo: 'Blocos' },
    { id: 'seguranca', rotulo: 'Segurança', grupo: 'Blocos' },
    { id: 'cruzamentos', rotulo: 'Cruzamentos', grupo: 'Análise' },
    { id: 'tabelas', rotulo: 'Tabelas', grupo: 'Análise' },
    { id: 'relatorio', rotulo: 'Relatório', grupo: 'Análise' }
  ];

  var SUBTITULOS = {
    visao: 'Indicadores-chave e panorama das respostas',
    perfil: 'Quem respondeu: gênero, idade, habilitação e posse de veículo',
    protecao: 'Seguro e proteção veicular entre quem possui veículo',
    mobilidade: 'Meio de transporte, frequência, motivo da escolha e tempo de trajeto',
    seguranca: 'Histórico de acidentes, gravidade e percepção de segurança',
    cruzamentos: 'Cruzamento entre duas variáveis com porcentagem por coluna',
    tabelas: 'Tabelas de frequência de todas as questões isoladas',
    relatorio: 'Texto de apoio com introdução, análise e conclusão'
  };

  function montarNav() {
    var alvo = document.getElementById('nav');
    alvo.innerHTML = '';
    var grupoAtual = null;
    var caixa = null;

    NAV.forEach(function (item) {
      if (item.grupo !== grupoAtual) {
        grupoAtual = item.grupo;
        caixa = h('div', { class: 'grupo-rail' }, [h('div', { class: 'rotulo-grupo', text: grupoAtual })]);
        alvo.appendChild(caixa);
      }
      var b = h('button', {
        class: 'nav-item', type: 'button',
        'aria-current': estado.pagina === item.id ? 'page' : null,
        onclick: function () {
          estado.pagina = item.id;
          document.getElementById('rail').classList.remove('aberto');
          renderizar();
          document.querySelector('.conteudo').scrollIntoView({ block: 'start' });
        }
      }, [icone(item.id, 'nav-icone'), document.createTextNode(item.rotulo)]);
      caixa.appendChild(b);
    });
  }

  // ------------------------------------------------------------------- render

  var renderizando = false;

  function renderizar() {
    if (renderizando) return;
    renderizando = true;
    G.esconderDica();

    var recorte = registrosFiltrados();

    montarNav();
    montarSlicers();
    montarChips(document.getElementById('chips'), recorte);

    document.getElementById('titulo-pagina').textContent =
      (NAV.find(function (x) { return x.id === estado.pagina; }) || {}).rotulo || '';
    document.getElementById('subtitulo-pagina').textContent = SUBTITULOS[estado.pagina] || '';

    var palco = document.getElementById('palco');
    palco.innerHTML = '';

    if (!recorte.length && estado.pagina !== 'relatorio') {
      palco.appendChild(h('p', { class: 'vazio', text: 'Nenhuma resposta atende à combinação de filtros. Remova um filtro para continuar.' }));
    } else {
      palco.appendChild(PAGINAS[estado.pagina](recorte));
    }

    renderizando = false;
  }

  // -------------------------------------------------------------------- topo

  function montarTopo() {
    var acoes = document.getElementById('acoes-topo');
    acoes.innerHTML = '';

    var temas = h('div', { class: 'temas', role: 'group', 'aria-label': 'Cor do painel' });
    Object.keys(global.Tema.temas).forEach(function (nome) {
      var t = global.Tema.temas[nome];
      temas.appendChild(h('button', {
        class: 'tema-bolha', type: 'button', title: 'Tema ' + t.nome,
        'aria-label': 'Tema ' + t.nome,
        'aria-pressed': global.Tema.estado.tema === nome ? 'true' : 'false',
        style: '--amostra:' + t.amostra,
        onclick: function () { global.Tema.definirTema(nome); montarTopo(); renderizar(); }
      }));
    });
    acoes.appendChild(temas);

    var escuro = global.Tema.estado.modo === 'dark';
    var btnModo = h('button', {
      class: 'btn btn-sutil', type: 'button',
      title: escuro ? 'Mudar para o modo claro' : 'Mudar para o modo escuro',
      'aria-label': escuro ? 'Mudar para o modo claro' : 'Mudar para o modo escuro',
      onclick: function () { global.Tema.alternarModo(); montarTopo(); renderizar(); }
    });
    btnModo.appendChild(icone(escuro ? 'sol' : 'lua'));
    acoes.appendChild(btnModo);

    var btnBase = h('button', {
      class: 'btn', type: 'button',
      onclick: function () {
        baixar('base-respostas-recorte.csv', csvBase(registrosFiltrados()));
        avisar('Base do recorte exportada em CSV.');
      }
    }, [document.createTextNode('Exportar base')]);
    btnBase.insertBefore(icone('baixar'), btnBase.firstChild);
    acoes.appendChild(btnBase);

    var btnImprimir = h('button', {
      class: 'btn', type: 'button', onclick: function () { global.print(); }
    }, [document.createTextNode('Imprimir')]);
    btnImprimir.insertBefore(icone('imprimir'), btnImprimir.firstChild);
    acoes.appendChild(btnImprimir);
  }

  function montarRodape(info) {
    var r = document.getElementById('rodape');
    r.innerHTML = '';

    var noFirestore = info.origem === 'firestore';
    r.appendChild(h('span', { class: 'selo ' + (noFirestore ? 'ok' : '') }, [
      h('span', { class: 'ponto' }),
      document.createTextNode(noFirestore
        ? 'Firestore · ' + global.Dados.projeto + ' · ' + info.registros.length + ' registros'
        : 'Base local · ' + info.registros.length + ' registros')
    ]));

    if (!noFirestore) {
      r.appendChild(h('span', { text: 'Respostas embutidas na página — o painel não depende do banco para funcionar.' }));
    }

    r.appendChild(h('span', { html: 'Coleta: 17/08/2026 a 09/09/2026 · questionário de 13 questões fechadas · amostra não probabilística.' }));

    var btn = h('button', {
      class: 'btn btn-sutil', type: 'button',
      title: 'Envia as respostas da base local para a coleção "' + global.Dados.colecao + '" no Firestore',
      onclick: function () {
        var ok = confirm('Enviar as ' + (global.DATASET_LOCAL || []).length + ' respostas locais para a coleção "' +
          global.Dados.colecao + '" do projeto ' + global.Dados.projeto + '?\n\n' +
          'Documentos com o mesmo id serão sobrescritos.');
        if (!ok) return;
        global.Dados.publicarBaseLocal()
          .then(function (n) { avisar(n + ' respostas publicadas no Firestore. Recarregue para ler de lá.'); })
          .catch(function (e) { avisar('Falha ao publicar: ' + e.message, true); });
      }
    }, [document.createTextNode('Publicar base no Firestore')]);
    btn.insertBefore(icone('nuvem'), btn.firstChild);
    r.appendChild(btn);
  }

  // -------------------------------------------------------------------- start

  function iniciar() {
    global.Tema.iniciar();
    montarTopo();

    document.getElementById('rail-toggle').addEventListener('click', function () {
      document.getElementById('rail').classList.toggle('aberto');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        document.getElementById('rail').classList.remove('aberto');
        if (totalFiltros()) { limparTudo(); avisar('Filtros limpos.'); }
      }
    });

    // Pinta com a base local no primeiro quadro — nada de espera por rede.
    var local = global.Dados.baseLocal();
    estado.registros = local.registros;
    estado.origem = local.origem;
    montarRodape(local);
    renderizar();

    // Se o Firestore responder, troca a base e redesenha preservando a página
    // e os filtros que a pessoa já tiver escolhido nesse meio-tempo.
    global.Dados.tentarFirestore().then(function (info) {
      if (!info) return;
      estado.registros = info.registros;
      estado.origem = info.origem;
      montarRodape(info);
      renderizar();
      avisar('Dados atualizados a partir do Firestore (' + info.registros.length + ' respostas).');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  global.App = { estado: estado, renderizar: renderizar };
})(window);
