export class AudioSystem {
  constructor(save) {
    this.save = save;
    this.context = null;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  ensure() {
    if (!this.save.soundEnabled) return null;
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window["webkitAudioContext"];
      if (!AudioContextClass) return null;
      this.context = new AudioContextClass();
    }
    if (this.context.state === "suspended") this.context.resume().catch(() => {});
    return this.context;
  }

  tone(frequency, delay = 0, duration = 0.13, volume = 0.05, type = "sine") {
    const context = this.ensure();
    if (!context) return;
    const now = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  play(type) {
    if (!this.save.soundEnabled) return;
    const sequences = {
      start: [[330, 0], [440, 0.08], [660, 0.16]],
      pickup: [[520, 0], [700, 0.07]],
      drop: [[250, 0]],
      deliver: [[520, 0], [700, 0.07], [900, 0.14]],
      wrong: [[180, 0], [135, 0.11]],
      purchase: [[480, 0], [720, 0.08], [960, 0.16]],
      achievement: [[660, 0], [880, 0.1], [1100, 0.2], [1320, 0.3]],
      pause: [[300, 0]],
      success: [[440, 0], [660, 0.1], [880, 0.2], [1100, 0.3]],
      timeout: [[260, 0], [210, 0.14], [160, 0.28]],
      tutorial: [[540, 0], [760, 0.1], [980, 0.2]],
    };
    const sequence = sequences[type] || sequences.drop;
    sequence.forEach(([frequency, offset]) => this.tone(
      frequency,
      offset,
      0.14,
      type === "wrong" || type === "timeout" ? 0.04 : 0.052,
      type === "wrong" || type === "timeout" ? "square" : "sine",
    ));
  }

  startMusic() {
    if (!this.save.soundEnabled || this.musicTimer) return;
    const notes = [110, 146.83, 164.81, 146.83, 123.47, 164.81, 196, 164.81];
    const playBeat = () => {
      if (!this.save.soundEnabled) return;
      const base = notes[this.musicStep % notes.length];
      this.tone(base, 0, 0.55, 0.011, "triangle");
      this.tone(base * 2, 0.08, 0.28, 0.006, "sine");
      this.musicStep += 1;
    };
    playBeat();
    this.musicTimer = window.setInterval(playBeat, 1150);
  }

  stopMusic() {
    if (this.musicTimer) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  setEnabled(enabled) {
    this.save.soundEnabled = enabled;
    if (!enabled) this.stopMusic();
  }
}
