// "Guess the Car": a Wordle-style game with a random car from Wikipedia.
import { renderNav } from './components/nav.js';
import { renderNewsSidebar } from './components/newsSidebar.js';
import { esc, safeUrl } from './lib/html.js';
import { getCarFacts, searchCars } from './lib/wiki.js';
import { getCarPhoto } from './lib/carOfTheDay.js';
import { displayName, boxLayout, slotsOf, scoreLetters, compareCars, MAX_GUESSES } from './lib/cardle.js';
import live from './data/live.json';
import poolData from './data/cardle-pool.json';

renderNav(document.getElementById('nav'));
renderNewsSidebar(document.getElementById('news-sidebar'), live.events);

const el = document.getElementById('game');
// Answers are picked from this list; guesses can be any car article on Wikipedia
const pool = poolData.cars.map(c => ({ title: c.title, name: displayName(c.title) }));
const HINT_ORDER = ['year', 'country', 'cylinders', 'maker'];
const HINT_LABEL = { year: 'Year of production', country: 'Country of origin', cylinders: 'Cylinders', maker: 'Manufacturer' };

let game;

function newGame() {
  const answer = pool[Math.floor(Math.random() * pool.length)];
  game = { answer, answerFacts: getCarFacts(answer.title), guesses: [], hintsShown: 0, over: false, won: false };
  render();
}

// A car plus its manufacturer, country, year and cylinders (looked up live)
async function withFacts(car) {
  return { ...car, ...(await getCarFacts(car.title)) };
}

// Nicknames people type → the name Wikipedia uses
const ALIASES = { chevy: 'chevrolet', vw: 'volkswagen', merc: 'mercedes', benz: 'mercedes benz', beemer: 'bmw', bimmer: 'bmw',
  lambo: 'lamborghini', caddy: 'cadillac', vette: 'corvette', alfa: 'alfa romeo', aston: 'aston martin', rolls: 'rolls royce', range: 'range rover' };
const norm = s => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const expand = q => norm(q).split(' ').map(w => ALIASES[w] ?? w).join(' ');

// ---------- Drawing the page ----------
function render() {
  const { answer, guesses, over, won } = game;
  const layout = boxLayout(answer.name);
  // letters the player has found in the right place so far
  const found = slotsOf(answer.name).map((ch, i) => guesses.some(g => g.letters[i]?.state === 'green') || over ? ch : '');

  el.innerHTML = `
    <section class="box game">
      <header class="game-head">
        <h2>Guess the Car</h2>
        <span class="label">Guess ${Math.min(guesses.length + (over ? 0 : 1), MAX_GUESSES)} of ${MAX_GUESSES} · ${slotsOf(answer.name).length} letters</span>
      </header>
      <p class="game-rules">Guess the mystery car. Letters and hints turn
        <span class="tile-key green">green</span> when right,
        <span class="tile-key yellow">yellow</span> when close and
        <span class="tile-key red">red</span> when nowhere near. Arrows point toward the answer.</p>

      <div class="game-answer" aria-label="Mystery car name">
        ${layout.map(b => b.gap !== undefined
          ? `<span class="gap">${b.gap === ' ' ? '' : esc(b.gap)}</span>`
          : `<span class="letter ${found[b.slot] ? 'green' : ''}">${esc(found[b.slot])}</span>`).join('')}
      </div>

      <div class="game-hints">
        ${HINT_ORDER.slice(0, game.hintsShown).map(k => `<span class="hint"><strong>${HINT_LABEL[k]}:</strong> <span data-hint="${k}">…</span></span>`).join('')}
        ${!over && game.hintsShown < HINT_ORDER.length ? `<button type="button" class="game-btn" data-action="hint">Reveal a hint (${HINT_ORDER.length - game.hintsShown} left)</button>` : ''}
      </div>

      ${over ? endHtml(won) : `
        <form class="game-form" autocomplete="off">
          <input type="search" id="game-input" placeholder="Type a car, e.g. Ford Mustang" aria-label="Your guess" />
          <button type="submit" class="game-btn">Guess</button>
          <ul class="game-suggest" id="game-suggest" role="listbox"></ul>
        </form>
        <p class="game-msg" id="game-msg"></p>`}

      <ol class="game-guesses">
        ${[...guesses].reverse().map(guessHtml).join('')}
      </ol>
    </section>`;

  fillHintValues();
  if (over) loadEndPhoto();
  else wireInput();
}

const guessHtml = g => `
  <li class="game-guess">
    <div class="game-guess-name">${esc(g.car.name)}</div>
    <div class="game-letters">
      ${boxLayout(game.answer.name).map(b => b.gap !== undefined
        ? '<span class="gap"></span>'
        : `<span class="letter ${g.letters[b.slot].state}">${esc(g.letters[b.slot].letter)}</span>`).join('')}
    </div>
    <div class="game-tiles">
      ${g.tiles.map(t => `
        <div class="tile ${t.state}">
          <small>${esc(t.label)}</small>
          <strong>${esc(t.value)} ${t.arrow ?? ''}</strong>
        </div>`).join('')}
    </div>
  </li>`;

