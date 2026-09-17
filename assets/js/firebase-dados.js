/**
 * firebase-dados.js — origem dos dados do dashboard.
 *
 * A base local (dataset.js, exportada do Google Forms) é a fonte IMEDIATA: o
 * painel pinta com ela no primeiro quadro, sem esperar rede. Em paralelo, tenta
 * ler a coleção "respostas" do Firestore; se ela responder com documentos, o
 * painel troca a base e redesenha.
 *
 * A ordem importa. Esperar o Firestore antes de desenhar deixaria o visitante
 * olhando para uma tela vazia enquanto a rede decide — e, sem banco criado no
 * projeto, isso só termina no timeout. Assim não existe tela em branco em
 * nenhum cenário: sem rede, sem banco ou com o SDK bloqueado, o painel já está
 * completo na tela e o rodapé diz qual origem está valendo.
 */
(function (global) {
  'use strict';

  var CONFIG = {
    apiKey: 'AIzaSyCDUSVe5SISlT2Yha590FxUxswSAvis9fM',
    authDomain: 'dashboardvinicius-3a4d9.firebaseapp.com',
    projectId: 'dashboardvinicius-3a4d9',
    storageBucket: 'dashboardvinicius-3a4d9.firebasestorage.app',
    messagingSenderId: '540831517569',
    appId: '1:540831517569:web:87989d194dc831cb67b680',
    measurementId: 'G-6KYQTL01XN'
  };

  var COLECAO = 'respostas';
  var CAMPOS = ['id', 'ts', 'genero', 'faixa', 'cnh', 'veiculo', 'seguro', 'motivo',
    'transporte', 'freqTp', 'fator', 'tempo', 'acidente', 'gravidade', 'avaliacao'];

  var db = null;

  function iniciarSdk() {
    if (db) return db;
    if (!global.firebase || !global.firebase.initializeApp) return null;
    try {
      if (!global.firebase.apps.length) global.firebase.initializeApp(CONFIG);
      db = global.firebase.firestore();
      return db;
    } catch (e) {
      console.warn('[dados] Firestore indisponível:', e && e.message);
      return null;
    }
  }

  function normalizar(bruto, indice) {
    var r = { id: bruto.id || ('R' + String(indice + 1).padStart(3, '0')) };
    CAMPOS.forEach(function (c) {
      if (c === 'id') return;
      var v = bruto[c];
      r[c] = (v == null || v === '') ? global.NA_LABEL : String(v).trim();
    });
    return r;
  }

  var Dados = {
    origem: 'local',
    registros: [],

    /** Base local, disponível de imediato e sem rede. */
    baseLocal: function () {
      var local = (global.DATASET_LOCAL || []).map(normalizar);
      Dados.origem = 'local';
      Dados.registros = local;
      return { registros: local, origem: 'local', detalhe: 'dados embutidos na página' };
    },

    /**
     * Tenta o Firestore em segundo plano. Resolve com o conjunto de registros
     * quando a coleção responde com documentos, ou com null em qualquer outro
     * caso (sem SDK, sem banco, sem permissão, coleção vazia, tempo esgotado).
     * Nunca rejeita: quem chama só decide se troca a base ou não.
     */
    tentarFirestore: function () {
      var base = iniciarSdk();
      if (!base) return Promise.resolve(null);

      var tempoLimite = new Promise(function (_, rej) {
        setTimeout(function () { rej(new Error('tempo esgotado')); }, 4000);
      });

      return Promise.race([base.collection(COLECAO).get(), tempoLimite])
        .then(function (snap) {
          if (!snap || snap.empty) return null;
          var docs = [];
          snap.forEach(function (d) { docs.push(d.data()); });
          docs.sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
          var regs = docs.map(normalizar);
          Dados.origem = 'firestore';
          Dados.registros = regs;
          return { registros: regs, origem: 'firestore', detalhe: regs.length + ' documentos' };
        })
        .catch(function (e) {
          console.info('[dados] Firestore não usado:', (e && e.message) || 'falha na leitura');
          return null;
        });
    },

    /**
     * Envia a base local para o Firestore. Ação destrutiva por natureza
     * (sobrescreve documentos com o mesmo id), então só roda a partir de um
     * clique explícito e com confirmação — nunca automaticamente.
     */
    publicarBaseLocal: function () {
      var base = iniciarSdk();
      if (!base) return Promise.reject(new Error('Firestore indisponível nesta página.'));
      var local = (global.DATASET_LOCAL || []).map(normalizar);
      var lote = base.batch();
      local.forEach(function (r) {
        lote.set(base.collection(COLECAO).doc(r.id), r);
      });
      return lote.commit().then(function () { return local.length; });
    },

    colecao: COLECAO,
    projeto: CONFIG.projectId
  };

  global.Dados = Dados;
})(window);
