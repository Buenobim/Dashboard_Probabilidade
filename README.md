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
- **Exportação**: CSV de qualquer tabela, PNG de qualquer gráfico, base completa
  do recorte em CSV, e impressão/PDF com layout próprio.
- **Página "Relatório"** com introdução, objetivos, método, análise e conclusão,
  com os percentuais atualizados pelo recorte ativo — base para o texto no Word.

## Os quatro links de apresentação

Um endereço por apresentador. O conteúdo é idêntico nos quatro; muda apenas a
cor, e o rodapé identifica qual versão está aberta.

| Apresentador | Link |
|---|---|
| Azul | https://pesquisa-mobilidade-urbana-2026.web.app/azul |
| Verde | https://pesquisa-mobilidade-urbana-2026.web.app/verde |
| Amarelo | https://pesquisa-mobilidade-urbana-2026.web.app/amarelo |
| Rosa | https://pesquisa-mobilidade-urbana-2026.web.app/rosa |

A raiz (`/`) abre na versão azul.

A cor vem do caminho da URL, lido em `theme.js`; as rotas são `rewrites` no
`firebase.json` que apontam todas para o mesmo `index.html`. **Um único deploy
atualiza os quatro links** — não existe cópia do painel por cor.

Abrindo o arquivo localmente, use `index.html?cor=verde`.

O painel é **sempre claro** e **não tem seletor de cor**: os quatro links devem
projetar exatamente a mesma coisa, e a preferência de tema do sistema
operacional de quem abrir não pode interferir.

## Rodando

```bash
python -m http.server 8777
```

Depois abra `http://localhost:8777`. Também funciona abrindo `index.html`
diretamente (nesse caso o Firestore não responde e o painel usa a base local).

## Origem dos dados

A fonte imediata é `assets/js/dataset.js`, a cópia local das respostas
exportadas do Google Forms: o painel pinta com ela no primeiro quadro, sem
esperar rede. **Em paralelo**, tenta ler a coleção `respostas` do Firestore
(`dashboardvinicius-3a4d9`); se ela responder com documentos em até 4 segundos,
o painel troca a base e redesenha.

A ordem importa. Esperar o Firestore antes de desenhar deixaria o visitante
olhando para uma tela vazia enquanto a rede decide — e, sem banco criado no
projeto, isso só terminaria no timeout. Assim não existe tela em branco em
cenário nenhum, e o rodapé sempre mostra qual origem está valendo.

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

Não há botão de carga na interface: estes são links de apresentação, e uma ação
de escrita no banco não tem o que fazer no rodapé de quem vai projetar.

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

O `firebase.json` exclui `dados/`, `scripts/` e o diretório `.git` do que vai
para o ar.

### Dois sites, um deploy

O ID do projeto no Firebase (`dashboardvinicius-3a4d9`) não pode ser alterado
depois de criado, mas o endereço de um *site* de Hosting é independente dele.
Por isso o projeto tem dois sites, e `firebase deploy --only hosting` publica
nos dois de uma vez:

| Site | Papel |
|---|---|
| `pesquisa-mobilidade-urbana-2026` | endereço oficial, usado nos links de apresentação |
| `dashboardvinicius-3a4d9` | endereço original, mantido apenas para links já compartilhados |

As duas configurações em `firebase.json` são propositalmente **idênticas** — o
endereço antigo não pode virar uma versão parada no tempo. Ao mexer em uma,
replique na outra.

Os arquivos `.js`, `.css` e `.html` vão com `Cache-Control: no-cache`. Eles não
têm hash no nome, então um `max-age` longo deixaria quem já visitou preso a uma
versão antiga depois de cada deploy. Com `no-cache` o navegador revalida e
recebe `304` pelo ETag quando nada mudou — o site inteiro tem poucos KB, então o
custo é próximo de zero e ninguém fica vendo uma versão velha.

## Estrutura

```
index.html                     casca do painel e ordem de carga dos scripts
assets/css/dashboard.css       tokens de cor, layout, tabelas, impressão
assets/js/schema.js            dicionário das 13 questões (rótulos, ordem, escala)
assets/js/dataset.js           27 respostas — gerado a partir da planilha
assets/js/stats.js             frequências, cruzamentos, qui-quadrado, V de Cramér
assets/js/theme.js             4 cores (via URL), rampas validadas, só modo claro
assets/js/charts.js            gráficos em SVG (barras, colunas, rosca, empilhado)
assets/js/firebase-dados.js    leitura do Firestore com queda para a base local
assets/js/app.js               estado, filtros, páginas, exportações
scripts/seed-firestore.mjs     carga da base no Firestore
dados/                         planilha original e enunciado do professor
```

## Notas sobre as escolhas de cor

As rampas das quatro cores foram geradas em OKLCH com passo de luminosidade
constante e conferidas com o validador de paleta do guia de visualização de
dados: luminosidade monotônica, ΔL ≥ 0,06 entre degraus e o degrau mais claro
acima de 2:1 de contraste sobre a superfície. Os degraus usados na interface
foram escolhidos por contraste medido: o degrau 2 (≥ 3,6:1) para marcas de
dados, o 3 (≥ 4,7:1) para botões com texto branco, o 4 (≥ 6,2:1) para texto.

A rampa é usada apenas em variáveis **ordinais**, onde a intensidade da cor
acompanha a ordem da escala. Variáveis **nominais** usam uma paleta categórica
fixa de 8 posições, igual nos quatro links — uma categoria não deve trocar de
cor de um apresentador para o outro.

## Nota sobre a medição dos gráficos

Os SVGs são desenhados na largura real do container, medida no momento do
desenho, e **nunca** numa largura de reserva. Isso não é detalhe: os cartões são
montados dentro de um `DocumentFragment`, onde `clientWidth` é `0`, e um valor
fixo de reserva produzia gráficos maiores que o cartão em telas mais estreitas —
a marca vazava para fora da borda.

A primeira pintura é disparada por `Graficos.redesenharTudo()`, chamado em
`renderizar()` logo depois que o conteúdo entra no documento. O `ResizeObserver`
cuida apenas das mudanças posteriores, porque ele não entrega callback enquanto
o documento não está sendo renderizado (aba em segundo plano, janela oculta) — e
o painel abriria sem gráfico nenhum se dependesse dele para desenhar.

Duas redes de segurança acompanham: `scrollbar-gutter: stable` no `html`, para
que a barra de rolagem não encolha o container depois da medição, e
`overflow: hidden` no cartão, para que nada atravesse a borda em hipótese
alguma.

## Sobre a amostra

A base tem **27 respostas**. O enunciado pede no mínimo 30 respondentes; vale
ampliar a coleta antes da entrega. Como a amostra é pequena, os testes
qui-quadrado dos cruzamentos aparecem com um selo de alerta sempre que mais de
20% das caselas ficam com frequência esperada menor que 5 — nesse caso o teste
perde validade formal e deve ser lido como indício, não como prova.
