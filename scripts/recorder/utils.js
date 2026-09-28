/**
 * Video recording helper utilities for KPRIT CampusHub product demo
 */

async function injectCaption(page, chapterTitle, stepTitle) {
  await page.evaluate(({ chapter, step }) => {
    let bar = document.getElementById('institutional-caption-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'institutional-caption-bar';
      bar.style.position = 'fixed';
      bar.style.bottom = '24px';
      bar.style.left = '50%';
      bar.style.transform = 'translateX(-50%)';
      bar.style.background = 'rgba(15, 23, 42, 0.92)';
      bar.style.backdropFilter = 'blur(12px)';
      bar.style.webkitBackdropFilter = 'blur(12px)';
      bar.style.border = '1px solid rgba(255, 255, 255, 0.14)';
      bar.style.color = '#ffffff';
      bar.style.padding = '10px 24px';
      bar.style.borderRadius = '9999px';
      bar.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      bar.style.fontSize = '14px';
      bar.style.fontWeight = '500';
      bar.style.display = 'flex';
      bar.style.alignItems = 'center';
      bar.style.gap = '14px';
      bar.style.zIndex = '999999';
      bar.style.boxShadow = '0 12px 30px -4px rgba(0, 0, 0, 0.6)';
      bar.style.pointerEvents = 'none';
      bar.style.transition = 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
      document.body.appendChild(bar);
    }

    bar.innerHTML = `
      <span style="display:inline-block; width: 8px; height: 8px; border-radius: 50%; background: #38bdf8; box-shadow: 0 0 10px #38bdf8;"></span>
      <span style="color: #94a3b8; font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;">${chapter}</span>
      <span style="color: #475569; font-size: 14px;">|</span>
      <span style="color: #f8fafc; font-size: 14px; font-weight: 500;">${step}</span>
    `;
    bar.style.opacity = '1';
    bar.style.transform = 'translateX(-50%) translateY(0)';
  }, { chapter: chapterTitle, step: stepTitle });
}

async function hideCaption(page) {
  await page.evaluate(() => {
    const bar = document.getElementById('institutional-caption-bar');
    if (bar) {
      bar.style.opacity = '0';
      bar.style.transform = 'translateX(-50%) translateY(10px)';
    }
  });
}

async function smoothScroll(page, targetY, durationMs = 1200) {
  await page.evaluate(async ({ target, duration }) => {
    const start = window.scrollY;
    const distance = target - start;
    const startTime = performance.now();

    return new Promise(resolve => {
      function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // easeInOutQuad
        const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
        window.scrollTo(0, start + distance * ease);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  }, { target: targetY, duration: durationMs });
}

module.exports = {
  injectCaption,
  hideCaption,
  smoothScroll
};
