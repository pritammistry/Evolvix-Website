// The dhak, synthesised.
//
// The first version was one sine wave per beat, which is a metronome, not a
// drum. Three things were missing and all three are what makes a dhak sound
// like a dhak:
//
//   1. A drum is not a pitch. It is a stick attack, a membrane that drops in
//      pitch as the skin relaxes, and a wooden shell that rings underneath. So
//      each hit here is three layered voices, not one.
//   2. A dhaki does not play one note per beat. The pulse is carried by the
//      main strokes, but the space between them is filled with quieter ghost
//      strokes — that roll is the sound of the instrument being played rather
//      than triggered.
//   3. A pandal is a big draped room. Without reverb the drum sounds like it is
//      in a cupboard.
//
// And the kanshi — the brass bell that rides over the dhak at every pandal —
// carries the accents. Its partials are deliberately inharmonic, because that
// is what makes struck metal sound like metal instead of like a flute.
//
// Everything is scheduled against the AudioContext clock rather than fired from
// the animation loop, so the rhythm stays sample-accurate even when frames drop.

function rand(a, b) { return a + Math.random() * (b - a); }

function makeImpulse(ctx, seconds, decay) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch += 1) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i += 1) {
      // Noise under an exponential envelope is a crude but convincing room.
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

function noiseBuffer(ctx, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  return buf;
}

export class DhakKit {
  constructor() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) throw new Error("no web audio");
    this.ctx = new Ctx();
    this.noise = noiseBuffer(this.ctx, 1);

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;

    // Soft saturation. A clean sum of sine waves is the single most synthetic
    // thing in any drum synthesis; driving it into a gentle curve adds the
    // harmonics a microphone and a skin would have produced anyway.
    const shaper = this.ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i += 1) {
      const x = (i / 1023) * 2 - 1;
      curve[i] = Math.tanh(x * 1.9);
    }
    shaper.curve = curve;
    shaper.oversample = "4x";

    // Rolled off at the top, because nothing in a drum-and-bell ensemble has
    // real energy above about 9k and leaving it in sounds like a synth.
    const tone = this.ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 9000;

    this.master.connect(shaper).connect(tone).connect(this.ctx.destination);

    // Dry and wet in parallel, so the room never swallows the attack.
    this.dry = this.ctx.createGain();
    this.dry.gain.value = 0.82;
    this.dry.connect(this.master);

    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = makeImpulse(this.ctx, 1.6, 2.6);
    this.wet = this.ctx.createGain();
    this.wet.gain.value = 0.3;
    this.reverb.connect(this.wet).connect(this.master);

    this.scheduled = [];
  }

  resume() { return this.ctx.resume?.(); }
  get now() { return this.ctx.currentTime; }

  send(node) {
    node.connect(this.dry);
    node.connect(this.reverb);
  }

  // One dhak stroke, modelled rather than approximated.
  //
  // A drum head is a circular membrane, and a circular membrane does not ring
  // in a harmonic series — its modes fall at roughly 1, 1.59, 2.14, 2.30, 2.65
  // and 2.92 times the fundamental. That inharmonicity is the difference
  // between "drum" and "bass note", and no amount of layering two harmonic
  // oscillators will produce it.
  //
  // The rest is what a real recording carries and a naive synth does not: the
  // pitch drops as the struck skin relaxes, the low modes ring far longer than
  // the high ones, the shell adds a woody knock, and the whole thing is driven
  // hard enough to saturate.
  dhak(at, v = 1, deep = false) {
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = v * 0.9;
    // Panned very slightly per stroke, which stops a repeated sample-like
    // sound from feeling pasted in the exact same spot every time.
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) { pan.pan.value = rand(-0.12, 0.12); out.connect(pan); this.send(pan); }
    else this.send(out);

    const f0 = deep ? 74 : 92;
    // Mode ratios of an ideal circular membrane, with the amplitude and decay
    // falling off as the mode rises — exactly as they do on a real head.
    const MODES = [
      { r: 1.00, a: 1.00, d: deep ? 0.95 : 0.68 },
      { r: 1.59, a: 0.42, d: 0.34 },
      { r: 2.14, a: 0.26, d: 0.2 },
      { r: 2.30, a: 0.18, d: 0.16 },
      { r: 2.65, a: 0.12, d: 0.11 },
      { r: 2.92, a: 0.08, d: 0.08 },
    ];
    MODES.forEach((m) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      // The skin is tightest at the moment of impact and relaxes immediately,
      // so every mode glides down. Without this a drum sounds like an organ.
      osc.frequency.setValueAtTime(f0 * m.r * 1.28, at);
      osc.frequency.exponentialRampToValueAtTime(f0 * m.r, at + 0.055);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(m.a * 0.5, at + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, at + m.d);
      osc.connect(g).connect(out);
      osc.start(at); osc.stop(at + m.d + 0.1);
      this.scheduled.push(osc);
    });

    // The stick landing on the skin: a very short, bright noise transient. This
    // is most of what the ear uses to identify the instrument.
    const stick = ctx.createBufferSource();
    stick.buffer = this.noise;
    stick.playbackRate.value = 0.8 + Math.random() * 0.4;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = deep ? 900 : 1500;
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.4 * v, at);
    sg.gain.exponentialRampToValueAtTime(0.0001, at + 0.03);
    stick.connect(hp).connect(sg).connect(out);
    stick.start(at); stick.stop(at + 0.06);

    // The wooden shell knocking underneath the head.
    const wood = ctx.createBufferSource();
    wood.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 420;
    bp.Q.value = 4;
    const wg = ctx.createGain();
    wg.gain.setValueAtTime(0.3 * v, at);
    wg.gain.exponentialRampToValueAtTime(0.0001, at + 0.11);
    wood.connect(bp).connect(wg).connect(out);
    wood.start(at); wood.stop(at + 0.14);

    this.scheduled.push(stick, wood);
  }

  // The brass kanshi that rides over the dhak on accents. Inharmonic partials,
  // because struck metal is not a harmonic series.
  kanshi(at, v = 0.5) {
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = v;
    this.send(out);
    const base = 1180;
    [1, 2.76, 5.4, 8.93].forEach((ratio, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = base * ratio * (0.995 + Math.random() * 0.01);
      const g = ctx.createGain();
      const peak = 0.34 / (i + 1.4);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(peak, at + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.9 - i * 0.13);
      osc.connect(g).connect(out);
      osc.start(at); osc.stop(at + 1.0);
      this.scheduled.push(osc);
    });
  }

  // Lay the whole routine down on the audio clock in one go. `beats` carry
  // times in milliseconds from the start; `startAt` is the AudioContext time
  // those milliseconds are measured from.
  //
  // The filling between main strokes is a roll, not a metronome subdivision.
  // Velocities rise and fall across it, the odd stroke is a flam — two hits a
  // few milliseconds apart, which is how a stick actually bounces — and the
  // pattern varies from bar to bar so nothing sounds looped.
  schedule(beats, startAt) {
    beats.forEach((b, i) => {
      const at = startAt + b.t / 1000;
      const accent = i % 4 === 0;
      this.dhak(at, b.countIn ? 0.6 : accent ? 1 : 0.82, accent);
      // A flam on the accents: the second stick landing a few milliseconds
      // behind the first. Small, and it is the difference between a machine
      // and a pair of hands.
      if (accent && !b.countIn) {
        this.dhak(at - 0.022, 0.3);
        this.kanshi(at, 0.4);
      }

      const next = beats[i + 1];
      if (!next) return;
      const gap = (next.t - b.t) / 1000;
      if (gap < 0.3) return;

      // Three or four strokes across the gap, shaped so the roll leans towards
      // the next main beat rather than sitting flat.
      const n = gap > 0.6 ? 4 : 3;
      for (let j = 1; j < n; j += 1) {
        const frac = j / n;
        const lean = 0.16 + frac * 0.3;             // crescendo into the beat
        const jitter = (Math.random() - 0.5) * 0.012; // human, not quantised
        this.dhak(at + gap * frac + jitter, lean + Math.random() * 0.07);
      }
    });
  }

  stop() {
    this.scheduled.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } });
    this.scheduled = [];
  }

  close() {
    this.stop();
    try { this.ctx.close(); } catch { /* already closed */ }
  }
}
