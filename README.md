# Mobilidade Urbana e Segurança no Trânsito — painel de resultados

Painel interativo dos resultados da pesquisa aplicada pela turma, construído para
o trabalho do 1º bimestre de Estatística (UNIBRASIL, prof. Eduardo Bolicenha Simm).

Site estático, sem build e sem dependências de runtime: abre com dois cliques em
`index.html` ou publicado no Firebase Hosting.

---

## O que o painel faz

- **8 indicadores** recalculados a cada mudança de filtro.
- **13 tabelas de frequência** no formato pedido no enunciado
  (`Respostas · Quantidades · Porcentagens · Total`, com a fonte indicada).
- **Cruzamentos entre variáveis** com porcentagem por coluna — cada coluna fecha
  100% —, acompanhados de qui-quadrado, graus de liberdade, p-valor e V de Cramér.
- **Construtor de cruzamentos**: qualquer questão contra qualquer outra, em barras
  100% empilhadas ou agrupadas.
- **Segmentadores** (gênero, faixa etária, habilitação, veículo, transporte,
  percepção de segurança) e **filtro cruzado por clique** em qualquer barra.
- **4 temas de cor** (azul, vermelho, verde, amarelo) × modo claro/escuro.
- **Exportação**: CSV de qualquer tabela, PNG de qualquer gráfico, base completa
  do recorte em CSV, e impressão/PDF com layout próprio.
- **Página "Relatório"** com introdução, objetivos, método, análise e conclusão,
  com os percentuais atualizados pelo recorte ativo — base para o texto no Word.

## Rodando

```bash
python -m http.server 8777
```

Depois abra `http://localhost:8777`. Também funciona abrindo `index.html`
diretamente (nesse caso o Firestore não responde e o painel usa a base local).

## Origem dos dados

O painel tenta ler a coleção `respostas` do Firestore
(`dashboardvinicius-3a4d9`). Se o Firestore não responder em 6 segundos, estiver
vazio ou bloqueado, ele cai para `assets/js/dataset.js` — a cópia local das
respostas exportadas do Google Forms. O rodapé sempre mostra qual origem está em
uso, então não existe tela em branco.

### Carregar a base no Firestore

No console do Firebase, crie o banco (Firestore Database → Criar banco de dados).
Depois:

```bash
npm install firebase-admin
node scripts/seed-firestore.mjs
```

O script pede `service-account.json` na raiz (Console → Configurações do projeto →
Contas de serviço → Gerar nova chave privada). Esse arquivo está no `.gitignore`;
**não versione a chave.**

Alternativa sem Node: o botão *Publicar base no Firestore* no rodapé do painel faz
a mesma carga pelo navegador — mas exige afrouxar temporariamente a regra de
escrita em `firestore.rules`.

### Regras de segurança

`firestore.rules` deixa a coleção `respostas` com leitura pública e escrita
bloqueada, que é o correto para um trabalho publicado: qualquer pessoa com o link
lê, ninguém altera pelo navegador.

```bash
firebase deploy --only firestore:rules
```

## Publicando

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only hosting
```

O `firebase.json` já aponta para o projeto `dashboardvinicius-3a4d9` e exclui
`dados/` e `scripts/` do que vai para o ar.

## Estrutura

```
index.html                     casca do painel e ordem de carga dos scripts
assets/css/dashboard.css       tokens de cor, layout, tabelas, impressão
assets/js/schema.js            dicionário das 13 questões (rótulos, ordem, escala)
assets/js/dataset.js           27 respostas — gerado a partir da planilha
assets/js/stats.js             frequências, cruzamentos, qui-quadrado, V de Cramér
assets/js/theme.js             4 temas × 2 modos, rampas validadas
assets/js/charts.js            gráficos em SVG (barras, colunas, rosca, empilhado)
assets/js/firebase-dados.js    leitura do Firestore com queda para a base local
assets/js/app.js               estado, filtros, páginas, exportações
scripts/seed-firestore.mjs     carga da base no Firestore
dados/                         planilha original e enunciado do professor
```

## Notas sobre as escolhas de cor

As rampas dos quatro temas foram geradas em OKLCH com passo de luminosidade
constante e conferidas com o validador de paleta do guia de visualização de
dados: luminosidade monotônica, ΔL ≥ 0,06 entre degraus e o degrau mais próximo
da superfície acima de 2:1 de contraste, nos modos claro e escuro.

A rampa do tema é usada apenas em variáveis **ordinais**, onde a intensidade da
cor acompanha a ordem da escala. Variáveis **nominais** usam uma paleta
categórica fixa de 8 posições, que não muda com o tema — o objetivo é que uma
categoria não troque de cor quando o usuário troca o tema.

## Sobre a amostra

A base tem **27 respostas**. O enunciado pede no mínimo 30 respondentes; vale
ampliar a coleta antes da entrega. Como a amostra é pequena, os testes
qui-quadrado dos cruzamentos aparecem com um selo de alerta sempre que mais de
20% das caselas ficam com frequência esperada menor que 5 — nesse caso o teste
perde validade formal e deve ser lido como indício, não como prova.
