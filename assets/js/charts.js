/**
 * charts.js — renderizador de gráficos em SVG, escrito sob medida.
 *
 * Não há biblioteca externa: o controle direto do SVG é o que permite seguir as
 * especificações de marca do guia de visualização — traço fino, ponta de dado
 * arredondada em 4px ancorada na linha de base, folga de 2px entre preenchimentos
 * empilhados, grade e eixos em fio de cabelo, rótulo direto seletivo e camada de
 * hover em todos os gráficos.
 *
 * Todo gráfico é redesenhado quando o container muda de largura e quando o tema
 * muda. Cada função devolve o elemento <svg> já inserido no container.
 */
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var FONTE = 11;
  var RAIO = 4;          // raio da ponta de dado
  var FOLGA = 2;         // folga entre preenchimentos adjacentes
  var registrados = [];  // {el, desenhar} para redesenho em resize/troca de tema

  // ---------------------------------------------------------------- utilidades

  function el(nome, attrs, pai) {
    var n = document.createElementNS(NS, nome);
    if (attrs) for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (pai) pai.appendChild(n);
    return n;
  }

  function texto(pai, x, y, str, attrs) {
    var t = el('text', Object.assign({ x: x, y: y }, attrs || {}), pai);
    t.textContent = str;
    return t;
  }

  /** Largura aproximada de um texto — evita reflow de medição real a cada frame. */
  function largura(str, tamanho) {
    return String(str).length * tamanho * 0.545;
  }

  function truncar(str, max, tamanho) {
    if (largura(str, tamanho) <= max) return str;
    var n = Math.max(1, Math.floor(max / (tamanho * 0.545)) - 1);
    return String(str).slice(0, n).replace(/[\s,–-]+$/, '') + '…';
  }

  /** Retângulo com cantos arredondados apenas do lado da ponta de dado. */
  function caminhoBarra(x, y, w, h, r, lado) {
    r = Math.max(0, Math.min(r, h / 2, w));
    if (r < 0.5) return 'M' + x + ' ' + y + 'h' + w + 'v' + h + 'h' + (-w) + 'Z';
    if (lado === 'direita') {
      return 'M' + x + ' ' + y +
        'h' + (w - r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r +
        'v' + (h - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + (-r) + ' ' + r +
        'h' + (-(w - r)) + 'Z';
    }
    // lado === 'topo'
    r = Math.max(0, Math.min(r, w / 2, h));
    return 'M' + x + ' ' + (y + h) +
      'v' + (-(h - r)) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + (-r) +
      'h' + (w - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r +
      'v' + (h - r) + 'Z';
  }

  function css(nome) {
    return getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  }

  /**
   * Cor de texto legível sobre um preenchimento. Rótulo dentro da marca só é
   * aceitável se ele próprio tiver contraste — nos degraus claros da rampa a
   * tinta escura é que resolve, não a cor da superfície.
   */
  function tintaSobre(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var canais = [0, 2, 4].map(function (i) {
      var s = parseInt(h.slice(i, i + 2), 16) / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    var lum = 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
    var contrasteClaro = 1.05 / (lum + 0.05);
    var contrasteEscuro = (lum + 0.05) / 0.05;
    return contrasteEscuro > contrasteClaro ? '#14151a' : '#ffffff';
  }

  // ------------------------------------------------------------------ tooltip

  var dica = null;
  function obterDica() {
    if (!dica) {
      dica = document.createElement('div');
      dica.className = 'dica-grafico';
      dica.setAttribute('role', 'status');
      document.body.appendChild(dica);
    }
    return dica;
  }

  function mostrarDica(evt, html) {
    var d = obterDica();
    d.innerHTML = html;
    d.classList.add('visivel');
    var r = d.getBoundingClientRect();
    var x = evt.clientX + 14, y = evt.clientY - r.height - 10;
    if (x + r.width > innerWidth - 8) x = evt.clientX - r.width - 14;
    if (y < 8) y = evt.clientY + 18;
    d.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
  }

  function esconderDica() {
    if (dica) dica.classList.remove('visivel');
  }

  /** Área de toque generosa: o alvo de hover cobre a faixa inteira da categoria. */
  function alvo(pai, x, y, w, h, html, aoClicar) {
    var a = el('rect', { x: x, y: y, width: Math.max(0, w), height: Math.max(0, h), fill: 'transparent' }, pai);
    a.addEventListener('mousemove', function (e) { mostrarDica(e, html); });
    a.addEventListener('mouseleave', esconderDica);
    if (aoClicar) {
      a.style.cursor = 'pointer';
      a.addEventListener('click', function (e) { esconderDica(); aoClicar(e); });
    }
    return a;
  }

  // --------------------------------------------------------------- moldura SVG

  function moldura(container, altura, descricao) {
    container.innerHTML = '';
    var w = Math.max(240, container.clientWidth || 480);
    var svg = el('svg', {
      width: w, height: altura, viewBox: '0 0 ' + w + ' ' + altura,
      role: 'img', 'aria-label': descricao || ''
    }, container);
    svg.style.display = 'block';
    return { svg: svg, w: w, h: altura };
  }

  function registrar(container, desenhar) {
    var achado = registrados.find(function (r) { return r.el === container; });
    if (achado) achado.desenhar = desenhar;
    else registrados.push({ el: container, desenhar: desenhar });
    desenhar();
  }

  function redesenharTudo() {
    registrados = registrados.filter(function (r) { return document.body.contains(r.el); });
    registrados.forEach(function (r) {
      if (r.el.offsetParent !== null || r.el.clientWidth > 0) r.desenhar();
    });
  }

  var timerResize;
  global.addEventListener('resize', function () {
    clearTimeout(timerResize);
    timerResize = setTimeout(redesenharTudo, 120);
  });

  // ================================================================== GRÁFICOS

  /**
   * Barras horizontais, série única.
   * dados: [{rotulo, n, pct, categoria}] — já ordenado pelo dicionário.
   */
  function barras(container, dados, opts) {
    opts = opts || {};
    registrar(container, function () {
      var linhas = dados.length;
      if (!linhas) { container.innerHTML = '<p class="vazio">Sem respostas neste recorte.</p>'; return; }

      var alturaBarra = opts.alturaBarra || 22;
      var passo = alturaBarra + 14;
      var margemTopo = 6, margemBase = 22;
      var alt = margemTopo + linhas * passo + margemBase;
      var m = moldura(container, alt, opts.descricao);
      var svg = m.svg;

      var gutter = Math.min(Math.round(m.w * 0.38), 168);
      var espacoValor = 80; // cabe "100,0% · 27" sem cortar
      var x0 = gutter + 10;
      var largMax = m.w - x0 - espacoValor;
      var maxPct = Math.max.apply(null, dados.map(function (d) { return d.pct; }));
      var escala = maxPct > 0 ? largMax / Math.max(maxPct, 5) : 0;

      var cores = opts.cores || null;
      var corUnica = opts.cor || css('--acento-marca');
      var grade = css('--grade');
      var ink2 = css('--ink-2'), ink3 = css('--ink-3'), ink1 = css('--ink-1');

      // grade vertical em fio de cabelo (0 / meio / máximo)
      var marcas = [0, maxPct / 2, maxPct].map(function (v) { return Math.round(v); });
      marcas.forEach(function (v) {
        var x = x0 + v * escala;
        el('line', { x1: x, y1: margemTopo, x2: x, y2: alt - margemBase + 4, stroke: grade, 'stroke-width': 1 }, svg);
        texto(svg, x, alt - margemBase + 16, v + '%', { fill: ink3, 'font-size': 10, 'text-anchor': v === 0 ? 'start' : 'middle', class: 'num' });
      });

      dados.forEach(function (d, i) {
        var y = margemTopo + i * passo;
        var w = Math.max(d.pct * escala, d.n > 0 ? 3 : 0);
        var cor = cores ? cores[i % cores.length] : corUnica;
        var selecionado = opts.selecionado === d.categoria;
        var atenuado = opts.selecionado != null && !selecionado;

        el('path', {
          d: caminhoBarra(x0, y, w, alturaBarra, RAIO, 'direita'),
          fill: cor, opacity: atenuado ? 0.28 : 1
        }, svg);

        texto(svg, gutter, y + alturaBarra / 2 + 4,
          truncar(d.rotulo, gutter - 6, FONTE), {
            fill: selecionado ? ink1 : ink2, 'font-size': FONTE, 'text-anchor': 'end',
            'font-weight': selecionado ? 600 : 400, opacity: atenuado ? 0.55 : 1
          });

        texto(svg, x0 + w + 8, y + alturaBarra / 2 + 4,
          global.Stats.fmtPct(d.pct, 1) + '  ·  ' + d.n, {
            fill: ink2, 'font-size': 10.5, class: 'num', opacity: atenuado ? 0.5 : 1
          });

        alvo(svg, 0, y - 7, m.w, passo,
          '<b>' + d.rotulo + '</b><span>' + d.n + ' de ' + opts.total +
          ' respostas · ' + global.Stats.fmtPct(d.pct, 1) + '</span>',
          opts.aoClicar && function () { opts.aoClicar(d.categoria); });
      });
    });
  }

  /**
   * Colunas verticais — usado em escalas ordinais, onde a leitura da esquerda
   * para a direita reproduz a ordem da própria escala.
   */
  function colunas(container, dados, opts) {
    opts = opts || {};
    registrar(container, function () {
      var n = dados.length;
      if (!n) { container.innerHTML = '<p class="vazio">Sem respostas neste recorte.</p>'; return; }

      var alt = opts.altura || 260;
      var m = moldura(container, alt, opts.descricao);
      var svg = m.svg;

      var margem = { topo: 24, dir: 8, base: 40, esq: 34 };
      var plotW = m.w - margem.esq - margem.dir;
      var plotH = alt - margem.topo - margem.base;
      var maxPct = Math.max.apply(null, dados.map(function (d) { return d.pct; }));
      var teto = Math.max(10, Math.ceil(maxPct / 10) * 10);

      var grade = css('--grade'), eixo = css('--eixo');
      var ink2 = css('--ink-2'), ink3 = css('--ink-3');
      var cores = opts.cores || null;
      var corUnica = opts.cor || css('--acento-marca');

      for (var t = 0; t <= teto; t += teto / 4) {
        var y = margem.topo + plotH - (t / teto) * plotH;
        el('line', { x1: margem.esq, y1: y, x2: m.w - margem.dir, y2: y, stroke: grade, 'stroke-width': 1 }, svg);
        texto(svg, margem.esq - 8, y + 3.5, Math.round(t) + '%', { fill: ink3, 'font-size': 10, 'text-anchor': 'end', class: 'num' });
      }
      el('line', {
        x1: margem.esq, y1: margem.topo + plotH, x2: m.w - margem.dir, y2: margem.topo + plotH,
        stroke: eixo, 'stroke-width': 1
      }, svg);

      var passo = plotW / n;
      var larguraBarra = Math.min(passo - Math.max(FOLGA * 3, 10), 64);

      dados.forEach(function (d, i) {
        var h = (d.pct / teto) * plotH;
        var x = margem.esq + i * passo + (passo - larguraBarra) / 2;
        var y = margem.topo + plotH - h;
        var cor = cores ? cores[i % cores.length] : corUnica;
        var selecionado = opts.selecionado === d.categoria;
        var atenuado = opts.selecionado != null && !selecionado;

        if (h > 0.5) {
          el('path', {
            d: caminhoBarra(x, y, larguraBarra, Math.max(h, 2), RAIO, 'topo'),
            fill: cor, opacity: atenuado ? 0.28 : 1
          }, svg);
        }

        texto(svg, x + larguraBarra / 2, y - 7, global.Stats.fmtPct(d.pct, 1), {
          fill: ink2, 'font-size': 10.5, 'text-anchor': 'middle', class: 'num',
          'font-weight': selecionado ? 600 : 500, opacity: atenuado ? 0.5 : 1
        });

        var rot = truncar(d.rotulo, passo - 4, 10);
        texto(svg, x + larguraBarra / 2, margem.topo + plotH + 16, rot, {
          fill: selecionado ? css('--ink-1') : ink3, 'font-size': 10, 'text-anchor': 'middle',
          'font-weight': selecionado ? 600 : 400, opacity: atenuado ? 0.55 : 1
        });

        alvo(svg, margem.esq + i * passo, margem.topo, passo, plotH + 24,
          '<b>' + d.rotulo + '</b><span>' + d.n + ' de ' + opts.total +
          ' respostas · ' + global.Stats.fmtPct(d.pct, 1) + '</span>',
          opts.aoClicar && function () { opts.aoClicar(d.categoria); });
      });
    });
  }

  /** Rosca — só para parte-do-todo com poucos setores e diferenças claras. */
  function rosca(container, dados, opts) {
    opts = opts || {};
    registrar(container, function () {
      if (!dados.length) { container.innerHTML = '<p class="vazio">Sem respostas neste recorte.</p>'; return; }
      var alt = opts.altura || 230;
      var m = moldura(container, alt, opts.descricao);
      var svg = m.svg;

      var cx = Math.min(m.w * 0.32, 110), cy = alt / 2;
      var raioExt = Math.min(cy - 14, 86), raioInt = raioExt * 0.62;
      var cores = opts.cores || global.Tema.rampaDe(dados.length);
      var superficie = css('--superficie');
      var ang = -Math.PI / 2;
      var total = dados.reduce(function (s, d) { return s + d.n; }, 0);

      dados.forEach(function (d, i) {
        var fracao = total ? d.n / total : 0;
        var varredura = fracao * Math.PI * 2;
        if (varredura <= 0) return;
        var a0 = ang, a1 = ang + varredura;
        ang = a1;
        var grande = varredura > Math.PI ? 1 : 0;
        var p = [
          'M', cx + raioExt * Math.cos(a0), cy + raioExt * Math.sin(a0),
          'A', raioExt, raioExt, 0, grande, 1, cx + raioExt * Math.cos(a1), cy + raioExt * Math.sin(a1),
          'L', cx + raioInt * Math.cos(a1), cy + raioInt * Math.sin(a1),
          'A', raioInt, raioInt, 0, grande, 0, cx + raioInt * Math.cos(a0), cy + raioInt * Math.sin(a0), 'Z'
        ].join(' ');
        var setor = el('path', { d: p, fill: cores[i % cores.length], stroke: superficie, 'stroke-width': FOLGA }, svg);
        setor.style.cursor = opts.aoClicar ? 'pointer' : 'default';
        setor.addEventListener('mousemove', function (e) {
          mostrarDica(e, '<b>' + d.rotulo + '</b><span>' + d.n + ' de ' + total +
            ' respostas · ' + global.Stats.fmtPct(d.pct, 1) + '</span>');
        });
        setor.addEventListener('mouseleave', esconderDica);
        if (opts.aoClicar) setor.addEventListener('click', function () { esconderDica(); opts.aoClicar(d.categoria); });
      });

      texto(svg, cx, cy - 2, String(total), { fill: css('--ink-1'), 'font-size': 26, 'font-weight': 600, 'text-anchor': 'middle' });
      texto(svg, cx, cy + 15, opts.legendaCentro || 'respostas', { fill: css('--ink-3'), 'font-size': 10, 'text-anchor': 'middle' });

      // legenda direta ao lado — identidade nunca depende só da cor
      var lx = cx + raioExt + 26;
      var passoL = 22;
      var ly = cy - (dados.length - 1) * passoL / 2;
      dados.forEach(function (d, i) {
        el('rect', { x: lx, y: ly - 7, width: 9, height: 9, rx: 2, fill: cores[i % cores.length] }, svg);
        texto(svg, lx + 15, ly, truncar(d.rotulo, m.w - lx - 74, FONTE), { fill: css('--ink-2'), 'font-size': FONTE });
        texto(svg, m.w - 4, ly, global.Stats.fmtPct(d.pct, 1), { fill: css('--ink-3'), 'font-size': 10.5, 'text-anchor': 'end', class: 'num' });
        ly += passoL;
      });
    });
  }

  /**
   * Barras 100% empilhadas — formato do cruzamento entre variáveis.
   * Cada coluna (grupo) fecha 100%, exatamente como a tabela exigida.
   * tab: saída de Stats.cruzamento.
   */
  function empilhado100(container, tab, opts) {
    opts = opts || {};
    registrar(container, function () {
      if (!tab.colunas.length || !tab.linhas.length) {
        container.innerHTML = '<p class="vazio">Sem dados suficientes para o cruzamento neste recorte.</p>';
        return;
      }
      var nCol = tab.colunas.length;
      var linhasLegenda = Math.ceil(tab.linhas.length / Math.max(1, Math.floor((container.clientWidth || 480) / 190)));
      var alturaLegenda = 16 + linhasLegenda * 20;
      var alt = (opts.altura || 300) + alturaLegenda;
      var m = moldura(container, alt, opts.descricao);
      var svg = m.svg;

      var margem = { topo: 16, dir: 10, base: 46 + alturaLegenda, esq: 38 };
      var plotW = m.w - margem.esq - margem.dir;
      var plotH = alt - margem.topo - margem.base;

      var cores = tab.escalaLinha === 'ordinal'
        ? global.Tema.rampaDe(tab.linhas.length)
        : global.Tema.categorica(tab.linhas.length);

      var grade = css('--grade'), eixo = css('--eixo');
      var ink2 = css('--ink-2'), ink3 = css('--ink-3');

      for (var t = 0; t <= 100; t += 25) {
        var y = margem.topo + plotH - (t / 100) * plotH;
        el('line', { x1: margem.esq, y1: y, x2: m.w - margem.dir, y2: y, stroke: grade, 'stroke-width': 1 }, svg);
        texto(svg, margem.esq - 8, y + 3.5, t + '%', { fill: ink3, 'font-size': 10, 'text-anchor': 'end', class: 'num' });
      }
      el('line', { x1: margem.esq, y1: margem.topo + plotH, x2: m.w - margem.dir, y2: margem.topo + plotH, stroke: eixo, 'stroke-width': 1 }, svg);

      var passo = plotW / nCol;
      var larg = Math.min(passo - 18, 92);

      tab.colunas.forEach(function (colCat, j) {
        var x = margem.esq + j * passo + (passo - larg) / 2;
        var acumulado = 0;

        tab.linhas.forEach(function (linCat, i) {
          var cel = tab.celulas[i][j];
          if (cel.pct <= 0) return;
          var h = (cel.pct / 100) * plotH;
          var y = margem.topo + plotH - (acumulado / 100) * plotH - h;
          var hDesenho = Math.max(h - FOLGA, 1);

          el('rect', { x: x, y: y, width: larg, height: hDesenho, fill: cores[i % cores.length], rx: 1.5 }, svg);

          // rótulo dentro do segmento apenas quando cabe com folga
          if (hDesenho >= 17 && larg >= 34) {
            texto(svg, x + larg / 2, y + hDesenho / 2 + 4, global.Stats.fmtPct(cel.pct, 0), {
              fill: tintaSobre(cores[i % cores.length]), 'font-size': 10.5,
              'text-anchor': 'middle', 'font-weight': 600, class: 'num'
            });
          }

          alvo(svg, x, y, larg, hDesenho,
            '<b>' + tab.rotulosLinha[i] + '</b><span>' + tab.tituloColuna + ': ' + tab.rotulosColuna[j] +
            '</span><span>' + cel.n + ' de ' + tab.totalCol[j] + ' · ' + global.Stats.fmtPct(cel.pct, 1) + ' da coluna</span>');

          acumulado += cel.pct;
        });

        var rot = truncar(tab.rotulosColuna[j], passo - 6, 10);
        texto(svg, x + larg / 2, margem.topo + plotH + 16, rot, { fill: ink2, 'font-size': 10, 'text-anchor': 'middle' });
        texto(svg, x + larg / 2, margem.topo + plotH + 30, 'n = ' + tab.totalCol[j], { fill: ink3, 'font-size': 9.5, 'text-anchor': 'middle', class: 'num' });
      });

      // legenda
      var colunasLeg = Math.max(1, Math.floor(m.w / 190));
      var largCol = m.w / colunasLeg;
      var baseY = alt - alturaLegenda + 10;
      tab.linhas.forEach(function (linCat, i) {
        var lx = 2 + (i % colunasLeg) * largCol;
        var ly = baseY + Math.floor(i / colunasLeg) * 20;
        el('rect', { x: lx, y: ly - 7, width: 9, height: 9, rx: 2, fill: cores[i % cores.length] }, svg);
        texto(svg, lx + 14, ly + 1, truncar(tab.rotulosLinha[i], largCol - 24, 10.5), { fill: ink2, 'font-size': 10.5 });
      });
    });
  }

  /** Barras agrupadas com porcentagem de coluna — leitura alternativa do cruzamento. */
  function agrupado(container, tab, opts) {
    opts = opts || {};
    registrar(container, function () {
      if (!tab.colunas.length || !tab.linhas.length) {
        container.innerHTML = '<p class="vazio">Sem dados suficientes para o cruzamento neste recorte.</p>';
        return;
      }
      var linhasLegenda = Math.ceil(tab.linhas.length / Math.max(1, Math.floor((container.clientWidth || 480) / 190)));
      var alturaLegenda = 16 + linhasLegenda * 20;
      var alt = (opts.altura || 300) + alturaLegenda;
      var m = moldura(container, alt, opts.descricao);
      var svg = m.svg;

      var margem = { topo: 20, dir: 10, base: 46 + alturaLegenda, esq: 38 };
      var plotW = m.w - margem.esq - margem.dir;
      var plotH = alt - margem.topo - margem.base;

      var maxPct = 0;
      tab.celulas.forEach(function (lin) { lin.forEach(function (c) { if (c.pct > maxPct) maxPct = c.pct; }); });
      var teto = Math.max(20, Math.ceil(maxPct / 20) * 20);

      var cores = tab.escalaLinha === 'ordinal'
        ? global.Tema.rampaDe(tab.linhas.length)
        : global.Tema.categorica(tab.linhas.length);
      var grade = css('--grade'), eixo = css('--eixo'), ink2 = css('--ink-2'), ink3 = css('--ink-3');

      for (var t = 0; t <= teto; t += teto / 4) {
        var y = margem.topo + plotH - (t / teto) * plotH;
        el('line', { x1: margem.esq, y1: y, x2: m.w - margem.dir, y2: y, stroke: grade, 'stroke-width': 1 }, svg);
        texto(svg, margem.esq - 8, y + 3.5, Math.round(t) + '%', { fill: ink3, 'font-size': 10, 'text-anchor': 'end', class: 'num' });
      }
      el('line', { x1: margem.esq, y1: margem.topo + plotH, x2: m.w - margem.dir, y2: margem.topo + plotH, stroke: eixo, 'stroke-width': 1 }, svg);

      var passoGrupo = plotW / tab.colunas.length;
      var largGrupo = Math.min(passoGrupo - 20, 140);
      var largBarra = Math.max(4, (largGrupo - FOLGA * (tab.linhas.length - 1)) / tab.linhas.length);

      tab.colunas.forEach(function (colCat, j) {
        var gx = margem.esq + j * passoGrupo + (passoGrupo - largGrupo) / 2;
        tab.linhas.forEach(function (linCat, i) {
          var cel = tab.celulas[i][j];
          var h = (cel.pct / teto) * plotH;
          var x = gx + i * (largBarra + FOLGA);
          var y = margem.topo + plotH - h;
          if (h > 0.5) {
            el('path', { d: caminhoBarra(x, y, largBarra, Math.max(h, 2), Math.min(RAIO, largBarra / 2), 'topo'), fill: cores[i % cores.length] }, svg);
          }
          alvo(svg, x - FOLGA / 2, margem.topo, largBarra + FOLGA, plotH,
            '<b>' + tab.rotulosLinha[i] + '</b><span>' + tab.tituloColuna + ': ' + tab.rotulosColuna[j] +
            '</span><span>' + cel.n + ' de ' + tab.totalCol[j] + ' · ' + global.Stats.fmtPct(cel.pct, 1) + ' da coluna</span>');
        });
        texto(svg, gx + largGrupo / 2, margem.topo + plotH + 16, truncar(tab.rotulosColuna[j], passoGrupo - 6, 10), { fill: ink2, 'font-size': 10, 'text-anchor': 'middle' });
        texto(svg, gx + largGrupo / 2, margem.topo + plotH + 30, 'n = ' + tab.totalCol[j], { fill: ink3, 'font-size': 9.5, 'text-anchor': 'middle', class: 'num' });
      });

      var colunasLeg = Math.max(1, Math.floor(m.w / 190));
      var largCol = m.w / colunasLeg;
      var baseY = alt - alturaLegenda + 10;
      tab.linhas.forEach(function (linCat, i) {
        var lx = 2 + (i % colunasLeg) * largCol;
        var ly = baseY + Math.floor(i / colunasLeg) * 20;
        el('rect', { x: lx, y: ly - 7, width: 9, height: 9, rx: 2, fill: cores[i % cores.length] }, svg);
        texto(svg, lx + 14, ly + 1, truncar(tab.rotulosLinha[i], largCol - 24, 10.5), { fill: ink2, 'font-size': 10.5 });
      });
    });
  }

  /** Mini barra de proporção usada nos cartões de indicador. */
  function faixa(container, pct, opts) {
    opts = opts || {};
    registrar(container, function () {
      var m = moldura(container, 6, opts.descricao);
      var raio = 3;
      el('rect', { x: 0, y: 0, width: m.w, height: 6, rx: raio, fill: css('--grade') }, m.svg);
      el('rect', { x: 0, y: 0, width: Math.max(raio * 2, (pct / 100) * m.w), height: 6, rx: raio, fill: opts.cor || css('--acento-marca') }, m.svg);
    });
  }

  global.Graficos = {
    barras: barras,
    colunas: colunas,
    rosca: rosca,
    empilhado100: empilhado100,
    agrupado: agrupado,
    faixa: faixa,
    redesenharTudo: redesenharTudo,
    esconderDica: esconderDica
  };
})(window);
