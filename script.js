// script.js — corrected centering, crisp HiDPI handling, smoother animation
(function () {
  const canvas = document.getElementById('c');
  if (!canvas) throw new Error("Canvas element with id 'c' not found.");
  const ctx = canvas.getContext('2d');

  const opts = {
    strings: ["HAPPY DIWALI", "TO MY MOST PERCIOUS DUMBOO",],   // change text here
    charSize: 44,
    charSpacing: 62,
    lineHeight: 72,
    gravity: 0.12,
    upFlow: -0.06,
    // firework / balloon tuning
    fireworkPrevPoints: 12,
    fireworkBaseLineWidth: 6,
    fireworkAddedLineWidth: 8,
    fireworkSpawnTime: 140,
    fireworkBaseReachTime: 36,
    fireworkAddedReachTime: 40,
    fireworkCircleBaseSize: 22,
    fireworkCircleAddedSize: 14,
    fireworkCircleBaseTime: 36,
    fireworkCircleAddedTime: 26,
    fireworkCircleFadeBaseTime: 12,
    fireworkCircleFadeAddedTime: 8,
    fireworkBaseShards: 7,
    fireworkAddedShards: 8,
    fireworkShardPrevPoints: 3,
    fireworkShardBaseVel: 3.4,
    fireworkShardAddedVel: 2.6,
    fireworkShardBaseSize: 2,
    fireworkShardAddedSize: 3,
    letterContemplatingWaitTime: 260,
    balloonSpawnTime: 18,
    balloonBaseInflateTime: 12,
    balloonAddedInflateTime: 18,
    balloonBaseSize: 18,
    balloonAddedSize: 24,
    balloonBaseVel: 0.36,
    balloonAddedVel: 0.5,
    balloonBaseRadian: -(Math.PI / 2 - 0.4),
    balloonAddedRadian: -0.9
  };

  // DPR and sizing
  let DPR = Math.max(window.devicePixelRatio || 1, 1);
  let w = innerWidth, h = innerHeight, hw = w/2, hh = h/2;
  let calc = { totalWidth: 0 };
  const Tau = Math.PI * 2;
  const letters = [];

  function setSize() {
    DPR = Math.max(window.devicePixelRatio || 1, 1);
    const cssW = Math.max(1, innerWidth);
    const cssH = Math.max(1, innerHeight);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * DPR);
    canvas.height = Math.round(cssH * DPR);

    // Use default transform so drawing uses CSS pixels scaled by DPR when we multiply coordinates.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(DPR, DPR);

    w = cssW; h = cssH; hw = w/2; hh = h/2;
    ctx.font = `${opts.charSize}px Verdana`;
    calc.totalWidth = opts.charSpacing * Math.max(...opts.strings.map(s => s.length));
  }

  // map position -> warm hue (approx 25-50 degrees)
  function hueForX(x) {
    if (calc.totalWidth <= 0) return 40;
    const t = (x + calc.totalWidth/2) / calc.totalWidth; // 0..1 across block
    return 30 + 25 * Math.min(Math.max(t, 0), 1); // 30..55
  }

  // Letter class
  function Letter(char, x, y) {
    this.char = char;
    this.x = x;
    this.y = y;
    this.dx = -ctx.measureText(char).width / 2;
    this.dy = opts.charSize / 2;
    this.fireworkDy = this.y - hh;

    const hue = hueForX(x);
    this.hue = hue;
    this.color = `hsl(${hue},90%,50%)`;
    this.lightColor = (light) => `hsl(${hue},90%,${light}%)`;
    this.alphaColor = (alp) => `hsla(${hue},90%,52%,${alp})`;
    this.lightAlpha = (light, alp) => `hsla(${hue},90%,${light}%,${alp})`;

    this.reset();
  }

  Letter.prototype.reset = function () {
    this.phase = 'firework';
    this.tick = 0;
    this.spawned = false;
    this.spawningTime = Math.floor(opts.fireworkSpawnTime * Math.random());
    this.reachTime = Math.floor(opts.fireworkBaseReachTime + opts.fireworkAddedReachTime * Math.random());
    this.lineWidth = opts.fireworkBaseLineWidth + opts.fireworkAddedLineWidth * Math.random();
    this.prevPoints = [[0, hh, 0]];
  };

  Letter.prototype.step = function () {
    if (this.phase === 'firework') {
      if (!this.spawned) {
        ++this.tick;
        if (this.tick >= this.spawningTime) {
          this.tick = 0; this.spawned = true;
        }
      } else {
        ++this.tick;
        const lp = this.tick / Math.max(1, this.reachTime);
        const ap = Math.sin(lp * (Tau/4));
        const x = lp * this.x;
        const y = hh + ap * this.fireworkDy;

        if (this.prevPoints.length > opts.fireworkPrevPoints) this.prevPoints.shift();
        this.prevPoints.push([x, y, lp * this.lineWidth]);

        const lwp = 1 / Math.max(1, this.prevPoints.length - 1);
        for (let i = 1; i < this.prevPoints.length; ++i) {
          const p = this.prevPoints[i], p2 = this.prevPoints[i-1];
          ctx.strokeStyle = this.alphaColor((i / this.prevPoints.length) * 0.9);
          ctx.lineWidth = p[2] * lwp * i;
          ctx.beginPath();
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(p2[0], p2[1]);
          ctx.stroke();
        }

        if (this.tick >= this.reachTime) {
          this.phase = 'contemplate';
          this.circleFinalSize = opts.fireworkCircleBaseSize + opts.fireworkCircleAddedSize * Math.random();
          this.circleCompleteTime = Math.floor(opts.fireworkCircleBaseTime + opts.fireworkCircleAddedTime * Math.random());
          this.circleCreating = true; this.circleFading = false;
          this.circleFadeTime = Math.floor(opts.fireworkCircleFadeBaseTime + opts.fireworkCircleFadeAddedTime * Math.random());
          this.tick = 0; this.tick2 = 0;
          this.shards = [];
          const shardCount = Math.max(5, Math.floor(opts.fireworkBaseShards + opts.fireworkAddedShards * Math.random()));
          const angle = (Tau / shardCount);
          let cos = Math.cos(angle), sin = Math.sin(angle);
          let vx = 1, vy = 0;
          for (let i = 0; i < shardCount; ++i) {
            const vx1 = vx;
            vx = vx * cos - vy * sin;
            vy = vx1 * sin + vy * cos;
            this.shards.push(new Shard(this.x, this.y, vx, vy, this.alphaColor(1)));
          }
        }
      }
    } else if (this.phase === 'contemplate') {
      ++this.tick;
      if (this.circleCreating) {
        ++this.tick2;
        const proportion = this.tick2 / Math.max(1, this.circleCompleteTime);
        const armonic = -Math.cos(proportion * Math.PI)/2 + 0.5;
        ctx.beginPath();
        ctx.fillStyle = this.lightAlpha(40 + 60 * proportion, proportion);
        ctx.arc(this.x, this.y, armonic * this.circleFinalSize, 0, Tau);
        ctx.fill();
        if (this.tick2 > this.circleCompleteTime) {
          this.tick2 = 0; this.circleCreating = false; this.circleFading = true;
        }
      } else if (this.circleFading) {
        // glow then letter
        ctx.save();
        ctx.shadowBlur = 18;
        ctx.shadowColor = 'rgba(255,200,110,0.9)';
        ctx.fillStyle = this.lightColor(76);
        ctx.fillText(this.char, this.x + this.dx, this.y + this.dy);
        ctx.restore();

        ++this.tick2;
        const proportion = this.tick2 / Math.max(1, this.circleFadeTime);
        const armonic = -Math.cos(proportion * Math.PI)/2 + 0.5;
        ctx.beginPath();
        ctx.fillStyle = this.lightAlpha(100, 1 - armonic);
        ctx.arc(this.x, this.y, this.circleFinalSize, 0, Tau);
        ctx.fill();

        if (this.tick2 >= this.circleFadeTime) this.circleFading = false;
      } else {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(255,190,80,0.85)';
        ctx.fillStyle = this.lightColor(72);
        ctx.fillText(this.char, this.x + this.dx, this.y + this.dy);
        ctx.restore();
      }

      for (let i = 0; i < this.shards.length; ++i) {
        this.shards[i].step();
        if (!this.shards[i].alive) { this.shards.splice(i,1); --i; }
      }

      if (this.tick > opts.letterContemplatingWaitTime) {
        this.phase = 'balloon';
        this.tick = 0; this.spawning = true;
        this.spawnTime = Math.floor(opts.balloonSpawnTime * Math.random());
        this.inflating = false;
        this.inflateTime = Math.floor(opts.balloonBaseInflateTime + opts.balloonAddedInflateTime * Math.random());
        this.size = Math.floor(opts.balloonBaseSize + opts.balloonAddedSize * Math.random());
        const rad = opts.balloonBaseRadian + opts.balloonAddedRadian * Math.random();
        const vel = opts.balloonBaseVel + opts.balloonAddedVel * Math.random();
        this.vx = Math.cos(rad) * vel;
        this.vy = Math.sin(rad) * vel;
        this.cx = this.x; this.cy = this.y;
      }
    } else if (this.phase === 'balloon') {
      ctx.strokeStyle = this.lightColor(82);
      ctx.lineWidth = 1.2;
      if (this.spawning) {
        ++this.tick;
        ctx.fillStyle = this.lightColor(72);
        ctx.fillText(this.char, this.x + this.dx, this.y + this.dy);
        if (this.tick >= this.spawnTime) { this.tick = 0; this.spawning = false; this.inflating = true; }
      } else if (this.inflating) {
        ++this.tick;
        const proportion = this.tick / Math.max(1, this.inflateTime);
        const x = (this.cx = this.x);
        const y = (this.cy = this.y - this.size * proportion);
        ctx.fillStyle = this.alphaColor(proportion * 0.9);
        ctx.beginPath();
        generateBalloonPath(ctx, x, y, this.size * proportion);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, this.y);
        ctx.stroke();
        ctx.fillStyle = this.lightColor(70);
        ctx.fillText(this.char, this.x + this.dx, this.y + this.dy);
        if (this.tick >= this.inflateTime) { this.tick = 0; this.inflating = false; }
      } else {
        this.cx += this.vx;
        this.cy += (this.vy += opts.upFlow);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        generateBalloonPath(ctx, this.cx, this.cy, this.size);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(this.cx, this.cy);
        ctx.lineTo(this.cx, this.cy + this.size);
        ctx.stroke();
        ctx.fillStyle = this.lightColor(76);
        ctx.fillText(this.char, this.cx + this.dx, this.cy + this.dy + this.size);
        // offscreen threshold
        if (this.cy + this.size < -hh - 120 || this.cx < -hw - 120 || this.cx > hw + 120) this.phase = 'done';
      }
    }
  };

  // Shard (same but stable)
  function Shard(x, y, vx, vy, color) {
    const vel = opts.fireworkShardBaseVel + opts.fireworkShardAddedVel * Math.random();
    this.vx = vx * vel; this.vy = vy * vel;
    this.x = x; this.y = y;
    this.prevPoints = [[x,y]];
    this.color = color;
    this.alive = true;
    this.size = opts.fireworkShardBaseSize + opts.fireworkShardAddedSize * Math.random();
  }
  Shard.prototype.step = function () {
    this.x += this.vx; this.y += this.vy += opts.gravity;
    if (this.prevPoints.length > opts.fireworkShardPrevPoints) this.prevPoints.shift();
    this.prevPoints.push([this.x, this.y]);
    const lwp = this.size / Math.max(1, this.prevPoints.length);
    for (let k = 0; k < this.prevPoints.length - 1; ++k) {
      const p = this.prevPoints[k], p2 = this.prevPoints[k+1];
      ctx.strokeStyle = this.color;
      ctx.lineWidth = (k+1) * lwp * 0.6;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
    }
    if (this.prevPoints[0][1] > hh + 60) this.alive = false;
  };

  function generateBalloonPath(ctx, x, y, size) {
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - size/2, y - size/2, x - size/4, y - size, x, y - size);
    ctx.bezierCurveTo(x + size/4, y - size, x + size/2, y - size/2, x, y);
  }

  // Create centered letters (robust centering across lines)
  function createLetters() {
    letters.length = 0;
    const rows = opts.strings.length;
    const longest = Math.max(...opts.strings.map(s => s.length));
    calc.totalWidth = opts.charSpacing * longest;

    // compute total block height to center vertically
    const blockHeight = opts.lineHeight * rows;
    for (let i = 0; i < rows; ++i) {
      const str = opts.strings[i];
      const rowWidth = opts.charSpacing * str.length;
      // left origin so center is at -rowWidth/2
      const xOffset = -rowWidth / 2 + opts.charSpacing / 2;
      const y = i * opts.lineHeight + opts.lineHeight/2 - blockHeight/2;
      for (let j = 0; j < str.length; ++j) {
        const x = xOffset + j * opts.charSpacing;
        letters.push(new Letter(str[j], x, y));
      }
    }
  }

  // draw background + animate
  function animate() {
    window.requestAnimationFrame(animate);

    // clear (use CSS pixels)
    ctx.save();
    ctx.setTransform(DPR,0,0,DPR,0,0); // ensure scale matches drawing earlier
    ctx.clearRect(0,0,canvas.width, canvas.height);

    // background fill (CSS px)
    ctx.fillStyle = '#0c0610';
    ctx.fillRect(0, 0, canvas.width / DPR, canvas.height / DPR);

    // radial glow
    const g = ctx.createRadialGradient(hw, hh, 0, hw, hh, Math.max(w,h)*0.9);
    g.addColorStop(0, 'rgba(255,190,80,0.06)');
    g.addColorStop(0.25, 'rgba(255,160,60,0.03)');
    g.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,canvas.width / DPR, canvas.height / DPR);
    ctx.restore();

    // draw items in centered coordinates (CSS px)
    ctx.save();
    ctx.translate(hw, hh);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.font = `${opts.charSize}px Verdana`;

    let allDone = true;
    for (let i = 0; i < letters.length; ++i) {
      letters[i].step();
      if (letters[i].phase !== 'done') allDone = false;
    }

    ctx.restore();

    if (allDone) {
      // restart with small delay to avoid instant loop
      setTimeout(() => { for (let L of letters) L.reset(); }, 400);
    }
  }

  // setup handlers
  setSize();
  window.addEventListener('resize', () => {
    // use rAF throttle
    window.requestAnimationFrame(() => { setSize(); createLetters(); });
  }, { passive: true });

  createLetters();
  animate();

})();