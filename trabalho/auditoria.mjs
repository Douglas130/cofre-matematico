/**
 * Auditoria lógica e matemática do Cofre Matemático.
 * Extrai o núcleo procedural diretamente do index.html (entre os marcadores)
 * para garantir que testa exatamente o código que roda no navegador.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const OUT = path.join(ROOT, 'trabalho', 'auditoria.json');

const src = fs.readFileSync(INDEX, 'utf8');
const m = src.match(/\/\* ==GEN_START== \*\/([\s\S]*?)\/\* ==GEN_END== \*\//);
if (!m) throw new Error('Marcadores do gerador não encontrados no index.html');

const sandbox = { console, Math, Number, Object, String, Error };
vm.createContext(sandbox);
vm.runInContext(m[1] + '\n;globalThis.__GEN = CofreGen;', sandbox, { timeout: 10000 });
const G = sandbox.__GEN;

const LEVELS = ['iniciante', 'intermediario', 'avancado'];
const TYPES = ['operacao', 'termo', 'sequencia', 'selecao'];
const PER = 500;

const report = {
  data: new Date().toISOString(),
  arquivo: 'index.html',
  totalEsperado: LEVELS.length * TYPES.length * PER,
  totalTestado: 0,
  porNivel: {},
  porTipo: {},
  porNivelTipo: {},
  verificacoes: {
    respostaInteiraExata: 0,
    unicidade: 0,
    limitesRespeitados: 0,
    reprodutibilidade: 0,
    selecaoUnica: 0
  },
  falhas: [],
  amostras: {}
};

function check(cond, msg, ctx) {
  if (!cond) report.falhas.push({ ...ctx, mensagem: msg });
}

for (const level of LEVELS) {
  report.porNivel[level] = 0;
  for (const type of TYPES) {
    const key = level + '/' + type;
    report.porNivelTipo[key] = { gerados: 0, tiposQuestao: {} };
    for (let i = 0; i < PER; i++) {
      const seed = `auditoria|${level}|${type}|${i}`;
      const rng = G.rngFrom(seed);
      let mod;
      try {
        mod = G.generate(type, level, rng);
      } catch (e) {
        check(false, 'exceção na geração: ' + e.message, { level, type, seed });
        continue;
      }
      if (!report.amostras[key]) report.amostras[key] = JSON.parse(JSON.stringify(mod));

      report.totalTestado++;
      report.porNivel[level]++;
      report.porTipo[type] = (report.porTipo[type] || 0) + 1;
      report.porNivelTipo[key].gerados++;

      // 1. resposta inteira exata (módulos numéricos)
      if (type === 'operacao' || type === 'termo' || type === 'sequencia') {
        check(Number.isInteger(mod.answer) && mod.answer >= 0, 'resposta não inteira/não negativa', { level, type, seed });
        report.verificacoes.respostaInteiraExata++;
      }

      // 2. unicidade
      if (type === 'selecao') {
        const c = G.countSatisfying(mod);
        check(c === 1, `seleção com ${c} opções satisfazentes`, { level, type, seed });
        check(mod.answerIndex >= 0 && G.isSatisfying(mod, mod.answerIndex), 'answerIndex não satisfaz', { level, type, seed });
        report.verificacoes.selecaoUnica++;
        report.verificacoes.unicidade++;
        if (mod.ruleKey) report.porNivelTipo[key].tiposQuestao[mod.ruleKey] = (report.porNivelTipo[key].tiposQuestao[mod.ruleKey] || 0) + 1;
      } else if (type === 'sequencia') {
        const p = G.uniquePredictions(mod.terms);
        check(p.length === 1, `sequência ambígua: previsões [${p}]`, { level, type, seed, terms: mod.terms });
        check(p.length === 1 && p[0] === mod.answer, `sequência divergente: ${p} vs ${mod.answer}`, { level, type, seed });
        report.verificacoes.unicidade++;
        if (mod.ruleKey) report.porNivelTipo[key].tiposQuestao[mod.ruleKey] = (report.porNivelTipo[key].tiposQuestao[mod.ruleKey] || 0) + 1;
      } else {
        report.verificacoes.unicidade++;
        if (type === 'operacao' && mod.display) {
          const op = mod.display.includes('(') ? 'composta' : (mod.display.match(/[+\u2212\u00d7\u00f7]/) || ['?'])[0];
          report.porNivelTipo[key].tiposQuestao[op] = (report.porNivelTipo[key].tiposQuestao[op] || 0) + 1;
        }
      }

      // 3. limites do nível + validação completa do próprio gerador
      const problems = G.validate(mod, level);
      check(problems.length === 0, 'validação: ' + problems.join(' | '), { level, type, seed });
      report.verificacoes.limitesRespeitados++;

      // 4. reprodutibilidade da semente
      const again = G.generate(type, level, G.rngFrom(seed));
      check(JSON.stringify(again) === JSON.stringify(mod), 'geração não reprodutível', { level, type, seed });
      report.verificacoes.reprodutibilidade++;
    }
  }
}

const ok = report.falhas.length === 0 && report.totalTestado === report.totalEsperado;
report.resultado = ok ? 'APROVADO' : 'REPROVADO';
fs.writeFileSync(OUT, JSON.stringify(report, null, 2), 'utf8');

console.log(`Total testado: ${report.totalTestado}/${report.totalEsperado}`);
console.log(`Falhas: ${report.falhas.length}`);
for (const [k, v] of Object.entries(report.verificacoes)) console.log(`  ${k}: ${v}`);
if (!ok) {
  console.log('Primeiras falhas:');
  report.falhas.slice(0, 25).forEach(f => console.log(' -', JSON.stringify(f)));
}
console.log('Resultado:', report.resultado);
console.log('Relatório:', OUT);
process.exit(ok ? 0 : 1);
