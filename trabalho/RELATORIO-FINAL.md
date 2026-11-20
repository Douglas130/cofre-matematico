# Relatório final — Cofre Matemático

**Entregável:** `C:\Projetos\index.html` — arquivo único, autocontido, 100% offline.
**Tamanho final:** 62.055 bytes (60,6 KiB) · 1.207 linhas.
**Data:** 2026-11-20

---

## 1. Auditoria lógica e matemática (6.000 módulos)

Script: `trabalho/auditoria.mjs` · dados brutos: `trabalho/auditoria.json`.
O script extrai o núcleo procedural diretamente do `index.html` (marcadores `==GEN_START==` / `==GEN_END==`), portanto testa exatamente o código que roda no navegador — sem duplicação de fonte.

| Verificação | Instâncias | Resultado |
|---|---:|---|
| Módulos gerados (3 níveis × 4 tipos × 500) | 6.000 / 6.000 | OK |
| Resposta inteira exata e não negativa | 4.500 | OK |
| Unicidade da resposta | 6.000 | OK |
| Limites estritos de cada nível (`validate`) | 6.000 | OK |
| Reprodutibilidade da semente | 6.000 | OK |
| Seleção com exatamente uma opção satisfazente | 1.500 | OK |
| **Falhas** | **0** | **APROVADO** |

Critério de unicidade das sequências: para os 4 termos exibidos são testadas todas as regras candidatas (progressão aritmética, geométrica, alternada, soma dos anteriores e 2ª diferença). A geração só é aceita quando todas as regras compatíveis com os 4 termos preveem o mesmo 5º termo inteiro.

## 2. Teste funcional automatizado (Playwright + Chrome local, offline)

Script: `trabalho/teste-funcional.mjs` · log: `trabalho/teste-funcional.log`.

- Abertura de `file:///.../index.html` com contexto offline: OK.
- Partida avançada (6 módulos, os 4 tipos presentes) iniciada com semente fixa: OK.
- Cronômetro entra em estado crítico nos últimos 15 s: OK.
- Todos os 6 módulos resolvidos pela UI real (teclado numérico + clique nos terminais): OK.
- Transição para a tela de vitória: OK.
- Nova partida, 3 erros intencionais, transição para a tela de derrota: OK.
- "Repetir mesma semente" reproduz a mesma seed: OK.
- Nenhum erro de console ou exceção de página: OK.
- **Resultado: APROVADO.**

## 3. Revisão do crítico visual

Crítico independente, novo a cada rodada, com acesso **exclusivo** às 5 capturas PNG (1440×900), sem ler código nem explicações. Capturas em `trabalho/capturas/`.

| Rodada | Grave | Médio | Menor | Veredito |
|---|---:|---:|---:|---|
| 1 | 0 | 2 | 7 | REPROVADO — LEDs de falhas com contraste baixíssimo; terminais A–D vs. dica "tecla 1–4" |
| 2 | 0 | 1 | 4 | REPROVADO — hífen longo em `0–9` lido como `6-9` nas dicas |
| 3 | 0 | 0 | 1 | **APROVADO** — único apontamento: enunciado duplicado no módulo de seleção |

Correções aplicadas entre rodadas: LEDs de falhas com contagem numérica `0/3`, terminais numerados 1–4, teclado numérico em layout padrão 3×4, sequências em uma única linha, marcadores de progresso visíveis, reforço da identidade metálica (rebites, textura), contraste ampliado de textos auxiliares, selo de ALERTA no cabeçalho, pontuação vermelha na derrota, fundo das modais escurecido, estado selecionado com preenchimento e barra lateral, e remoção do enunciado duplicado.

**Revisão final do crítico (rodada 3, verbatim resumido):** identidade de cofre/painel forte e constante; visores e cronômetro legíveis em todos os estados; módulo ativo sempre bem marcado; sinalização de atalhos coerente com os controles; nenhuma sobreposição, corte ou botão inacessível. Grave: 0. Médio: 0. Menor: 1 (corrigido após a revisão). **Veredito: APROVADO.**

---

## Pronto quando

- [x] Auditoria dos 6.000 módulos sem falhas
- [x] Teste funcional de vitória e derrota aprovado
- [x] Crítico visual sem defeitos graves ou médios
- [x] `index.html` único, autocontido e offline
