// STAR CATCHER — a tiny browser game built from one prompt.
// "Build me a tiny browser game: catch the falling stars. 60 seconds. Go."
// One file of pure logic + drawing through a tiny pixel API `P`, so the same
// code runs in the browser (game.html, canvas adapter) and in the video
// renderer (video/render-game.mjs, raw-buffer adapter). No dependencies.
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.StarCatcher = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var W = 1080;
  var H = 1920;
  var BASKET_Y = 1680;
  var BASKET_W = 260;
  var BASKET_H = 64;
  var GAME_SECONDS = 60;

  // Deterministic RNG so a recorded run replays exactly.
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createGame(seed) {
    var rng = mulberry32(seed || 7);
    return {
      width: W, height: H,
      timeLeft: GAME_SECONDS,
      score: 0,
      lives: 3,
      caught: 0,
      missed: 0,
      over: false,
      basketX: W / 2,
      basketTarget: W / 2,
      stars: [],
      particles: [],
      spawnIn: 0.4,
      elapsed: 0,
      rng: rng
    };
  }

  function spawnStar(s) {
    var gold = s.rng() < 0.16; // roughly one golden star in six
    s.stars.push({
      x: 90 + s.rng() * (W - 180),
      y: -60,
      vy: 420 + s.rng() * 260,
      sway: 40 + s.rng() * 70,
      phase: s.rng() * 6.28,
      r: gold ? 46 : 36,
      gold: gold
    });
  }

  function burst(s, x, y, gold) {
    for (var i = 0; i < 14; i++) {
      var a = s.rng() * 6.28;
      var sp = 120 + s.rng() * 320;
      s.particles.push({
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120,
        life: 0.5 + s.rng() * 0.4, age: 0,
        gold: gold
      });
    }
  }

  // input: { left, right } for keys, or { targetX } for pointer / auto-play.
  function step(s, input, dt) {
    if (s.over) return;
    s.elapsed += dt;
    s.timeLeft -= dt;
    if (s.timeLeft <= 0) { s.timeLeft = 0; s.over = true; }

    // Basket movement: pointer target wins, else keys.
    if (input && typeof input.targetX === 'number') {
      s.basketTarget = input.targetX;
    } else if (input) {
      if (input.left) s.basketTarget -= 1500 * dt;
      if (input.right) s.basketTarget += 1500 * dt;
    }
    var dx = s.basketTarget - s.basketX;
    var maxStep = 1500 * dt;
    if (dx > maxStep) dx = maxStep;
    if (dx < -maxStep) dx = -maxStep;
    s.basketX += dx;
    if (s.basketX < BASKET_W / 2) s.basketX = BASKET_W / 2;
    if (s.basketX > W - BASKET_W / 2) s.basketX = W - BASKET_W / 2;

    // Spawn stars faster as the clock runs down.
    s.spawnIn -= dt;
    if (s.spawnIn <= 0) {
      spawnStar(s);
      var pressure = 1 - s.timeLeft / GAME_SECONDS; // 0 -> 1
      s.spawnIn = 0.62 - pressure * 0.22;
    }

    // Fall, sway, catch or miss.
    for (var i = s.stars.length - 1; i >= 0; i--) {
      var st = s.stars[i];
      st.y += st.vy * dt;
      st.x += Math.sin(s.elapsed * 2.2 + st.phase) * st.sway * dt;
      var inBasketBand = st.y > BASKET_Y - 30 && st.y < BASKET_Y + BASKET_H + 40;
      var overBasket = Math.abs(st.x - s.basketX) < BASKET_W / 2 + st.r * 0.5;
      if (inBasketBand && overBasket) {
        s.score += st.gold ? 25 : 10;
        s.caught += 1;
        burst(s, st.x, BASKET_Y - 10, st.gold);
        s.stars.splice(i, 1);
      } else if (st.y > H + 80) {
        s.missed += 1;
        s.lives -= 1;
        s.stars.splice(i, 1);
        if (s.lives <= 0) { s.lives = 0; s.over = true; }
      }
    }

    // Particles fade and fall.
    for (var j = s.particles.length - 1; j >= 0; j--) {
      var p = s.particles[j];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 500 * dt;
      if (p.age >= p.life) s.particles.splice(j, 1);
    }
  }

  // Draw the whole frame through the pixel API P:
  //   P.bg()  P.circle(cx, cy, r, color)  P.rect(x, y, w, h, color)
  //   P.text(str, x, y, px, color, align)  P.poly(points, color)
  // Colors are [r, g, b] arrays (0-255) or [r, g, b, a] with a 0..1.
  function draw(s, P) {
    P.bg();
    // Soft scrim behind the HUD so falling stars never fight the score.
    P.rect(0, 0, W, 400, [11, 16, 38, 0.45]);
    // Distant background stars, fixed by index so they never flicker.
    for (var i = 0; i < 46; i++) {
      var bx = (i * 173 + 61) % W;
      var by = (i * 331 + 97) % 1500;
      var tw = 0.5 + 0.5 * Math.sin(s.elapsed * 1.5 + i);
      P.circle(bx, by, 2 + tw * 2, [255, 255, 255, 0.25 + tw * 0.45]);
    }
    // Falling stars: a glowing disc plus a 4-point sparkle.
    for (var k = 0; k < s.stars.length; k++) {
      var st = s.stars[k];
      var col = st.gold ? [255, 176, 32] : [255, 211, 77];
      P.circle(st.x, st.y, st.r + 14, [col[0], col[1], col[2], 0.18]);
      P.circle(st.x, st.y, st.r, col);
      var sp = st.r * 1.5;
      P.poly([
        [st.x, st.y - sp], [st.x + st.r * 0.28, st.y - st.r * 0.28],
        [st.x + sp, st.y], [st.x + st.r * 0.28, st.y + st.r * 0.28],
        [st.x, st.y + sp], [st.x - st.r * 0.28, st.y + st.r * 0.28],
        [st.x - sp, st.y], [st.x - st.r * 0.28, st.y - st.r * 0.28]
      ], [255, 255, 255, 0.9]);
      P.circle(st.x, st.y, st.r * 0.42, [255, 255, 255, 0.95]);
    }
    // Catch particles.
    for (var j = 0; j < s.particles.length; j++) {
      var p = s.particles[j];
      var fade = 1 - p.age / p.life;
      P.circle(p.x, p.y, 5 + fade * 7,
        p.gold ? [255, 176, 32, fade] : [255, 211, 77, fade]);
    }
    // Basket: magenta tub with a white rim and a faint halo.
    P.circle(s.basketX, BASKET_Y + BASKET_H / 2, BASKET_W / 2 + 10, [233, 30, 140, 0.08]);
    P.rect(s.basketX - BASKET_W / 2, BASKET_Y, BASKET_W, BASKET_H, [233, 30, 140]);
    P.rect(s.basketX - BASKET_W / 2, BASKET_Y, BASKET_W, 10, [255, 255, 255]);
    P.rect(s.basketX - BASKET_W / 2, BASKET_Y + BASKET_H - 10, BASKET_W, 10, [160, 10, 100]);
    // HUD: labels clear of the big numbers, and the whole block sits
    // above the make.fun badge zone (y 272+) so the video's badge overlay
    // never covers the score.
    P.text('SCORE', 70, 100, 48, [255, 255, 255, 0.85], 'left');
    P.text(String(s.score), 70, 215, 96, [255, 211, 77], 'left');
    P.text('TIME', W - 70, 100, 48, [255, 255, 255, 0.85], 'right');
    P.text(String(Math.ceil(s.timeLeft)), W - 70, 215, 96, [255, 255, 255], 'right');
    // Lives as three small hearts (circles) under the timer.
    for (var l = 0; l < 3; l++) {
      var lx = W - 70 - l * 74;
      var alive = l < s.lives;
      P.circle(lx, 330, 22, alive ? [233, 30, 140] : [255, 255, 255, 0.25]);
    }
    if (s.over) {
      P.rect(0, 760, W, 400, [11, 16, 38, 0.82]);
      P.text(s.lives > 0 ? 'TIME UP!' : 'GAME OVER', W / 2, 900, 120, [255, 211, 77], 'center');
      P.text('SCORE ' + s.score + '  ·  CAUGHT ' + s.caught, W / 2, 1030, 56, [255, 255, 255], 'center');
    }
  }

  return {
    W: W, H: H, GAME_SECONDS: GAME_SECONDS,
    createGame: createGame, step: step, draw: draw, spawnStar: spawnStar
  };
});
