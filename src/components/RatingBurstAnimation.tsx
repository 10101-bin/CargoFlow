import { useEffect, useRef } from 'react';

interface RatingBurstAnimationProps {
  stars: number;        // 1–5 rating given
  onComplete: () => void;
}

export default function RatingBurstAnimation({ stars, onComplete }: RatingBurstAnimationProps) {
  const ranRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const nodes: HTMLElement[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];

    // ── Audio context
    let audioCtx: AudioContext | null = null;
    const unlockAudio = () => {
      try {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (!AC) return;
        if (!audioCtx) audioCtx = new AC();
        if (audioCtx.state === 'suspended') audioCtx.resume();
      } catch { audioCtx = null; }
    };
    unlockAudio();

    const playTone = (freq: number, type: OscillatorType, durationMs: number, delayMs = 0, vol = 0.14) => {
      timers.push(setTimeout(() => {
        try {
          unlockAudio();
          if (!audioCtx || audioCtx.state === 'closed') return;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = type;
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(vol, audioCtx.currentTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + durationMs / 1000);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(audioCtx.currentTime);
          osc.stop(audioCtx.currentTime + durationMs / 1000);
        } catch { }
      }, delayMs));
    };

    // Phase 1: ascending arpeggio (launch)
    [523.25, 659.25, 783.99, 987.77].forEach((f, i) => playTone(f, 'sine', 260, 80 + i * 75, 0.13));
    // Phase 2: crystal bell
    playTone(1318.51, 'sine', 550, 550, 0.17);
    playTone(1567.98, 'sine', 600, 600, 0.13);
    // Phase 3: one ping per star selected
    for (let i = 0; i < stars; i++) {
      playTone(1046.5 + i * 80, 'sine', 160, 900 + i * 120, 0.15);
    }
    // Phase 4: fanfare burst
    [1567.98, 1760, 1975.53, 2093, 2637.02].forEach((f, i) => {
      playTone(f, 'triangle', 420, 2400 + i * 55, 0.19);
      playTone(f * 1.5, 'sine', 320, 2430 + i * 55, 0.09);
    });

    // GPU keyframes
    const styleId = 'rating-burst-keyframes';
    if (!document.getElementById(styleId)) {
      const s = document.createElement('style');
      s.id = styleId;
      s.innerHTML = `@keyframes ratingSpin { from { transform:translate3d(-50%,-50%,0) scale(1.1) rotate(0deg); } to { transform:translate3d(-50%,-50%,0) scale(1.1) rotate(360deg); } }`;
      document.head.appendChild(s);
    }

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.5;

    // 1. White flash
    const flash = document.createElement('div');
    Object.assign(flash.style, {
      position: 'fixed', inset: '0', background: '#fff', opacity: '0',
      zIndex: '9995', pointerEvents: 'none', willChange: 'opacity',
      transition: 'opacity 140ms ease-out',
    });
    document.body.appendChild(flash); nodes.push(flash);
    requestAnimationFrame(() => { flash.style.opacity = '0.28'; });
    timers.push(setTimeout(() => { flash.style.transition = 'opacity 450ms ease-in'; flash.style.opacity = '0'; }, 140));

    // 2. Shockwave ring
    const ring = document.createElement('div');
    Object.assign(ring.style, {
      position: 'fixed', left: '0', top: '0', width: '12px', height: '12px',
      borderRadius: '50%', border: '3px solid #fbbf24', zIndex: '9996',
      transform: `translate3d(${cx}px,${cy}px,0) translate(-50%,-50%) scale(1)`,
      opacity: '0.9', willChange: 'transform,opacity',
      transition: 'transform 700ms ease-out, opacity 700ms ease-out',
    });
    document.body.appendChild(ring); nodes.push(ring);
    requestAnimationFrame(() => { ring.style.transform = `translate3d(${cx}px,${cy}px,0) translate(-50%,-50%) scale(14)`; ring.style.opacity = '0'; });
    timers.push(setTimeout(() => ring.remove(), 750));

    // 3. Sunburst halo
    const halo = document.createElement('div');
    Object.assign(halo.style, {
      position: 'fixed', left: '50%', top: `${cy}px`,
      width: '320px', height: '320px', zIndex: '9996', pointerEvents: 'none',
      transform: 'translate3d(-50%,-50%,0) scale(0.15)', opacity: '0', borderRadius: '50%',
      background: 'conic-gradient(from 0deg,rgba(251,191,36,.3) 0deg 18deg,transparent 18deg 36deg,rgba(251,191,36,.3) 36deg 54deg,transparent 54deg 72deg,rgba(251,191,36,.3) 72deg 90deg,transparent 90deg 108deg,rgba(251,191,36,.3) 108deg 126deg,transparent 126deg 144deg,rgba(251,191,36,.3) 144deg 162deg,transparent 162deg 180deg,rgba(251,191,36,.3) 180deg 198deg,transparent 198deg 216deg,rgba(251,191,36,.3) 216deg 234deg,transparent 234deg 252deg,rgba(251,191,36,.3) 252deg 270deg,transparent 270deg 288deg,rgba(251,191,36,.3) 288deg 306deg,transparent 306deg 324deg,rgba(251,191,36,.3) 324deg 342deg,transparent 342deg 360deg)',
      maskImage: 'radial-gradient(circle,#000 0%,transparent 68%)',
      WebkitMaskImage: 'radial-gradient(circle,#000 0%,transparent 68%)',
      willChange: 'transform,opacity',
      transition: 'transform 650ms cubic-bezier(.22,1.6,.4,1), opacity 450ms ease',
    });
    document.body.appendChild(halo); nodes.push(halo);
    requestAnimationFrame(() => { halo.style.opacity = '1'; halo.style.animation = 'ratingSpin 10s linear infinite'; });

    // 4. Star particles fan out
    const starsCount = Math.max(stars * 2, 6);
    for (let i = 0; i < starsCount; i++) {
      const angle = (Math.PI / (starsCount + 1)) * (i + 1) + Math.PI;
      const spreadX = cx + Math.cos(angle) * 75;
      const spreadY = cy + Math.sin(angle) * 45;

      const starEl = document.createElement('div');
      starEl.innerHTML = '★';
      Object.assign(starEl.style, {
        position: 'fixed', left: '0', top: '0', zIndex: '9999',
        color: '#fbbf24', fontSize: '28px', lineHeight: '1',
        textShadow: '0 0 10px rgba(251,191,36,.9),0 0 20px rgba(251,146,60,.7)',
        transform: `translate3d(${cx}px,${cy}px,0) translate(-50%,-50%) scale(0.15) rotate(0deg)`,
        opacity: '0', willChange: 'transform,opacity',
        WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden',
        transition: 'transform 900ms cubic-bezier(.22,1.6,.4,1), opacity 900ms ease',
      });
      document.body.appendChild(starEl); nodes.push(starEl);
      requestAnimationFrame(() => {
        starEl.style.transform = `translate3d(${spreadX}px,${spreadY}px,0) translate(-50%,-50%) scale(1.9) rotate(40deg)`;
        starEl.style.opacity = '1';
      });

      timers.push(setTimeout(() => {
        for (let s = 0; s < 2; s++) {
          const dot = document.createElement('div');
          const dx = spreadX + (Math.random() - 0.5) * 50;
          const dy = spreadY + (Math.random() - 0.5) * 50 - 8;
          Object.assign(dot.style, {
            position: 'fixed', left: '0', top: '0', width: '5px', height: '5px',
            borderRadius: '50%', background: s % 2 === 0 ? '#fde68a' : '#fb923c',
            zIndex: '9998', opacity: '1', boxShadow: '0 0 7px rgba(251,191,36,.9)',
            transform: `translate3d(${spreadX}px,${spreadY}px,0) translate(-50%,-50%) scale(1)`,
            willChange: 'transform,opacity',
            transition: 'transform 650ms ease-out,opacity 650ms ease-out',
          });
          document.body.appendChild(dot); nodes.push(dot);
          requestAnimationFrame(() => { dot.style.transform = `translate3d(${dx}px,${dy}px,0) translate(-50%,-50%) scale(0.1)`; dot.style.opacity = '0'; });
          timers.push(setTimeout(() => dot.remove(), 680));
        }
      }, 250 + i * 95));

      timers.push(setTimeout(() => {
        starEl.style.transform = `translate3d(${cx}px,${cy}px,0) translate(-50%,-50%) scale(0.3) rotate(540deg)`;
        starEl.style.opacity = '0.85';
      }, 750 + i * 95));

      timers.push(setTimeout(() => starEl.remove(), 1800 + i * 95));
    }

    // 5. Central badge
    const badge = document.createElement('div');
    Object.assign(badge.style, {
      position: 'fixed', left: '50%', top: `${cy}px`,
      width: '210px', height: '210px',
      zIndex: '100000', transform: 'translate3d(-50%,-50%,0) scale(0.15)', opacity: '0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none', willChange: 'transform,opacity',
      WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden',
      transition: 'transform 650ms cubic-bezier(.22,1.6,.4,1), opacity 450ms ease',
    });
    const badgeBg = document.createElement('div');
    Object.assign(badgeBg.style, {
      position: 'absolute', inset: '0',
      clipPath: 'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)',
      background: 'radial-gradient(circle,rgba(251,191,36,.92) 0%,rgba(245,158,11,.72) 100%)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      border: '2px solid rgba(255,255,255,.65)',
      boxShadow: '0 0 28px rgba(251,191,36,.9),inset 0 0 14px rgba(255,255,255,.4)',
      willChange: 'transform,opacity',
      transition: 'transform 550ms cubic-bezier(.22,1.6,.4,1), opacity 450ms ease',
    });
    badge.appendChild(badgeBg);
    const filledStars = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    const badgeLabel = document.createElement('div');
    badgeLabel.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;"><span style="font-size:20px;letter-spacing:3px;color:#fff;text-shadow:0 0 8px rgba(0,0,0,.7);">${filledStars}</span><span style="font-size:16px;font-weight:900;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.8);font-family:system-ui,-apple-system,sans-serif;">¡Gracias!</span><span style="font-size:10px;font-weight:800;color:#fef3c7;background:rgba(0,0,0,.25);padding:2px 10px;border-radius:9999px;letter-spacing:.8px;text-transform:uppercase;">Tu opinión importa</span></div>`;
    Object.assign(badgeLabel.style, { position: 'relative', zIndex: '2', textAlign: 'center', willChange: 'opacity', transition: 'opacity 350ms ease' });
    badge.appendChild(badgeLabel);
    document.body.appendChild(badge); nodes.push(badge);

    timers.push(setTimeout(() => { requestAnimationFrame(() => { badge.style.transform = 'translate3d(-50%,-50%,0) scale(1.18)'; badge.style.opacity = '1'; }); }, 500));
    timers.push(setTimeout(() => { badge.style.transform = 'translate3d(-50%,-50%,0) scale(1)'; }, 1100));

    // 6. Explode badge
    timers.push(setTimeout(() => {
      badgeBg.style.transition = 'transform 550ms ease-in, opacity 550ms ease-in';
      badgeBg.style.transform = 'scale(0) rotate(200deg)';
      badgeBg.style.opacity = '0';
      (badgeLabel as HTMLElement).style.opacity = '0';
      halo.style.transition = 'transform 550ms ease-in, opacity 550ms ease-in';
      halo.style.transform = 'translate3d(-50%,-50%,0) scale(0.08) rotate(300deg)';
      halo.style.opacity = '0';
      for (let p = 0; p < 5; p++) {
        const tipAngle = ((p * 72) - 90) * (Math.PI / 180);
        const sx = cx + Math.cos(tipAngle) * 42;
        const sy = cy + Math.sin(tipAngle) * 42;
        const tip = document.createElement('div');
        tip.innerHTML = '★';
        Object.assign(tip.style, {
          position: 'fixed', left: `${sx}px`, top: `${sy}px`,
          zIndex: '100001', color: '#fbbf24', fontSize: '36px', lineHeight: '1',
          textShadow: '0 0 14px rgba(251,191,36,1),0 0 28px rgba(251,146,60,1)',
          transform: 'translate3d(-50%,-50%,0) scale(1.3) rotate(0deg)', opacity: '1',
          willChange: 'transform,opacity',
          transition: 'transform 750ms cubic-bezier(.17,.89,.32,1.28),opacity 750ms ease-out',
        });
        document.body.appendChild(tip); nodes.push(tip);
        const ddx = Math.cos(tipAngle) * 140;
        const ddy = Math.sin(tipAngle) * 140;
        requestAnimationFrame(() => { tip.style.transform = `translate3d(calc(-50% + ${ddx}px),calc(-50% + ${ddy}px),0) scale(0.08) rotate(${360 + p * 72}deg)`; tip.style.opacity = '0'; });
        for (let sp = 0; sp < 3; sp++) {
          const sparkEl = document.createElement('div');
          Object.assign(sparkEl.style, {
            position: 'fixed', left: `${sx}px`, top: `${sy}px`,
            width: '6px', height: '6px', borderRadius: '50%',
            background: sp % 2 === 0 ? '#fff' : '#fb923c',
            zIndex: '100002', opacity: '1', boxShadow: '0 0 8px rgba(251,191,36,1)',
            willChange: 'transform,opacity', transition: 'transform 650ms ease-out,opacity 650ms ease-out',
          });
          document.body.appendChild(sparkEl); nodes.push(sparkEl);
          const sa = tipAngle + (Math.random() - 0.5) * 1.1;
          const sd = 60 + Math.random() * 60;
          requestAnimationFrame(() => { sparkEl.style.transform = `translate3d(${Math.cos(sa)*sd}px,${Math.sin(sa)*sd}px,0) scale(0.1)`; sparkEl.style.opacity = '0'; });
          timers.push(setTimeout(() => sparkEl.remove(), 700));
        }
        timers.push(setTimeout(() => tip.remove(), 800));
      }
    }, 2400));

    timers.push(setTimeout(() => badge.remove(), 3000));
    timers.push(setTimeout(() => { onCompleteRef.current(); }, 3200));

    return () => {
      timers.forEach(clearTimeout);
      nodes.forEach(n => { try { n.remove(); } catch { } });
      if (audioCtx && audioCtx.state !== 'closed') { try { audioCtx.close(); } catch { } }
    };
  }, [stars]);

  return null;
}
