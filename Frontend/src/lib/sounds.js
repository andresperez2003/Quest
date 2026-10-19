// Aviso sonoro generado con Web Audio: sin archivos que descargar ni cachear.
// El navegador solo deja sonar audio tras un gesto del usuario: llamar a unlockAudio() en un clic.

let ctx = null;

function audio() {
  ctx ??= new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlockAudio() {
  try {
    audio();
  } catch {
    /* sin audio disponible */
  }
}

// Tres notas ascendentes: aviso amable de fin de periodo.
export function chime() {
  try {
    const ac = audio();
    const t = ac.currentTime;
    [660, 880, 1320].forEach((freq, i) => {
      const start = t + i * 0.18;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
      osc.connect(gain).connect(ac.destination);
      osc.start(start);
      osc.stop(start + 0.65);
    });
  } catch {
    /* sin audio disponible */
  }
}
