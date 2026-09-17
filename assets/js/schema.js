/**
 * schema.js — dicionário das variáveis da pesquisa.
 *
 * Cada questão declara:
 *   key      chave do registro em dataset.js
 *   num      número da questão no formulário aplicado
 *   titulo   enunciado completo (usado nos títulos de tabela, conforme as normas)
 *   curto    rótulo curto (eixos, slicers, cabeçalhos de cruzamento)
 *   escala   'ordinal' → categorias têm ordem natural (usa rampa de cor do tema)
 *            'nominal' → categorias sem ordem (usa paleta categórica fixa)
 *   ordem    ordem canônica das categorias; o que não estiver aqui vai para o fim
 *   bloco    agrupamento temático usado na navegação
 *   naoAplica  categoria que representa ausência de resposta válida
 */
window.NA_LABEL = 'Não se aplica (não possui veículo)';

window.SCHEMA = [
  {
    key: 'genero', num: 1, bloco: 'perfil', escala: 'nominal',
    titulo: 'Como você se identifica em relação ao gênero?',
    curto: 'Gênero',
    ordem: ['Feminino', 'Masculino']
  },
  {
    key: 'faixa', num: 2, bloco: 'perfil', escala: 'ordinal',
    titulo: 'Qual é a sua faixa etária?',
    curto: 'Faixa etária',
    ordem: ['Até 17 anos', 'De 18 a 29 anos', 'De 30 a 39 anos', '40 a 49 anos', '50 anos ou mais'],
    apelidos: { 'Até 17 anos': '≤ 17', 'De 18 a 29 anos': '18–29', 'De 30 a 39 anos': '30–39', '40 a 49 anos': '40–49', '50 anos ou mais': '50+' }
  },
  {
    key: 'cnh', num: 3, bloco: 'perfil', escala: 'nominal',
    titulo: 'Você possui CNH (Carteira Nacional de Habilitação) válida?',
    curto: 'Habilitação',
    ordem: ['Sim, apenas para carros (Categoria B)', 'Sim, para carros e motos (Categorias A e B)', 'Não possuo CNH'],
    apelidos: { 'Sim, apenas para carros (Categoria B)': 'Categoria B', 'Sim, para carros e motos (Categorias A e B)': 'Categorias A e B', 'Não possuo CNH': 'Sem CNH' }
  },
  {
    key: 'veiculo', num: 4, bloco: 'perfil', escala: 'nominal',
    titulo: 'Você possui algum veículo próprio em sua residência?',
    curto: 'Veículo na residência',
    ordem: ['Sim, apenas carro', 'Sim, carro e moto', 'Não possuo veículo'],
    apelidos: { 'Sim, apenas carro': 'Apenas carro', 'Sim, carro e moto': 'Carro e moto', 'Não possuo veículo': 'Sem veículo' }
  },
  {
    key: 'seguro', num: 5, bloco: 'protecao', escala: 'nominal',
    titulo: 'Seu veículo principal possui seguro particular contra acidentes/roubo?',
    curto: 'Cobertura do veículo',
    naoAplica: window.NA_LABEL,
    ordem: [
      'Sim, seguro total (cobertura completa)',
      'Sim, apenas seguro contra terceiros ou roubo/furto',
      'Não possui seguro, mas possui proteção veicular (associação/cooperativa)',
      'Não possui nenhum tipo de seguro ou proteção',
      window.NA_LABEL
    ],
    apelidos: {
      'Sim, seguro total (cobertura completa)': 'Seguro total',
      'Sim, apenas seguro contra terceiros ou roubo/furto': 'Terceiros / roubo',
      'Não possui seguro, mas possui proteção veicular (associação/cooperativa)': 'Proteção veicular',
      'Não possui nenhum tipo de seguro ou proteção': 'Sem proteção',
      [window.NA_LABEL]: 'Não se aplica'
    }
  },
  {
    key: 'motivo', num: 6, bloco: 'protecao', escala: 'nominal',
    titulo: 'Qual é o motivo principal para a contratação ou não de seguro/proteção veicular?',
    curto: 'Motivo da decisão',
    naoAplica: window.NA_LABEL,
    ordem: ['Segurança e tranquilidade no dia a dia', 'Acho os custos de seguro muito altos', window.NA_LABEL],
    apelidos: {
      'Segurança e tranquilidade no dia a dia': 'Segurança e tranquilidade',
      'Acho os custos de seguro muito altos': 'Custo muito alto',
      [window.NA_LABEL]: 'Não se aplica'
    }
  },
  {
    key: 'transporte', num: 7, bloco: 'mobilidade', escala: 'nominal',
    titulo: 'Qual é o seu principal meio de transporte para os deslocamentos do dia a dia (trabalho/estudo)?',
    curto: 'Meio de transporte',
    ordem: [
      'Carro próprio',
      'Transporte público (ônibus, metrô, trem)',
      'Transporte por aplicativo (Uber, 99, etc.) / Táxi',
      'Deslocamento a pé'
    ],
    apelidos: {
      'Carro próprio': 'Carro próprio',
      'Transporte público (ônibus, metrô, trem)': 'Transporte público',
      'Transporte por aplicativo (Uber, 99, etc.) / Táxi': 'Aplicativo / táxi',
      'Deslocamento a pé': 'A pé'
    }
  },
  {
    key: 'freqTp', num: 8, bloco: 'mobilidade', escala: 'ordinal',
    titulo: 'Com que frequência você utiliza o transporte público?',
    curto: 'Uso do transporte público',
    ordem: ['Nunca utilizo', 'Raramente', 'Algumas vezes por semana', 'Todos os dias da semana'],
    apelidos: { 'Algumas vezes por semana': 'Algumas vezes/semana', 'Todos os dias da semana': 'Todos os dias' }
  },
  {
    key: 'fator', num: 9, bloco: 'mobilidade', escala: 'nominal',
    titulo: 'Qual é o fator principal que faz você escolher seu meio de transporte atual?',
    curto: 'Fator de escolha',
    ordem: ['Conforto e praticidade', 'Economia (custo mais baixo)', 'Rapidez (chegar mais rápido ao destino)', 'Segurança'],
    apelidos: {
      'Economia (custo mais baixo)': 'Economia',
      'Rapidez (chegar mais rápido ao destino)': 'Rapidez'
    }
  },
  {
    key: 'tempo', num: 10, bloco: 'mobilidade', escala: 'ordinal',
    titulo: 'Em média, quanto tempo você gasta no seu trajeto diário de ida ao trabalho/estudo?',
    curto: 'Tempo de trajeto',
    ordem: ['Menos de 15 minutos', 'Entre 15 e 30 minutos', 'Entre 31 e 60 minutos', 'Entre 1 e 2 horas', 'Mais de 2 horas'],
    apelidos: { 'Menos de 15 minutos': '< 15 min', 'Entre 15 e 30 minutos': '15–30 min', 'Entre 31 e 60 minutos': '31–60 min', 'Entre 1 e 2 horas': '1–2 h', 'Mais de 2 horas': '> 2 h' },
    // ponto médio em minutos — usado apenas para o indicador de tempo médio estimado
    pontoMedio: { 'Menos de 15 minutos': 7.5, 'Entre 15 e 30 minutos': 22.5, 'Entre 31 e 60 minutos': 45.5, 'Entre 1 e 2 horas': 90, 'Mais de 2 horas': 150 }
  },
  {
    key: 'acidente', num: 11, bloco: 'seguranca', escala: 'nominal',
    titulo: 'Você já se envolveu em algum acidente de trânsito (como motorista, passageiro ou pedestre)?',
    curto: 'Histórico de acidente',
    ordem: ['Não, nunca me envolvi em acidentes de trânsito', 'Sim, há mais de 1 ano', 'Sim, nos últimos 12 meses'],
    apelidos: {
      'Não, nunca me envolvi em acidentes de trânsito': 'Nunca se envolveu',
      'Sim, há mais de 1 ano': 'Sim, há mais de 1 ano',
      'Sim, nos últimos 12 meses': 'Sim, últimos 12 meses'
    }
  },
  {
    key: 'gravidade', num: 12, bloco: 'seguranca', escala: 'ordinal',
    titulo: 'Caso já tenha se envolvido em um acidente de trânsito, qual foi a gravidade do evento mais marcante?',
    curto: 'Gravidade do acidente',
    ordem: [
      'Nunca me envolvi em acidentes',
      'Apenas danos materiais leves',
      'Danos materiais significativos (sem feridos)',
      'Acidente com ferimentos leves',
      'Acidente com ferimentos graves'
    ],
    apelidos: {
      'Nunca me envolvi em acidentes': 'Nenhum acidente',
      'Apenas danos materiais leves': 'Danos leves',
      'Danos materiais significativos (sem feridos)': 'Danos significativos',
      'Acidente com ferimentos leves': 'Ferimentos leves',
      'Acidente com ferimentos graves': 'Ferimentos graves'
    }
  },
  {
    key: 'avaliacao', num: 13, bloco: 'seguranca', escala: 'ordinal',
    titulo: 'Como você avalia a segurança do trânsito na região onde você mais circula?',
    curto: 'Percepção de segurança',
    ordem: ['Insegura', 'Neutro / Regular', 'Segura'],
    apelidos: { 'Neutro / Regular': 'Neutro' }
  }
];

window.BLOCOS = {
  perfil: 'Perfil do respondente',
  protecao: 'Proteção veicular',
  mobilidade: 'Mobilidade',
  seguranca: 'Segurança no trânsito'
};

/** Acesso rápido por chave. */
window.Q = window.SCHEMA.reduce(function (acc, q) { acc[q.key] = q; return acc; }, {});

/** Rótulo curto de uma categoria (cai no texto completo quando não há apelido). */
window.rotulo = function (key, categoria) {
  var q = window.Q[key];
  return (q && q.apelidos && q.apelidos[categoria]) || categoria;
};
