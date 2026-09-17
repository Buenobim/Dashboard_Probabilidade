/**
 * theme.js — paletas e alternância de tema.
 *
 * São quatro temas (azul, vermelho, verde, amarelo) × dois modos (claro/escuro).
 * Cada tema traz uma rampa ordinal de 6 degraus, gerada em OKLCH com passo de
 * luminosidade constante e validada com o validador de paleta do guia de
 * visualização: luminosidade monotônica, ΔL ≥ 0,06 entre degraus e o degrau mais
 * próximo da superfície acima de 2:1 de contraste — nos dois modos.
 *
 * A rampa do tema é usada em variáveis ORDINAIS (faixa etária, tempo de trajeto,
 * percepção de segurança...), onde a cor acompanha a ordem natural da escala.
 * Variáveis NOMINAIS usam a paleta categórica fixa abaixo, que não muda com o
 * tema — trocar a cor de uma categoria a cada tema confundiria a leitura.
 */
(function (global) {
  'use strict';

  var TEMAS = {
    azul: {
      nome: 'Azul',
      amostra: '#2a78d6',
      light: { rampa: ['#68aaff', '#4895f5', '#3380df', '#1c6cc9', '#0059b3', '#004893'], vivido: '#4895f5' },
      dark: { rampa: ['#9dc7ff', '#75b1ff', '#4e9afb', '#3885e4', '#2070cd', '#005bb6'], vivido: '#9dc7ff' }
    },
    vermelho: {
      nome: 'Vermelho',
      amostra: '#dc4242',
      light: { rampa: ['#ff7871', '#f35855', '#dc4242', '#c5292f', '#ae031b', '#900013'], vivido: '#f35855' },
      dark: { rampa: ['#ffaaa3', '#ff857e', '#f95e5a', '#e14746', '#c82d32', '#b0081d'], vivido: '#ffaaa3' }
    },
    verde: {
      nome: 'Verde',
      amostra: '#2c9a27',
      light: { rampa: ['#5ac353', '#44ae3e', '#2c9a27', '#088607', '#007100', '#005c00'], vivido: '#44ae3e' },
      dark: { rampa: ['#77e170', '#61ca5a', '#4ab444', '#319e2d', '#11890e', '#007300'], vivido: '#77e170' }
    },
    amarelo: {
      nome: 'Amarelo',
      amostra: '#f5b301',
      light: { rampa: ['#df9700', '#c58500', '#ac7400', '#946300', '#7c5200', '#654200'], vivido: '#f5b301' },
      dark: { rampa: ['#ffb333', '#e89d00', '#cd8a00', '#b27800', '#986500', '#7e5400'], vivido: '#ffc233' }
    }
  };

  /**
   * Paleta categórica de 8 posições, atribuída sempre na mesma ordem e nunca
   * reciclada. Validada para pares adjacentes nos dois modos (pior ΔE CVD 9,1
   * claro / 8,4 escuro; pior ΔE visão normal 19,6 / 19,3).
   */
  var CATEGORICA = {
    light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
    dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
  };

  var estado = { tema: 'azul', modo: 'light' };
  var ouvintes = [];

  function preferenciaDoSistema() {
    return global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function ler(chave, padrao) {
    try { return localStorage.getItem(chave) || padrao; } catch (e) { return padrao; }
  }
  function gravar(chave, valor) {
    try { localStorage.setItem(chave, valor); } catch (e) { /* modo privado: segue sem persistir */ }
  }

  function aplicar() {
    var t = TEMAS[estado.tema] || TEMAS.azul;
    var m = t[estado.modo];
    var raiz = document.documentElement;

    raiz.setAttribute('data-tema', estado.tema);
    raiz.setAttribute('data-modo', estado.modo);

    m.rampa.forEach(function (hex, i) {
      raiz.style.setProperty('--rampa-' + i, hex);
    });
    // Tokens de interface derivados da rampa: preenchimento de marca, fundo de
    // botão (texto em contraste garantido) e cor de texto sobre a superfície.
    if (estado.modo === 'light') {
      raiz.style.setProperty('--acento-marca', m.rampa[2]);
      raiz.style.setProperty('--acento-solido', m.rampa[3]);
      raiz.style.setProperty('--acento-solido-texto', '#ffffff');
      raiz.style.setProperty('--acento-texto', m.rampa[4]);
    } else {
      raiz.style.setProperty('--acento-marca', m.rampa[2]);
      raiz.style.setProperty('--acento-solido', m.rampa[2]);
      raiz.style.setProperty('--acento-solido-texto', '#0c0d0f');
      raiz.style.setProperty('--acento-texto', m.rampa[1]);
    }
    raiz.style.setProperty('--acento-vivo', m.vivido);

    ouvintes.forEach(function (fn) { fn(estado); });
  }

  var Tema = {
    temas: TEMAS,
    estado: estado,

    iniciar: function () {
      estado.tema = ler('dash.tema', 'azul');
      if (!TEMAS[estado.tema]) estado.tema = 'azul';
      estado.modo = ler('dash.modo', preferenciaDoSistema());
      if (estado.modo !== 'dark') estado.modo = 'light';
      aplicar();
    },

    definirTema: function (nome) {
      if (!TEMAS[nome]) return;
      estado.tema = nome;
      gravar('dash.tema', nome);
      aplicar();
    },

    alternarModo: function () {
      estado.modo = estado.modo === 'dark' ? 'light' : 'dark';
      gravar('dash.modo', estado.modo);
      aplicar();
    },

    /** Rampa ordinal do tema no modo atual. */
    rampa: function () {
      return TEMAS[estado.tema][estado.modo].rampa.slice();
    },

    /**
     * n cores para uma escala ORDINAL de n categorias: amostra a rampa de 6
     * degraus mantendo as pontas, para que a primeira e a última categoria
     * fiquem sempre nos extremos de luminosidade.
     */
    rampaDe: function (n) {
      var r = this.rampa();
      if (n <= 1) return [r[3]];
      if (n >= r.length) return r.slice(0, n);
      var out = [];
      for (var i = 0; i < n; i++) {
        out.push(r[Math.round((i * (r.length - 1)) / (n - 1))]);
      }
      return out;
    },

    /** n cores categóricas, sempre na mesma ordem de posições. */
    categorica: function (n) {
      var p = CATEGORICA[estado.modo];
      return p.slice(0, Math.min(n, p.length));
    },

    /** Cor única para série simples (uma cor por gráfico, não por barra). */
    marca: function () {
      return TEMAS[estado.tema][estado.modo].rampa[2];
    },

    aoMudar: function (fn) { ouvintes.push(fn); }
  };

  global.Tema = Tema;
})(window);
