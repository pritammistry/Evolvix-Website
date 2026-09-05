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
    this.master.connect(this.ctx.destination);

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

  // One dhak stroke. `v` is velocity: main strokes near 1, ghost strokes ~0.3.
  dhak(at, v = 1, deep = false) {
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = v;
    this.send(out);

    // Membrane: pitch falls fast as the skin gives, which is most of the
    // character of a hand-tensioned drum.
    const f0 = deep ? 96 : 132;
    const body = ctx.createOscillator();
    body.type = "sine";
    body.frequency.setValueAtTime(f0 * 1.9, at);
    body.frequency.exponentialRampToValueAtTime(f0 * 0.42, at + 0.13);
    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.0001, at);
    bodyGain.gain.exponentialRampToValueAtTime(0.9, at + 0.004);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, at + (deep ? 0.42 : 0.3));
    body.connect(bodyGain).connect(out);
    body.start(at); body.stop(at + 0.5);

    // Shell: a second, detuned voice an octave or so up, giving the wooden ring
    // that a single oscillator cannot.
    const shell = ctx.createOscillator();
    shell.type = "triangle";
    shell.frequency.setValueAtTime(f0 * 2.7, at);
    shell.frequency.exponentialRampToValueAtTime(f0 * 1.1, at + 0.09);
    const shellGain = ctx.createGain();
    shellGain.gain.setValueAtTime(0.0001, at);
    shellGain.gain.exponentialRampToValueAtTime(0.28, at + 0.003);
    shellGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    shell.connect(shellGain).connect(out);
    shell.start(at); shell.stop(at + 0.25);

    // Stick: a short slap of filtered noise. Without this the drum has no
    // transient and reads as a synth tone.
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = "bandpass";
    hp.frequency.value = deep ? 1400 : 2100;
    hp.Q.value = 0.7;
    const slap = ctx.createGain();
    slap.gain.setValueAtTime(0.5 * v, at);
    slap.gain.exponentialRampToValueAtTime(0.0001, at + 0.045);
    src.connect(hp).connect(slap).connect(out);
    src.start(at); src.stop(at + 0.08);

    this.scheduled.push(body, shell, src);
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
  schedule(beats, startAt) {
    beats.forEach((b, i) => {
      const at = startAt + b.t / 1000;
      const accent = i % 4 === 0;
      this.dhak(at, b.countIn ? 0.62 : accent ? 1 : 0.84, accent);
      if (accent && !b.countIn) this.kanshi(at, 0.42);

      // Ghost strokes fill the gap to the next beat. Their velocity is low and
      // slightly random so the roll breathes instead of stuttering.
      const next = beats[i + 1];
      if (!next) return;
      const gap = (next.t - b.t) / 1000;
      if (gap > 0.34) this.dhak(at + gap * 0.5, 0.26 + Math.random() * 0.08);
      if (gap > 0.52) this.dhak(at + gap * 0.75, 0.2 + Math.random() * 0.07);
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
