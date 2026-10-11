(() => {
  const key = 'phcodesage-analytics-optout', button = document.querySelector('#analytics-choice'), message = document.querySelector('#privacy-status');
  function update() {
    const browserOptOut = navigator.globalPrivacyControl || navigator.doNotTrack === '1' || window.doNotTrack === '1';
    try {
      const disabled = localStorage.getItem(key) === '1';
      button.setAttribute('aria-pressed', String(disabled));
      button.textContent = disabled ? 'Allow traffic analytics' : 'Turn off traffic analytics';
      message.textContent = browserOptOut ? 'Your browser’s privacy signal already disables tracking.' : disabled ? 'Traffic analytics are off in this browser.' : 'Traffic analytics are on in this browser.';
    } catch { button.disabled = true; message.textContent = 'Browser storage is unavailable. Use Global Privacy Control or Do Not Track to opt out.'; }
  }
  button.addEventListener('click', () => {
    try { if (localStorage.getItem(key) === '1') localStorage.removeItem(key); else localStorage.setItem(key, '1'); update(); } catch {}
  });
  update();
})();
