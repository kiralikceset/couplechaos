/**
 * Plays only the first time the app is opened, on top of the first screen while it loads:
 * the dark native splash bursts into pink, the icon drops in, the name pops,
 * two little faces bump into each other. About two seconds; a tap skips it.
 */
import { useEffect, useState } from "react";

const TOTAL_MS = 2300;
const REDUCED_MS = 700;

function reducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

const HEART = "M80 135 C 20 95, 5 55, 35 30 C 55 14, 75 28, 80 48 C 85 28, 105 14, 125 30 C 155 55, 140 95, 80 135 Z";

const SEEN_KEY = "cc_intro_seen";

function alreadySeen() {
  try {
    if (localStorage.getItem(SEEN_KEY)) return true;
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* storage blocked: show it this time */
  }
  return false;
}

export default function LaunchIntro() {
  const [reduced] = useState(reducedMotion);
  const [seen] = useState(alreadySeen);
  const [leaving, setLeaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (seen) return;
    const leave = window.setTimeout(() => setLeaving(true), (reduced ? REDUCED_MS : TOTAL_MS) - 350);
    const end = window.setTimeout(() => setDone(true), reduced ? REDUCED_MS : TOTAL_MS);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(end);
    };
  }, [reduced, seen]);

  if (seen || done) return null;

  const skip = () => {
    setLeaving(true);
    window.setTimeout(() => setDone(true), 300);
  };

  return (
    <div
      className={`cci ${reduced ? "cci-reduced" : ""} ${leaving ? "cci-leave" : ""}`}
      onPointerDown={skip}
      role="presentation"
      aria-hidden
    >
      <style>{CSS}</style>
      <div className="cci-burst" />
      <svg className="cci-sparks" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" fill="none" strokeLinecap="round">
        <g stroke="#FBBF24" strokeWidth="4.5">
          <path pathLength={1} d="M112 262 l-24 -20 M104 302 l-34 0 M124 222 l-12 -30" />
          <path pathLength={1} d="M278 262 l24 -20 M286 302 l34 0 M266 222 l12 -30" />
        </g>
        <path className="cci-h1" pathLength={1} stroke="#fff" strokeWidth="9" transform="translate(46 610) scale(.34)" d={HEART} />
        <path className="cci-h2" pathLength={1} stroke="#FBBF24" strokeWidth="9" transform="translate(296 584) scale(.3)" d={HEART} />
      </svg>

      <div className="cci-stage">
        <img className="cci-icon" src="/images/app-icon.webp" alt="" draggable={false} />
        <div className="cci-name font-display">Couple Chaos</div>
        <div className="cci-faces">
          <div className="cci-face cci-a">
            <svg viewBox="0 0 230 230" fill="none" stroke="#FF1A6C" strokeWidth="12" strokeLinecap="round">
              <circle cx="85" cy="100" r="6" fill="#FF1A6C" />
              <circle cx="145" cy="100" r="6" fill="#FF1A6C" />
              <path d="M80 145 C 100 168, 130 168, 150 145" />
            </svg>
          </div>
          <div className="cci-face cci-b">
            <svg viewBox="0 0 230 230" fill="none" stroke="#FBBF24" strokeWidth="12" strokeLinecap="round">
              <path d="M70 100 C 80 88, 95 88, 105 100 M125 100 C 135 88, 150 88, 160 100" />
              <path d="M80 145 C 100 168, 130 168, 150 145" />
            </svg>
          </div>
          <svg className="cci-mini" viewBox="0 0 160 150" fill="none" stroke="#fff" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round">
            <path pathLength={1} d={HEART} />
          </svg>
        </div>
      </div>
    </div>
  );
}

const POP = "cubic-bezier(.3,1.5,.5,1)";

