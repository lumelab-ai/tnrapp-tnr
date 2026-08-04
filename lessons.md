# Lições Aprendidas — TNR

## A verdade fundamental

**Não existe modo algum em que o preview do card aparece correto.**

O mockup (`plan/card-design.html`) é uma página HTML isolada: tem `<body>`,
fonte própria, background próprio, e é renderizada num navegador limpo, sem
nenhum CSS externo interferindo. Nada disso pode ser reproduzido dentro de uma
nota do Obsidian.

## Conceitos errados que devem ser abandonados

- **Copiar o HTML do mockup para a nota.** A nota não é renderizada num browser
  limpo. Ela é renderizada dentro do app, com o CSS do tema ativo aplicado por
  cima de tudo.
- **Copiar o CSS do mockup byte a byte.** Os valores são copiados, mas o CSS do
  Obsidian é aplicado junto e o resultado fica imprevisível.
- **Usar classes genéricas do mockup.** `.callout`, `.title`, `.meta`, `.poster`,
  `.info`, `.year`, `.tmdb`, `.logo` são nomes que o Obsidian já usa nos
  próprios seletores. O CSS do plugin e o do app brigam entre si.
- **Injetar HTML cru na nota.** HTML cru não renderiza como página:
  - Em Live Preview não renderiza (aparece como código-fonte ou nada).
  - Em modo leitura o Obsidian sanitiza o HTML: remove atributos, quebra a
    estrutura, e o layout flex/grid se perde.
- **Trocar nomes de classe e regenerar o build.** (`tnr-callout` → `.callout`
  → `.tnr-embed`) — cada tentativa repetiu o mesmo erro fundamental de
  premissa. Trocar classes não resolve nada.

## Por que os previews falham (diagnóstico)

1. O Obsidian não é um navegador comum: a nota é renderizada dentro do app com
   o CSS do tema por cima.
2. As classes do mockup colidem com seletores nativos do Obsidian.
3. HTML cru injetado é sanitizado e quebrado pelo renderizador.
4. Nenhuma variação de classe/escopo/CSS muda esse fato.

## O caminho correto (se um dia for retomado)

Não injetar HTML cru. O Obsidian precisa receber o card por um mecanismo que
ele mesmo renderiza:

- Callout real (`> [!tnr-movie]`), OU
- `MarkdownPostProcessor` / `CustomElement` que monta o DOM em runtime.

O CSS do plugin deve ser escopado numa classe única e testado de fato dentro
do app — nunca presumido.

## Regra de ouro

**Parar de insistir em HTML cru e copiar o mockup. Verificar dentro do Obsidian
antes de concluir qualquer tentativa.**
