/**
 * firebase-dados.js — origem dos dados do dashboard.
 *
 * Ordem de tentativa:
 *   1. Firestore (coleção "respostas") — quando o SDK carrega e a coleção tem
 *      documentos, esta é a fonte viva: publicar uma resposta nova no Firestore
 *      já aparece no dashboard no próximo carregamento, sem tocar no código.
 *   2. dataset.js — cópia local das 27 respostas exportadas do Google Forms.
 *      É o que faz o arquivo abrir com dois cliques, offline, sem servidor.
 *
 * Nunca há tela em branco: qualquer falha do Firestore cai no local e o rodapé
 * mostra de onde os dados vieram.
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

    /** Promessa com o conjunto de registros e a origem efetivamente usada. */
    carregar: function () {
      var local = (global.DATASET_LOCAL || []).map(normalizar);
      var base = iniciarSdk();

      if (!base) {
        Dados.origem = 'local';
        Dados.registros = local;
        return Promise.resolve({ registros: local, origem: 'local', detalhe: 'SDK do Firebase não carregou' });
      }

      var tempoLimite = new Promise(function (_, rej) {
        setTimeout(function () { rej(new Error('tempo esgotado')); }, 6000);
      });

      return Promise.race([base.collection(COLECAO).get(), tempoLimite])
        .then(function (snap) {
          if (!snap || snap.empty) throw new Error('coleção vazia');
          var docs = [];
          snap.forEach(function (d) { docs.push(d.data()); });
          docs.sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
          var regs = docs.map(normalizar);
          Dados.origem = 'firestore';
          Dados.registros = regs;
          return { registros: regs, origem: 'firestore', detalhe: regs.length + ' documentos' };
        })
        .catch(function (e) {
          Dados.origem = 'local';
          Dados.registros = local;
          return { registros: local, origem: 'local', detalhe: (e && e.message) || 'falha na leitura' };
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
