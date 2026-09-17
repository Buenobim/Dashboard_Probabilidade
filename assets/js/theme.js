/**
 * theme.js — paleta do painel.
 *
 * São quatro cores (azul, verde, amarelo, rosa), sempre em modo claro. A cor
 * NÃO é escolhida pelo visitante: ela vem da URL, para que cada apresentador
 * tenha um endereço próprio e o painel abra sempre na mesma identidade.
 *
 *   /azul  /verde  /amarelo  /rosa        (links de apresentação)
 *   ?cor=verde                            (funciona abrindo o arquivo local)
 *
 * Sem correspondência, cai em azul.
 *
 * Cada cor traz uma rampa ordinal de 6 degraus, gerada em OKLCH com passo de
 * luminosidade constante e conferida no validador de paleta do guia de
 * visualização: luminosidade monotônica, ΔL ≥ 0,06 entre degraus e o degrau
 * mais claro acima de 2:1 de contraste sobre a superfície.
 *
 * A rampa é usada em variáveis ORDINAIS (faixa etária, tempo de trajeto,
 * percepção de segurança...), onde a intensidade acompanha a ordem da escala.
 * Variáveis NOMINAIS usam a paleta categórica fixa, que é a mesma nos quatro
 * links — uma categoria não deve mudar de cor de um apresentador para o outro.
 */
(function (global) {
  'use strict';

  var TEMAS = {
    azul: {
      nome: 'Azul',
      rampa: ['#68aaff', '#4895f5', '#3380df', '#1c6cc9', '#0059b3', '#004893'],
      vivido: '#4895f5'
    },
    verde: {
      nome: 'Verde',
      rampa: ['#5ac353', '#44ae3e', '#2c9a27', '#088607', '#007100', '#005c00'],
      vivido: '#44ae3e'
    },
    amarelo: {
      nome: 'Amarelo',
      rampa: ['#df9700', '#c58500', '#ac7400', '#946300', '#7c5200', '#654200'],
      vivido: '#f5b301'
    },
    rosa: {
      nome: 'Rosa',
      rampa: ['#ed7fa8', '#d76b95', '#c15881', '#ab456f', '#96315c', '#811c4b'],
      vivido: '#d76b95'
    }
  };

  /**
   * Paleta categórica de 8 posições, atribuída sempre na mesma ordem e nunca
   * reciclada. Validada para pares adjacentes (pior ΔE sob daltonismo 9,1;
   * pior ΔE em visão normal 19,6).
   */
  var CATEGORICA = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];

  var estado = { tema: 'azul' };

  /** Lê a cor do caminho da URL e, se não houver, do parâmetro ?cor=. */
  function temaDaUrl() {
    var doCaminho = (location.pathname || '').toLowerCase().split('/').filter(Boolean).pop();
    if (doCaminho && TEMAS[doCaminho]) return doCaminho;

    var busca = (location.search || '').match(/[?&]cor=([a-z]+)/i);
    if (busca && TEMAS[busca[1].toLowerCase()]) return busca[1].toLowerCase();

    return 'azul';
  }

  function aplicar() {
    var t = TEMAS[estado.tema];
    var raiz = document.documentElement;

    raiz.setAttribute('data-tema', estado.tema);

    t.rampa.forEach(function (hex, i) {
      raiz.style.setProperty('--rampa-' + i, hex);
    });

    // Tokens de interface derivados da rampa. Os degraus foram escolhidos pelo
    // contraste medido sobre a superfície branca: [2] ≥ 3,6:1 para marcas de
    // dados, [3] ≥ 4,7:1 com texto branco por cima, [4] ≥ 6,2:1 para texto.
    raiz.style.setProperty('--acento-marca', t.rampa[2]);
    raiz.style.setProperty('--acento-solido', t.rampa[3]);
    raiz.style.setProperty('--acento-solido-texto', '#ffffff');
    raiz.style.setProperty('--acento-texto', t.rampa[4]);
    raiz.style.setProperty('--acento-vivo', t.vivido);
  }

  var Tema = {
    temas: TEMAS,
    estado: estado,

    iniciar: function () {
      estado.tema = temaDaUrl();
      aplicar();
    },

    nome: function () {
      return TEMAS[estado.tema].nome;
    },

    /** Rampa ordinal completa. */
    rampa: function () {
      return TEMAS[estado.tema].rampa.slice();
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
      return CATEGORICA.slice(0, Math.min(n, CATEGORICA.length));
    },

    /** Cor única para série simples (uma cor por gráfico, não por barra). */
    marca: function () {
      return TEMAS[estado.tema].rampa[2];
    }
  };

  global.Tema = Tema;
})(window);
