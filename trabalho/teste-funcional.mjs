/**
 * Teste funcional automatizado (Playwright + Chrome local, sem rede).
 * - Abre index.html offline, inicia partida, resolve todos os módulos via UI real
 *   (teclado para numéricos, clique nos terminais para seleção) e valida vitória.
 * - Inicia outra partida, força 3 erros intencionais e valida derrota.
 * - Gera as 5 capturas 1440x900 usadas pelo crítico visual.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAP = path.join(ROOT, 'trabalho', 'capturas');
fs.mkdirSync(CAP, { recursive: true });

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = pathToFileURL(path.join(ROOT, 'index.html')).href;

const log = [];
const assert = (cond, msg) => {
  log.push((cond ? 'PASS  ' : 'FALHA ') + msg);
  if (!cond) throw new Error(msg);
};
const state = page => page.evaluate(() => window.CofreDebug.state());
const shot = (page, name) => page.screenshot({ path: path.join(CAP, name), animations: 'disabled' });

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1']
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await context.setOffline(true);
const page = await context.newPage();

const consoleErrors = [];
page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push('console: ' + msg.text()); });

try {
  await page.goto(URL, { waitUntil: 'load' });
  assert(await page.locator('[data-testid="setup"]').isVisible(), 'tela inicial visível');
  await shot(page, '01-inicial.png');

  // Partida principal: avançado (6 módulos mistos), semente fixa.
  await page.locator('[data-level="avancado"]').click();
  await page.locator('[data-mode="clock"]').click();
  await page.locator('[data-testid="seed"]').fill('VISUAL-2026');
  await page.locator('[data-testid="start"]').click();
  await page.waitForFunction(() => window.CofreDebug.state().running);
  let s = await state(page);
  assert(s.modules.length === 6, 'avançado gera 6 módulos');
  assert(new Set(s.modules.map(m => m.type)).size === 4, 'os 4 tipos de módulo estão presentes');
  assert(s.summaryVisible === false, 'resumo oculto durante a partida');
  await page.waitForTimeout(120);
  await shot(page, '02-partida.png');

  // Estado de alerta (últimos 15 s) — injetado apenas para a captura visual.
  await page.evaluate(() => window.CofreDebug.setTime(11.4));
  await page.waitForTimeout(160);
  assert(await page.locator('[data-testid="timer"]').evaluate(el => el.classList.contains('critical')), 'cronômetro entra em estado crítico');
  await shot(page, '03-alerta.png');
  await page.evaluate(() => window.CofreDebug.setTime(75));

  // Resolve todos os módulos pela interface real.
  for (let guard = 0; guard < 40; guard++) {
    s = await state(page);
    if (s.solved === s.modules.length || !s.running) break;
    const m = s.modules.find(x => !x.solved);
    assert(!!m, 'existe módulo não resolvido');
    if (m.type === 'selecao') {
      await page.locator(`[data-testid="module-${m.index}-opt-${m.answerIndex}"]`).click();
    } else {
      await page.evaluate(i => window.CofreDebug.focus(i), m.index);
      const digits = String(m.answer);
      for (const d of digits) await page.keyboard.press(d);
      await page.keyboard.press('Enter');
    }
    const after = await state(page);
    assert(after.modules[m.index].solved, `módulo ${m.index} (${m.type}) resolvido pela UI`);
  }
  s = await state(page);
  assert(s.solved === 6, 'todos os 6 módulos desarmados');
  await page.waitForSelector('[data-testid="summary"]:not(.hidden)', { timeout: 5000 });
  await page.waitForTimeout(1100); // deixa a animação da porta terminar
  s = await state(page);
  assert(s.summaryTitle.includes('COFRE DESARMADO'), 'tela de vitória exibida');
  assert(s.summaryVisible, 'resumo visível após vitória');
  await shot(page, '04-vitoria.png');

  // Nova partida: força 3 erros para chegar à derrota.
  await page.locator('[data-testid="again-new"]').click();
  await page.waitForFunction(() => window.CofreDebug.state().running);
  s = await state(page);
  const alvo = s.modules.find(m => m.type !== 'selecao');
  assert(!!alvo, 'há módulo numérico para forçar erro');
  for (let n = 1; n <= 3; n++) {
    await page.evaluate(i => window.CofreDebug.focus(i), alvo.index);
    const errado = String(alvo.answer + 1);
    for (const d of errado) await page.keyboard.press(d);
    await page.keyboard.press('Enter');
    const a = await state(page);
    assert(a.errors === n, `erro ${n} registrado`);
  }
  await page.waitForSelector('[data-testid="summary"]:not(.hidden)', { timeout: 5000 });
  await page.waitForTimeout(700);
  s = await state(page);
  assert(s.summaryTitle.includes('FALHA'), 'tela de derrota exibida');
  await shot(page, '05-derrota.png');

  // Repetir mesma semente gera exatamente os mesmos módulos.
  const seedAnterior = s.seed;
  await page.locator('[data-testid="again-same"]').click();
  await page.waitForFunction(() => window.CofreDebug.state().running);
  s = await state(page);
  assert(s.seed === seedAnterior, 'repetir mesma semente preserva a seed');

  assert(consoleErrors.length === 0, 'nenhum erro de console/página: ' + consoleErrors.join(' | '));

  fs.writeFileSync(path.join(ROOT, 'trabalho', 'teste-funcional.log'), log.join('\n') + '\n', 'utf8');
  console.log(log.join('\n'));
  console.log('\nRESULTADO: APROVADO');
  console.log('Capturas:', CAP);
  await browser.close();
  process.exit(0);
} catch (e) {
  console.log(log.join('\n'));
  console.error('\nRESULTADO: REPROVADO — ' + e.message);
  console.error(consoleErrors.join('\n'));
  fs.writeFileSync(path.join(ROOT, 'trabalho', 'teste-funcional.log'), log.join('\n') + '\nERRO: ' + e.message + '\n', 'utf8');
  await browser.close();
  process.exit(1);
}