const CSS = `
.cci{position:fixed;inset:0;z-index:1000;background:#07060A;overflow:hidden;touch-action:none;
  transition:opacity .35s ease, transform .35s cubic-bezier(.5,0,.75,0)}
.cci-leave{opacity:0;transform:scale(1.06)}
.cci-burst{position:absolute;left:50%;top:44%;width:260vmax;height:260vmax;margin:-130vmax 0 0 -130vmax;border-radius:50%;
  background:radial-gradient(closest-side,#FF3B80 0%,#FF1A6C 45%,#C80F52 100%);transform:scale(0);
  animation:cci-burst .55s cubic-bezier(.6,0,.2,1) .05s forwards}
.cci-sparks{position:absolute;inset:0;width:100%;height:100%}
.cci-sparks path{stroke-dasharray:1;stroke-dashoffset:1;animation:cci-draw .35s cubic-bezier(.5,0,.3,1) forwards}
.cci-sparks g path{animation-delay:.86s}
.cci-h1{animation-delay:1.25s!important;animation-duration:.5s!important}
.cci-h2{animation-delay:1.4s!important;animation-duration:.5s!important}
.cci-stage{position:absolute;left:0;right:0;top:44%;transform:translateY(-58%);display:flex;flex-direction:column;align-items:center}
.cci-icon{width:min(34vw,148px);height:auto;border-radius:24%;box-shadow:0 22px 40px -16px rgba(80,0,30,.6);
  transform:translateY(-120vh) rotate(-30deg);
  animation:cci-drop .34s cubic-bezier(.5,0,.8,.4) .42s forwards, cci-squash .42s ${POP} .76s forwards, cci-bob 1.2s ease-in-out 1.2s infinite alternate}
.cci-name{margin-top:22px;font-size:clamp(34px,10.5vw,52px);font-weight:700;letter-spacing:-.04em;color:#fff;line-height:1;
  opacity:0;transform:scale(.5);animation:cci-pop .36s ${POP} .82s forwards}
.cci-faces{position:relative;margin-top:44px;width:calc(2 * min(26vw,110px) + 60px);height:min(26vw,110px)}
.cci-face{position:absolute;top:0;width:min(26vw,110px);height:min(26vw,110px);border-radius:50%;box-shadow:0 16px 26px -14px rgba(40,0,20,.55)}
.cci-face svg{width:100%;height:100%}
.cci-a{left:0;background:#fff;transform:translateX(-90vw) rotate(-70deg);animation:cci-in-a .42s cubic-bezier(.2,1.35,.4,1) 1.0s forwards}
.cci-b{right:0;background:#120E16;transform:translateX(90vw) rotate(70deg);animation:cci-in-b .42s cubic-bezier(.2,1.35,.4,1) 1.08s forwards}
.cci-mini{position:absolute;left:50%;top:32%;width:40px;margin-left:-20px;opacity:0;animation:cci-pop .3s ${POP} 1.48s forwards}
.cci-mini path{stroke-dasharray:1;stroke-dashoffset:1;animation:cci-draw .4s ease 1.5s forwards}
@keyframes cci-burst{to{transform:scale(1)}}
@keyframes cci-draw{to{stroke-dashoffset:0}}
@keyframes cci-drop{to{transform:translateY(0) rotate(-6deg)}}
@keyframes cci-squash{from{transform:rotate(-6deg) scale(1.18,.8)}to{transform:rotate(-6deg) scale(1)}}
@keyframes cci-bob{from{transform:rotate(-6deg)}to{transform:rotate(4deg) translateY(-8px)}}
@keyframes cci-pop{to{opacity:1;transform:none}}
@keyframes cci-in-a{0%{transform:translateX(-90vw) rotate(-70deg)}70%{transform:translateX(14%) rotate(8deg)}100%{transform:translateX(0) rotate(-6deg)}}
@keyframes cci-in-b{0%{transform:translateX(90vw) rotate(70deg)}70%{transform:translateX(-14%) rotate(-8deg)}100%{transform:translateX(0) rotate(6deg)}}
.cci-reduced *{animation-duration:.01s!important;animation-delay:0s!important}
.cci-reduced .cci-icon{animation:cci-drop .01s forwards}
`;
