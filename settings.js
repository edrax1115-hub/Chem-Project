(() => {
  const settingsPanel = document.getElementById('settings');
  const openSettingsBtn = document.getElementById('openSettings');
  const toggleAmbience = document.getElementById('toggleAmbience');
  const toggleNames = document.getElementById('toggleNames');

  let audioCtx, ambientOsc1, ambientOsc2, ambientGain, ambientPlaying = false;

  // Ambient sound setup
  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    ambientOsc1 = audioCtx.createOscillator();
    ambientOsc2 = audioCtx.createOscillator();
    ambientGain = audioCtx.createGain();
    ambientOsc1.frequency.value = 170;
    ambientOsc2.frequency.value = 172;
    ambientOsc1.type = 'sine';
    ambientOsc2.type = 'triangle';
    ambientGain.gain.value = 0.12;
    ambientOsc1.connect(ambientGain);
    ambientOsc2.connect(ambientGain);
    ambientGain.connect(audioCtx.destination);
    ambientOsc1.start();
    ambientOsc2.start();
    ambientPlaying = true;
    toggleAmbience.textContent = '🔊 Ambient: On';
  }

  function toggleSound() {
    if (!audioCtx) {
      initAudio();
      return;
    }
    ambientPlaying = !ambientPlaying;
    ambientGain.gain.value = ambientPlaying ? 0.12 : 0;
    toggleAmbience.textContent = ambientPlaying ? '🔊 Ambient: On' : '🔇 Ambient: Off';
  }

  // Always show names toggle
  toggleNames.addEventListener('change', () => {
    localStorage.setItem('alwaysShowNames', toggleNames.checked ? 'true' : 'false');
  });

  openSettingsBtn.addEventListener('click', () => {
    settingsPanel.style.display = settingsPanel.style.display === 'block' ? 'none' : 'block';
  });

  toggleAmbience.addEventListener('click', toggleSound);

  // Restore saved setting
  const saved = localStorage.getItem('alwaysShowNames');
  if (saved === 'true') toggleNames.checked = true;
})();