const endHtml = won => `
  <div class="game-end ${won ? 'won' : 'lost'}">
    <h3>${won ? `Got it in ${game.guesses.length}!` : 'Out of guesses.'} It was the ${esc(game.answer.name)}.</h3>
    <figure class="game-photo"></figure>
    <p>
      <a class="game-btn" href="./explore.html?car=${encodeURIComponent(game.answer.title.replace(/ /g, '_'))}">Explore the ${esc(game.answer.name)} →</a>
      <button type="button" class="game-btn" data-action="again">Play again</button>
    </p>
  </div>`;

async function fillHintValues() {
  const facts = await game.answerFacts;
  el.querySelectorAll('[data-hint]').forEach(s => { s.textContent = facts[s.dataset.hint] ?? 'unknown'; });
}

async function loadEndPhoto() {
  const fig = el.querySelector('.game-photo');
  const photo = await getCarPhoto(game.answer.title).catch(() => null);
  if (photo && fig) {
    fig.innerHTML = `<img src="${esc(safeUrl(photo.src))}" alt="${esc(game.answer.name)}" />
      <figcaption class="credit">Photo: <a href="${esc(safeUrl(photo.page))}" target="_blank" rel="noopener">${esc(photo.credit)}</a>${photo.license ? ` · ${esc(photo.license)}` : ''} · via Wikimedia Commons</figcaption>`;
  }
}

// ---------- Typing a guess: instant matches from the list + live Wikipedia car search ----------
function wireInput() {
  const input = el.querySelector('#game-input');
  const list = el.querySelector('#game-suggest');
  const msg = el.querySelector('#game-msg');
  let matches = [];
  let active = 0;

  const guessed = new Set(game.guesses.map(g => g.canonical));
  let searchToken = 0;
  let debounce;

  const draw = () => {
    list.innerHTML = matches.map((c, i) => `<li role="option" data-i="${i}" class="${i === active ? 'active' : ''}">${esc(c.name)}${c.description ? `<small>${esc(c.description)}</small>` : ''}</li>`).join('');
  };
  // every word typed must appear in the name, e.g. "chevy imp" → Chevrolet Impala
  const localMatches = q => {
    const words = q.split(' ');
    return pool.filter(c => !guessed.has(c.title) && words.every(w => norm(c.name).includes(w)))
      .sort((a, b) => norm(a.name).indexOf(words[0]) - norm(b.name).indexOf(words[0]) || a.name.length - b.name.length);
  };

  const showMatches = () => {
    const q = expand(input.value);
    clearTimeout(debounce);
    matches = q ? localMatches(q).slice(0, 12) : [];
    active = 0;
    draw();
    if (q.length < 2) return;
    // then add more cars from Wikipedia's search (same search as the Explore page)
    const token = ++searchToken;
    debounce = setTimeout(async () => {
      const found = await searchCars(q, 15).catch(() => []);
      if (token !== searchToken) return;
      const seen = new Set(matches.map(m => m.title));
      const extra = found.filter(f => !seen.has(f.title) && !guessed.has(f.title))
        .map(f => ({ title: f.title, name: displayName(f.title), description: f.description }));
      matches = [...matches, ...extra].slice(0, 20);
      draw();
    }, 250);
  };

  input.addEventListener('input', showMatches);
  input.addEventListener('keydown', e => {
    if (!matches.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : matches.length - 1)) % matches.length;
      list.querySelectorAll('li').forEach((li, i) => li.classList.toggle('active', i === active));
    }
  });
  list.addEventListener('mousedown', e => {
    const li = e.target.closest('[data-i]');
    if (li) { e.preventDefault(); submit(matches[+li.dataset.i]); }
  });
  el.querySelector('.game-form').addEventListener('submit', e => {
    e.preventDefault();
    if (matches[active]) submit(matches[active]);
    else msg.textContent = input.value.trim() ? 'Pick a car from the list.' : '';
  });
  input.focus();

  async function submit(car) {
    msg.textContent = 'Checking…';
    input.disabled = true;
    const [guess, answer] = await Promise.all([withFacts(car), withFacts(game.answer)]);
    game.guesses.push({ car, canonical: guess.canonical, letters: scoreLetters(car.name, game.answer.name), tiles: compareCars(guess, answer) });
    // compare Wikipedia's real titles, so a redirect like "Chevy Camaro" still counts
    game.won = guess.canonical === answer.canonical;
    game.over = game.won || game.guesses.length >= MAX_GUESSES;
    render();
  }
}

el.addEventListener('click', e => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'hint') { game.hintsShown++; render(); }
  if (action === 'again') newGame();
});

newGame();
