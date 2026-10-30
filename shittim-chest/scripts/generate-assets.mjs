/**
 * SHITTIM CHEST —— V1 占位内容资产生成器
 *
 * 背景：真实资源需通过 Blue-Archive-Asset-Downloader / UnityPy / AssetRipper
 * 从国际服客户端提取（版权资产，不入库）。V1 使用本脚本程序化生成的
 * 原创占位素材（SVG 矢量 + 合成 WAV），目录结构与内容包规范保持一致，
 * 后续用提取产物按同名规范替换即可，业务代码零改动。
 *
 * 产物：public/content/packs/**（图像与音频）
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUB = join(ROOT, 'public', 'content', 'packs')

const P = {
  serenade: join(PUB, 'serenade-promenade'),
  summer: join(PUB, 'summer-skys-promise'),
}
const IMG = (base, sub) => join(base, 'assets', sub)
const AUD = (base, sub) => join(base, 'audio', sub)

for (const d of [
  IMG(P.serenade, 'bg'), IMG(P.serenade, 'char'), IMG(P.serenade, 'ui'),
  IMG(P.serenade, 'fx'), AUD(P.serenade, 'bgm'), AUD(P.serenade, 'sfx'), AUD(P.serenade, 'voice'),
  IMG(P.summer, 'bg'), IMG(P.summer, 'char'), IMG(P.summer, 'ui'),
]) mkdirSync(d, { recursive: true })

/* ---------------- SVG 工具 ---------------- */
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`

const save = (path, content) => { writeFileSync(path, content); console.log('  ✓', path.replace(ROOT + '/', '')) }
const saveSvg = (path, w, h, body) => save(path, svg(w, h, body))

/* ---------------- 角色占位立绘（参数化） ---------------- */
function chibiChar(o) {
  const {
    hair, hairShade, eyes, outfit, outfitShade, accent,
    expression = 'normal', veil = false, twinTails = false,
    shortBack = false, armor = false, id = 'char',
  } = o
  const skin = '#ffe8da', line = 'rgba(40,40,60,.25)'
  const eyePath = expression === 'smile'
    ? `<path d="M300 292 q22 -18 44 0" stroke="${eyes}" stroke-width="9" fill="none" stroke-linecap="round"/>
       <path d="M396 292 q22 -18 44 0" stroke="${eyes}" stroke-width="9" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="322" cy="295" rx="20" ry="26" fill="#fff"/><circle cx="322" cy="298" r="13" fill="${eyes}"/><circle cx="318" cy="292" r="5" fill="#fff"/>
       <ellipse cx="418" cy="295" rx="20" ry="26" fill="#fff"/><circle cx="418" cy="298" r="13" fill="${eyes}"/><circle cx="414" cy="292" r="5" fill="#fff"/>
       <path d="M300 262 q22 -12 44 -2" stroke="${hairShade}" stroke-width="10" fill="none" stroke-linecap="round"/>
       <path d="M396 260 q22 -10 44 2" stroke="${hairShade}" stroke-width="10" fill="none" stroke-linecap="round"/>`
  const mouth = expression === 'smile'
    ? `<path d="M348 352 q22 18 44 0" stroke="#d96a7c" stroke-width="7" fill="none" stroke-linecap="round"/>`
    : `<path d="M352 356 q18 8 36 0" stroke="#d96a7c" stroke-width="6" fill="none" stroke-linecap="round"/>`
  const tails = twinTails ? `
    <path d="M212 300 q-90 40 -70 190 q40 60 78 40 q-30 -120 20 -210z" fill="${hair}" stroke="${line}" stroke-width="3"/>
    <path d="M528 300 q90 40 70 190 q-40 60 -78 40 q30 -120 -20 -210z" fill="${hair}" stroke="${line}" stroke-width="3"/>
    <circle cx="208" cy="292" r="20" fill="${accent}"/><circle cx="532" cy="292" r="20" fill="${accent}"/>` : ''
  const backHair = shortBack
    ? `<path d="M232 250 q118 -120 236 0 q26 120 -10 180 l-216 0 q-36 -60 -10 -180z" fill="${hairShade}"/>`
    : `<path d="M228 260 q10 -150 122 -150 q112 0 122 150 q12 170 -8 260 q-50 34 -114 34 q-64 0 -114 -34 q-20 -90 -8 -260z" fill="${hairShade}"/>`
  const veilPath = veil ? `
    <path d="M226 250 q124 -60 248 0 l16 260 q-140 44 -280 0 z" fill="rgba(255,255,255,.35)" stroke="rgba(255,255,255,.6)" stroke-width="3"/>` : ''
  const armorPad = armor ? `
    <path d="M196 470 q-36 90 -6 150 q30 26 62 10 l-8 -150z" fill="#cfd8e6" stroke="#8fa1b8" stroke-width="4"/>
    <path d="M544 470 q36 90 6 150 q-30 26 -62 10 l8 -150z" fill="#cfd8e6" stroke="#8fa1b8" stroke-width="4"/>
    <circle cx="226" cy="520" r="10" fill="${accent}"/><circle cx="514" cy="520" r="10" fill="${accent}"/>` : ''
  return svg(700, 1000, `
  <defs>
    <linearGradient id="cloth" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${outfit}"/><stop offset="1" stop-color="${outfitShade}"/>
    </linearGradient>
  </defs>
  <ellipse cx="350" cy="965" rx="150" ry="24" fill="rgba(10,20,40,.28)"/>
  ${backHair}${tails}
  <path d="M270 440 l160 0 q54 90 50 250 l-10 250 l-240 0 l-10 -250 q-4 -160 50 -250z" fill="url(#cloth)" stroke="${line}" stroke-width="3"/>
  <path d="M340 445 l40 0 l-6 84 l-28 0 z" fill="rgba(255,255,255,.75)"/>
  <path d="M350 505 l-46 40 l46 52 l46 -52 z" fill="${accent}"/>
  <circle cx="350" cy="560" r="12" fill="${accent}"/>
  ${armorPad}
  <path d="M262 452 q88 40 176 0 l-12 -26 q-76 30 -152 0 z" fill="rgba(255,255,255,.85)"/>
  <rect x="330" y="392" width="80" height="46" rx="20" fill="${skin}"/>
  <circle cx="350" cy="300" r="140" fill="${skin}"/>
  <path d="M216 268 q36 -128 134 -128 q98 0 134 128 q-20 66 -34 74 q6 -96 -100 -104 q-106 8 -100 104 q-14 -8 -34 -74z" fill="${hair}"/>
  <path d="M224 300 q-24 90 6 150 q26 12 40 -6 q-30 -60 -14 -140z" fill="${hair}"/>
  <path d="M476 300 q24 90 -6 150 q-26 12 -40 -6 q30 -60 14 -140z" fill="${hair}"/>
  ${veilPath}
  ${eyePath}${mouth}
  <ellipse cx="286" cy="336" rx="16" ry="8" fill="rgba(255,150,160,.5)"/>
  <ellipse cx="454" cy="336" rx="16" ry="8" fill="rgba(255,150,160,.5)"/>
  <g transform="rotate(-6 350 130)">
    <ellipse cx="350" cy="130" rx="92" ry="30" fill="none" stroke="${accent}" stroke-width="10" opacity=".95"/>
    <ellipse cx="350" cy="130" rx="92" ry="30" fill="none" stroke="rgba(255,255,255,.65)" stroke-width="3"/>
  </g>
  <!-- ${id} -->
`)
}

/* ---------------- 背景 ---------------- */
function bgCarnival() {
  return svg(1920, 1080, `
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8fd0ff"/><stop offset=".65" stop-color="#cfeaff"/><stop offset="1" stop-color="#f6f9ff"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#sky)"/>
  <circle cx="1650" cy="180" r="90" fill="#fff7cf" opacity=".9"/>
  ${Array.from({ length: 14 }, (_, i) => `<circle cx="${(i * 137) % 1920}" cy="${60 + (i * 83) % 300}" r="${8 + (i % 3) * 4}" fill="#fff" opacity=".5"/>`).join('')}
  <path d="M0 780 L1920 720 L1920 1080 L0 1080 Z" fill="#e8eef8"/>
  <path d="M0 820 L1920 760 L1920 1080 L0 1080 Z" fill="#d8e2f2"/>
  ${Array.from({ length: 6 }, (_, i) => {
    const x = 120 + i * 320
    return `<g><rect x="${x}" y="${520 + (i % 2) * 30}" width="220" height="260" fill="#ffffff" stroke="#b8c8e0" stroke-width="6" rx="10"/>
    <path d="M${x - 20} ${540 + (i % 2) * 30} l130 -80 l130 80 z" fill="#f0f4fb" stroke="#b8c8e0" stroke-width="6"/>
    <rect x="${x + 70}" y="${640 + (i % 2) * 30}" width="80" height="140" fill="#aac8ee"/></g>`
  }).join('')}
  ${Array.from({ length: 5 }, (_, i) => `<path d="M${200 + i * 380} 300 l34 70 l76 10 l-56 52 l14 76 l-68 -38 l-68 38 l14 -76 l-56 -52 l76 -10 z" fill="#ffd257" opacity=".85"/>`).join('')}
  <g>${Array.from({ length: 7 }, (_, i) => `<rect x="${140 + i * 260}" y="0" width="16" height="1080" fill="#9db4d8" opacity=".4"/>`).join('')}</g>
  <rect y="980" width="1920" height="100" fill="#c2d2ea"/>`)
}

function bgStage() {
  return svg(1920, 1080, `
  <defs>
    <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2b2a5e"/><stop offset=".55" stop-color="#7a5fa0"/><stop offset="1" stop-color="#f2a6a0"/>
    </linearGradient>
    <radialGradient id="spot" cx=".5" cy="0" r="1">
      <stop offset="0" stop-color="rgba(255,255,220,.9)"/><stop offset="1" stop-color="rgba(255,255,220,0)"/>
    </radialGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#dusk)"/>
  <circle cx="320" cy="200" r="60" fill="#fff3c8" opacity=".95"/>
  ${Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 271) % 1920}" cy="${(i * 97) % 380}" r="3" fill="#fff" opacity="${0.4 + (i % 4) * 0.15}"/>`).join('')}
  <path d="M240 260 L960 80 L1680 260 L1680 640 L240 640 Z" fill="#1d1d40" opacity=".9"/>
  <rect x="480" y="330" width="960" height="270" fill="#0e1030" stroke="#4a4a8a" stroke-width="10"/>
  <rect x="480" y="330" width="960" height="270" fill="rgba(90,140,255,.25)"/>
  ${Array.from({ length: 3 }, (_, i) => `<path d="M${560 + i * 400} 330 L${470 + i * 400} 600 L${650 + i * 400} 600 Z" fill="url(#spot)" opacity=".8"/>`).join('')}
  <rect x="240" y="640" width="1440" height="80" fill="#32325e" stroke="#4a4a8a" stroke-width="6"/>
  ${Array.from({ length: 9 }, (_, i) => `<circle cx="${340 + i * 155}" cy="640" r="14" fill="#ffe98f"/>`).join('')}
  ${Array.from({ length: 8 }, (_, i) => `<ellipse cx="${150 + i * 235}" cy="1010" rx="90" ry="120" fill="#141430" opacity=".85"/>`).join('')}
  ${Array.from({ length: 6 }, (_, i) => `<rect x="${250 + i * 280}" y="880" width="14" height="70" fill="#ffd257" opacity=".9" transform="rotate(${i % 2 ? 14 : -14} ${257 + i * 280} 915)"/>`).join('')}`)
}

function bgChurch() {
  return svg(1920, 1080, `
  <defs><linearGradient id="cw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f66"/><stop offset="1" stop-color="#20233e"/></linearGradient></defs>
  <rect width="1920" height="1080" fill="url(#cw)"/>
  ${Array.from({ length: 4 }, (_, i) => {
    const x = 210 + i * 420
    return `<g><path d="M${x} 820 L${x} 380 Q${x + 110} 240 ${x + 220} 380 L${x + 220} 820 Z" fill="#2a2e52" stroke="#c9b47a" stroke-width="8"/>
    <path d="M${x + 40} 760 L${x + 40} 420 Q${x + 110} 320 ${x + 180} 420 L${x + 180} 760 Z" fill="#5a7ac6" opacity=".55"/>
    <path d="M${x + 60} 700 L${x + 160} 480 M${x + 60} 480 L${x + 160} 700" stroke="#cfe0ff" stroke-width="8" opacity=".5"/></g>`
  }).join('')}
  ${Array.from({ length: 6 }, (_, i) => `<g><rect x="${150 + i * 320}" y="840" width="26" height="200" fill="#c9b47a"/><ellipse cx="${163 + i * 320}" cy="820" rx="26" ry="16" fill="#ffdf8f"/></g>`).join('')}
  <path d="M0 1040 L1920 1040 L1920 1080 L0 1080 Z" fill="#c9b47a" opacity=".7"/>
  <rect y="900" width="1920" height="180" fill="#575c8a"/>`)
}

function bgStreetNight() {
  return svg(1920, 1080, `
  <defs><linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1230"/><stop offset=".7" stop-color="#1d2a55"/><stop offset="1" stop-color="#2c3f74"/></linearGradient></defs>
  <rect width="1920" height="1080" fill="url(#n)"/>
  ${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 197) % 1920}" cy="${(i * 131) % 460}" r="${2 + (i % 3)}" fill="#dfe9ff" opacity="${0.3 + (i % 5) * 0.14}"/>`).join('')}
  <circle cx="1560" cy="180" r="70" fill="#f4f7ff"/><circle cx="1532" cy="164" r="62" fill="#1d2a55" opacity=".35"/>
  <path d="M0 760 L700 730 L760 1080 L0 1080 Z" fill="#16204a"/>
  <path d="M760 700 L1300 680 L1360 1080 L700 1080 Z" fill="#101838"/>
  ${Array.from({ length: 5 }, (_, i) => `<rect x="${880 + i * 190}" y="${560 - (i % 2) * 40}" width="120" height="200" fill="#ffd98f" opacity=".75"/>`).join('')}
  ${Array.from({ length: 3 }, (_, i) => `<g><rect x="${240 + i * 620}" y="420" width="16" height="420" fill="#0a0f24"/><ellipse cx="${248 + i * 620}" cy="412" rx="46" ry="18" fill="#ffe9a8"/><ellipse cx="${248 + i * 620}" cy="430" rx="90" ry="26" fill="rgba(255,233,168,.25)"/></g>`).join('')}
  <path d="M0 840 L1920 800 L1920 1080 L0 1080 Z" fill="#22305e"/>
  <ellipse cx="960" cy="980" rx="820" ry="90" fill="rgba(120,160,255,.12)"/>`)
}

function bgClassroom() {
  return svg(1920, 1080, `
  <rect width="1920" height="1080" fill="#eef3ea"/>
  <rect y="0" width="1920" height="620" fill="#e2ecdd"/>
  <rect y="620" width="1920" height="460" fill="#cdd9c5"/>
  ${Array.from({ length: 3 }, (_, i) => `<g><rect x="${180 + i * 600}" y="140" width="420" height="360" rx="14" fill="#9fc4e8" stroke="#ffffff" stroke-width="16"/><path d="M${180 + i * 600} 320 L${600 + i * 600} 320 M${390 + i * 600} 140 L${390 + i * 600} 500" stroke="#ffffff" stroke-width="14"/></g>`).join('')}
  <rect y="560" width="1920" height="60" fill="#8fae86"/>
  ${Array.from({ length: 4 }, (_, i) => `<g><rect x="${160 + i * 440}" y="720" width="320" height="26" rx="8" fill="#b98d5e"/><rect x="${260 + i * 440}" y="746" width="120" height="180" fill="#9a764e"/></g>`).join('')}
  <rect x="1460" y="300" width="330" height="240" rx="10" fill="#2f4a35" opacity=".85"/>
  <rect x="1490" y="330" width="270" height="30" rx="6" fill="#eef3ea" opacity=".85"/>`)
}

function bgLobby() {
  return svg(1920, 1080, `
  <defs><linearGradient id="warm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3d63"/><stop offset="1" stop-color="#2c2545"/></linearGradient></defs>
  <rect width="1920" height="1080" fill="url(#warm)"/>
  <rect x="1150" y="160" width="520" height="560" rx="18" fill="#7fb2e8" opacity=".85"/>
  <path d="M1150 160 L1670 160 L1670 720 L1150 720 Z" fill="none" stroke="#e8dcc0" stroke-width="16"/>
  <circle cx="1420" cy="330" r="60" fill="#fff3c8"/>
  <path d="M1130 150 L1100 740 M1690 150 L1720 740" stroke="#e8dcc0" stroke-width="26" stroke-linecap="round"/>
  <path d="M1120 150 q-40 300 10 590 l-90 0 q-40 -300 0 -590 z" fill="#b85a7a" opacity=".8"/>
  <path d="M1700 150 q40 300 -10 590 l90 0 q40 -300 0 -590 z" fill="#b85a7a" opacity=".8"/>
  <rect y="760" width="1920" height="320" fill="#3a3155"/>
  <rect x="220" y="820" width="640" height="200" rx="16" fill="#5d4a78" stroke="#8f7ab0" stroke-width="8"/>
  <rect x="300" y="760" width="480" height="80" rx="20" fill="#6d5a8a"/>
  ${Array.from({ length: 5 }, (_, i) => `<circle cx="${1300 + i * 90}" cy="${800 + (i % 2) * 40}" r="26" fill="#ffd257" opacity=".8"/>`).join('')}`)
}

function bgBattle() {
  return svg(1920, 1080, `
  <defs><radialGradient id="arena" cx=".5" cy=".62" r=".75"><stop offset="0" stop-color="#46528e"/><stop offset="1" stop-color="#141a3a"/></radialGradient></defs>
  <rect width="1920" height="1080" fill="#0d1230"/>
  ${Array.from({ length: 5 }, (_, i) => `<path d="M${760 + i * 100} 0 L${700 + i * 100} 360" stroke="rgba(120,200,255,${0.5 - i * 0.07})" stroke-width="8"/>`).join('')}
  <ellipse cx="960" cy="670" rx="760" ry="330" fill="url(#arena)"/>
  <ellipse cx="960" cy="670" rx="760" ry="330" fill="none" stroke="#6f86d6" stroke-width="6" opacity=".6"/>
  <ellipse cx="960" cy="670" rx="560" ry="240" fill="none" stroke="#8fa8ff" stroke-width="4" opacity=".35"/>
  ${Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2
    return `<text x="${960 + Math.cos(a) * 700}" y="${670 + Math.sin(a) * 300}" font-size="46" fill="#8fa8ff" opacity=".55" text-anchor="middle" font-family="serif">${i % 2 ? '♪' : '♫'}</text>`
  }).join('')}`)
}

function bgMenu() {
  return svg(1920, 1080, `
  <defs>
    <linearGradient id="mbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0d1b3a"/><stop offset=".55" stop-color="#12305e"/><stop offset="1" stop-color="#0d1b3a"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#mbg)"/>
  ${Array.from({ length: 12 }, (_, i) => `<path d="M${i * 170 - 200} 1080 L${i * 170 + 140} 0" stroke="rgba(90,150,230,.10)" stroke-width="90"/>`).join('')}
  <circle cx="1520" cy="300" r="260" fill="none" stroke="rgba(79,195,255,.35)" stroke-width="3"/>
  <circle cx="1520" cy="300" r="200" fill="none" stroke="rgba(79,195,255,.25)" stroke-width="2"/>
  <circle cx="1520" cy="300" r="90" fill="rgba(79,195,255,.12)"/>
  <path d="M380 760 l34 70 l76 10 l-56 52 l14 76 l-68 -38 l-68 38 l14 -76 l-56 -52 l76 -10 z" fill="rgba(255,210,87,.5)"/>
  <text x="120" y="180" font-size="44" fill="#4fc3ff" opacity=".35" font-family="serif">♪ ♫ ♪</text>
  <rect y="1040" width="1920" height="40" fill="rgba(79,195,255,.18)"/>`)
}

function cgStageFireworks() {
  return svg(1600, 900, `
  <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1c48"/><stop offset="1" stop-color="#5a3f78"/></linearGradient></defs>
  <rect width="1600" height="900" fill="url(#cg)"/>
  ${Array.from({ length: 3 }, (_, i) => {
    const cx = 300 + i * 480, cy = 180 + (i % 2) * 90
    return Array.from({ length: 12 }, (_, j) => {
      const a = (j / 12) * Math.PI * 2
      return `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(a) * 110}" y2="${cy + Math.sin(a) * 110}" stroke="${['#ffd257', '#ff8fb0', '#8fd0ff'][i]}" stroke-width="8" stroke-linecap="round" opacity=".9"/>`
    }).join('')
  }).join('')}
  <path d="M0 640 L1600 600 L1600 900 L0 900 Z" fill="#241d3f"/>
  <rect x="420" y="420" width="760" height="220" fill="#101028" stroke="#7a6ab0" stroke-width="8"/>
  ${Array.from({ length: 5 }, (_, i) => `<path d="M${480 + i * 160} 420 L${430 + i * 160} 640 L${560 + i * 160} 640 Z" fill="rgba(255,240,200,.35)"/>`).join('')}
  ${Array.from({ length: 40 }, (_, i) => `<rect x="${(i * 173) % 1600}" y="${(i * 97) % 400}" width="10" height="10" fill="${['#ffd257', '#ff8fb0', '#8fd0ff'][i % 3]}" opacity=".8" transform="rotate(45 ${(i * 173) % 1600} ${(i * 97) % 400})"/>`).join('')}`)
}

/* ---------------- UI / 图标 / 敌人 ---------------- */
const bannerSerenade = svg(1200, 360, `
  <defs><linearGradient id="bn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#24407e"/><stop offset="1" stop-color="#4a6ac0"/></linearGradient></defs>
  <rect width="1200" height="360" rx="18" fill="url(#bn)"/>
  <circle cx="1010" cy="110" r="70" fill="#f4ecb8" opacity=".9"/>
  ${Array.from({ length: 26 }, (_, i) => `<circle cx="${(i * 149) % 1200}" cy="${(i * 83) % 360}" r="${2 + (i % 3) * 1.5}" fill="#fff" opacity=".7"/>`).join('')}
  <text x="70" y="150" font-size="58" fill="#ffffff" font-weight="bold" font-family="sans-serif">先将她们的小夜曲</text>
  <text x="70" y="215" font-size="30" fill="#bcd2ff" font-family="sans-serif">Serenade Promenade · 活动剧情复刻</text>
  <text x="70" y="300" font-size="46" fill="#8fd0ff" font-family="serif">♪ ♫ ♬</text>
  <path d="M905 210 l-16 74 q-2 16 12 22 q16 6 24 -8 q6 -12 -4 -22 l22 -70 z" fill="#ffd257"/>
  <rect x="902" y="150" width="12" height="80" fill="#ffd257"/><circle cx="908" cy="150" r="14" fill="none" stroke="#ffd257" stroke-width="8"/>`)

const bannerSummer = svg(1200, 360, `
  <defs><linearGradient id="bs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f9fd8"/><stop offset="1" stop-color="#7fd4e8"/></linearGradient></defs>
  <rect width="1200" height="360" rx="18" fill="url(#bs)"/>
  <circle cx="220" cy="120" r="70" fill="#fff3b8"/>
  <path d="M0 260 Q300 200 600 260 T1200 260 L1200 360 L0 360 Z" fill="#2f7fb8" opacity=".85"/>
  <text x="70" y="150" font-size="54" fill="#ffffff" font-weight="bold" font-family="sans-serif">夏日天空的约定</text>
  <text x="70" y="215" font-size="28" fill="#dff4ff" font-family="sans-serif">Summer Sky's Promise · 补档（recap）</text>`)

const logoShittim = svg(980, 300, `
  <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4fc3ff"/><stop offset="1" stop-color="#a78bfa"/></linearGradient></defs>
  <g transform="translate(60 40)">
    <path d="M90 20 L160 55 L160 150 L90 185 L20 150 L20 55 Z" fill="#101d3a" stroke="url(#lg)" stroke-width="8"/>
    <path d="M55 95 L90 115 L125 90 M90 115 L90 160" stroke="#4fc3ff" stroke-width="9" fill="none" stroke-linecap="round"/>
    <circle cx="90" cy="70" r="12" fill="#ffd257"/>
  </g>
  <text x="260" y="150" font-size="86" font-weight="bold" fill="url(#lg)" font-family="sans-serif" letter-spacing="6">SHITTIM CHEST</text>
  <text x="262" y="215" font-size="34" fill="#9fb6dd" font-family="sans-serif" letter-spacing="10">BLUE ARCHIVE STORY &amp; EVENT REVIVAL</text>`)

function avatar(hair, eyes, halo, extra = '') {
  return svg(200, 200, `
  <rect width="200" height="200" rx="100" fill="#16233f"/>
  <circle cx="100" cy="118" r="62" fill="#ffe8da"/>
  <path d="M42 112 q10 -78 58 -78 q48 0 58 78 q-8 34 -16 40 q4 -52 -42 -58 q-46 6 -42 58 q-8 -6 -16 -40z" fill="${hair}"/>
  <ellipse cx="76" cy="118" rx="11" ry="15" fill="#fff"/><circle cx="76" cy="120" r="7" fill="${eyes}"/>
  <ellipse cx="124" cy="118" rx="11" ry="15" fill="#fff"/><circle cx="124" cy="120" r="7" fill="${eyes}"/>
  <path d="M86 148 q14 10 28 0" stroke="#d96a7c" stroke-width="5" fill="none" stroke-linecap="round"/>
  ${extra}
  <ellipse cx="100" cy="38" rx="52" ry="15" fill="none" stroke="${halo}" stroke-width="7"/>`)
}

const enemyNoise = svg(300, 300, `
  <ellipse cx="150" cy="170" rx="105" ry="95" fill="#7a4fa0"/>
  <path d="M60 130 q20 -70 90 -78 q70 8 90 78 q-40 -30 -90 -28 q-50 -2 -90 28z" fill="#5a3a7a"/>
  <circle cx="115" cy="160" r="17" fill="#fff"/><circle cx="115" cy="164" r="8" fill="#201030"/>
  <circle cx="185" cy="160" r="17" fill="#fff"/><circle cx="185" cy="164" r="8" fill="#201030"/>
  <path d="M118 210 q32 -22 64 0" stroke="#201030" stroke-width="8" fill="none"/>
  <text x="200" y="90" font-size="44" fill="#d0a8ff" font-family="serif" transform="rotate(24 200 90)">♪</text>`)

const enemyDiva = svg(360, 460, `
  <path d="M180 40 q100 40 96 180 q-4 140 -96 200 q-92 -60 -96 -200 q-4 -140 96 -180z" fill="#b04f86"/>
  <circle cx="142" cy="200" r="20" fill="#fff"/><circle cx="142" cy="204" r="10" fill="#2a1030"/>
  <circle cx="218" cy="200" r="20" fill="#fff"/><circle cx="218" cy="204" r="10" fill="#2a1030"/>
  <ellipse cx="180" cy="262" rx="26" ry="34" fill="#2a1030"/>
  <rect x="252" y="150" width="14" height="120" fill="#e8e8f8"/><circle cx="259" cy="140" r="26" fill="#cfcfe8"/><circle cx="259" cy="140" r="16" fill="#2a1030"/>
  <text x="60" y="120" font-size="40" fill="#ffd0ea" font-family="serif" transform="rotate(-20 60 120)">♬</text>`)

const bossAncoff = svg(520, 620, `
  <ellipse cx="260" cy="350" rx="200" ry="240" fill="#2c3a7a"/>
  <path d="M110 210 q60 -120 150 -126 q90 6 150 126 q-70 -50 -150 -46 q-80 -4 -150 46z" fill="#1d264f"/>
  <circle cx="190" cy="300" r="30" fill="#fff"/><circle cx="190" cy="306" r="14" fill="#101838"/>
  <circle cx="330" cy="300" r="30" fill="#fff"/><circle cx="330" cy="306" r="14" fill="#101838"/>
  <path d="M196 400 q64 44 128 0" stroke="#101838" stroke-width="14" fill="none"/>
  <rect x="30" y="330" width="70" height="120" rx="14" fill="#141a3a" stroke="#4a5aa0" stroke-width="6"/>
  <rect x="420" y="330" width="70" height="120" rx="14" fill="#141a3a" stroke="#4a5aa0" stroke-width="6"/>
  <circle cx="65" cy="360" r="10" fill="#ffd257"/><circle cx="90" cy="390" r="10" fill="#ff8fb0"/>
  <circle cx="455" cy="360" r="10" fill="#8fd0ff"/><circle cx="430" cy="390" r="10" fill="#ffd257"/>
  <text x="228" y="120" font-size="64" fill="#9fb0ff" font-family="serif">𝄞</text>`)

const heartParticle = svg(64, 64, `<path d="M32 54 C10 38 6 22 16 14 C24 8 32 14 32 22 C32 14 40 8 48 14 C58 22 54 38 32 54 Z" fill="#ff8fb0"/>`)
const noteParticle = svg(64, 64, `<g fill="#4fc3ff"><ellipse cx="24" cy="48" rx="12" ry="9"/><rect x="33" y="12" width="5" height="36"/><path d="M38 12 q16 6 14 20 q-4 -10 -14 -12 z"/></g>`)
const momoIcon = svg(96, 96, `<rect width="96" height="96" rx="24" fill="#ffb0c8"/><path d="M24 34 q0 -12 12 -12 h24 q12 0 12 12 v16 q0 12 -12 12 h-16 l-14 12 v-12 q-6 0 -6 -12 z" fill="#fff"/><circle cx="42" cy="42" r="3.5" fill="#ffb0c8"/><circle cx="54" cy="42" r="3.5" fill="#ffb0c8"/><circle cx="66" cy="42" r="3.5" fill="#ffb0c8"/>`)

/* ---------------- 输出全部图像 ---------------- */
console.log('[assets] 写入 SVG …')
const S = P.serenade
saveSvg(IMG(S, 'bg/bg_trinity_carnival.svg'), 1920, 1080, bgCarnival().replace(/^<svg[^>]*>|<\/svg>$/g, ''))
;(() => { const b = bgCarnival(); saveSvg(IMG(S, 'bg/bg_trinity_carnival.svg'), 1920, 1080, b.slice(b.indexOf('>') + 1, -6)) })()
;(() => { const b = bgStage(); saveSvg(IMG(S, 'bg/bg_trinity_stage.svg'), 1920, 1080, b.slice(b.indexOf('>') + 1, -6)) })()
;(() => { const b = bgChurch(); saveSvg(IMG(S, 'bg/bg_church_hall.svg'), 1920, 1080, b.slice(b.indexOf('>') + 1, -6)) })()
;(() => { const b = bgStreetNight(); saveSvg(IMG(S, 'bg/bg_school_street_night.svg'), 1920, 1080, b.slice(b.indexOf('>') + 1, -6)) })()
;(() => { const b = bgBattle(); saveSvg(IMG(S, 'bg/bg_battle_stage.svg'), 1920, 1080, b.slice(b.indexOf('>') + 1, -6)) })()
;(() => { const b = cgStageFireworks(); saveSvg(IMG(S, 'ui/cg_carnival_stage.svg'), 1600, 900, b.slice(b.indexOf('>') + 1, -6)) })()
save(IMG(S, 'ui/banner_serenade.svg'), bannerSerenade)
save(IMG(S, 'ui/enemy_noise.svg'), enemyNoise)
save(IMG(S, 'ui/enemy_diva.svg'), enemyDiva)
save(IMG(S, 'ui/boss_ancoff.svg'), bossAncoff)
save(IMG(S, 'fx/heart_particle.svg'), heartParticle)
save(IMG(S, 'fx/note_particle.svg'), noteParticle)

// 角色（普通/微笑两种表情）
save(IMG(S, 'char/char_mari_normal.svg'), chibiChar({ id: 'mari', hair: '#e8ecf4', hairShade: '#c9d2e2', eyes: '#3f7fd6', outfit: '#f4f0ff', outfitShade: '#d8d4f0', accent: '#7fb8ff', veil: true, expression: 'normal' }))
save(IMG(S, 'char/char_mari_smile.svg'), chibiChar({ id: 'mari-smile', hair: '#e8ecf4', hairShade: '#c9d2e2', eyes: '#3f7fd6', outfit: '#f4f0ff', outfitShade: '#d8d4f0', accent: '#7fb8ff', veil: true, expression: 'smile' }))
save(IMG(S, 'char/char_sakurako_normal.svg'), chibiChar({ id: 'sakurako', hair: '#d8d0f0', hairShade: '#b8aede', eyes: '#c04858', outfit: '#fafafa', outfitShade: '#e0e0ea', accent: '#c04858', expression: 'normal' }))
save(IMG(S, 'char/char_sakurako_smile.svg'), chibiChar({ id: 'sakurako-smile', hair: '#d8d0f0', hairShade: '#b8aede', eyes: '#c04858', outfit: '#fafafa', outfitShade: '#e0e0ea', accent: '#c04858', expression: 'smile' }))
save(IMG(S, 'char/char_mine_normal.svg'), chibiChar({ id: 'mine', hair: '#cfd8e6', hairShade: '#a8b8cc', eyes: '#d8a03f', outfit: '#e8edf4', outfitShade: '#c2cede', accent: '#e0b055', armor: true, expression: 'normal' }))
save(IMG(S, 'char/char_mine_smile.svg'), chibiChar({ id: 'mine-smile', hair: '#cfd8e6', hairShade: '#a8b8cc', eyes: '#d8a03f', outfit: '#e8edf4', outfitShade: '#c2cede', accent: '#e0b055', armor: true, expression: 'smile' }))
save(IMG(S, 'char/char_sensei.svg'), svg(700, 1000, `
  <ellipse cx="350" cy="965" rx="140" ry="22" fill="rgba(10,20,40,.3)"/>
  <path d="M262 460 q88 -36 176 0 l40 300 q-128 60 -256 0 z" fill="#2a3348"/>
  <path d="M340 470 l20 220 l20 -220 l-20 -18 z" fill="#e8f0f8"/>
  <path d="M350 500 l-38 34 l38 46 l38 -46 z" fill="#4fc3ff"/>
  <circle cx="350" cy="320" r="120" fill="#3a4258"/>
  <rect x="322" y="428" width="56" height="40" rx="16" fill="#2a3348"/>
  <rect x="290" y="200" width="120" height="26" rx="12" fill="#3a4258"/>`))
save(IMG(S, 'char/char_generic_summer.svg'), chibiChar({ id: 'summer', hair: '#c89060', hairShade: '#a8744a', eyes: '#4a9a6a', outfit: '#f4f8ff', outfitShade: '#d0dcf0', accent: '#4fc3ff', twinTails: true, expression: 'normal' }))
save(IMG(S, 'char/avatar_mari.svg'), avatar('#e8ecf4', '#3f7fd6', '#ffd257', '<path d="M40 130 q60 26 120 0 l0 70 l-120 0 z" fill="#f4f0ff"/>'))
save(IMG(S, 'char/avatar_sakurako.svg'), avatar('#d8d0f0', '#c04858', '#c04858', '<path d="M40 130 q60 26 120 0 l0 70 l-120 0 z" fill="#fafafa"/>'))
save(IMG(S, 'char/avatar_mine.svg'), avatar('#cfd8e6', '#d8a03f', '#e0b055', '<path d="M40 130 q60 26 120 0 l0 70 l-120 0 z" fill="#e8edf4"/>'))
save(IMG(S, 'char/avatar_sensei.svg'), svg(200, 200, `
  <rect width="200" height="200" rx="100" fill="#22304f"/>
  <circle cx="100" cy="115" r="58" fill="#3a4258"/>
  <rect x="76" y="164" width="48" height="36" fill="#2a3348"/>
  <path d="M92 176 l8 20 l8 -20" stroke="#4fc3ff" stroke-width="5" fill="none"/>`))

// 菜单与大厅（common 包放 serenade 包内 ui 目录）
save(IMG(S, 'ui/bg_menu.svg'), (() => { const b = bgMenu(); return svg(1920, 1080, b.slice(b.indexOf('>') + 1, -6)) })())
save(IMG(S, 'ui/bg_lobby_room.svg'), (() => { const b = bgLobby(); return svg(1920, 1080, b.slice(b.indexOf('>') + 1, -6)) })())
save(IMG(S, 'ui/logo_shittim.svg'), logoShittim)
save(IMG(S, 'ui/momo_icon.svg'), momoIcon)

// recap 演示包（夏日天空的约定）
const R = P.summer
save(IMG(R, 'bg/bg_classroom.svg'), (() => { const b = bgClassroom(); return svg(1920, 1080, b.slice(b.indexOf('>') + 1, -6)) })())
save(IMG(R, 'char/char_generic_summer.svg'), chibiChar({ id: 'summer', hair: '#c89060', hairShade: '#a8744a', eyes: '#4a9a6a', outfit: '#f4f8ff', outfitShade: '#d0dcf0', accent: '#4fc3ff', twinTails: true, expression: 'normal' }))
save(IMG(R, 'ui/banner_summer.svg'), bannerSummer)
save(IMG(R, 'ui/avatar_summer.svg'), avatar('#c89060', '#4a9a6a', '#4fc3ff'))

/* ---------------- WAV 合成 ---------------- */
const SR = 22050
function synthWav(path, samples) {
  const n = samples.length
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8)
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34)
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]))
    buf.writeInt16LE((v * 32767) | 0, 44 + i * 2)
  }
  save(path, '')
  writeFileSync(path, buf)
}
const env = (t, dur, a = 0.01, r = 0.3) => {
  if (t < a) return t / a
  if (t > dur - r) return Math.max(0, (dur - t) / r)
  return 1
}
const tone = (freq, dur, vol = 0.3, partial2 = 0.25) => (t) =>
  (Math.sin(2 * Math.PI * freq * t) + partial2 * Math.sin(4 * Math.PI * freq * t)) * vol * env(t, dur)
function vibratoTone(f0, f1, dur, vol = 0.22) {
  return (t) => {
    const f = f0 + (f1 - f0) * (t / dur) + Math.sin(2 * Math.PI * 5.5 * t) * 6
    return (Math.sin(2 * Math.PI * f * t) + 0.2 * Math.sin(4 * Math.PI * f * t)) * vol * env(t, dur, 0.05, 0.25)
  }
}
function render(dur, voices) {
  const n = Math.floor(dur * SR)
  const out = new Float64Array(n)
  for (const v of voices) {
    const s = typeof v === 'function' ? v : v.f
    const start = v.at || 0
    for (let i = 0; i < n; i++) {
      const t = i / SR - start
      if (t >= 0) out[i] += s(t)
    }
  }
  return out
}
const N = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.26, F5: 698.46, G5: 783.99, A5: 880, C3: 130.81, E3: 164.81, F3: 174.61, G3: 196, A3: 220, D3: 146.83 }
// 三拍子琶音伴奏：每拍 0.66s
function waltz(chords, beatDur = 0.66, loops = 1) {
  const voices = []
  const total = chords.length * 3 * beatDur * loops
  for (let L = 0; L < loops; L++) {
    chords.forEach((chord, ci) => {
      for (let b = 0; b < 3; b++) {
        const at = (ci * 3 + b) * beatDur + L * chords.length * 3 * beatDur
        const notes = b === 0 ? [chord[0] / 2] : [chord[0], chord[1], chord[2]]
        notes.forEach((f, k) => voices.push({ f: tone(f, beatDur * 0.92, b === 0 ? 0.16 : 0.1, 0.18), at: at + k * 0.012 }))
      }
    })
  }
  return { total, voices }
}
function melody(seq, beatDur = 0.66, vol = 0.16) {
  const voices = []
  let at = 0
  for (const [f, beats] of seq) {
    if (f) voices.push({ f: tone(f, beats * beatDur * 0.95, vol, 0.3), at })
    at += beats * beatDur
  }
  return voices
}

console.log('[assets] 合成 WAV …')
// 主菜单 BGM：C-Am-F-G 圆舞曲
{
  const { total, voices } = waltz([[N.C4, N.E4, N.G4], [N.A3, N.C4, N.E4], [N.F3, N.A3, N.C4], [N.G3, N.B4 - 100, N.D4]], 0.7, 2)
  synthWav(AUD(S, 'bgm/bgm_menu.wav'), render(total, voices))
}
// 小夜曲 BGM：G 调旋律圆舞曲
{
  const { total, voices } = waltz([[N.G3, N.B4, N.D4 + 1], [N.E3 + 12, N.G4, N.C5], [N.C4 - 12, N.E4, N.G4], [N.D3 + 12, N.F4 + 2, N.A4]], 0.66, 2)
  const mel = melody([[N.G4, 1], [N.B4, 1], [N.D5, 1], [N.C5, 2], [N.B4, 1], [N.A4, 3], [N.G4, 1], [N.E4, 1], [N.C4, 1], [N.D4, 6]], 0.66)
  synthWav(AUD(S, 'bgm/bgm_serenade.wav'), render(total, [...voices, ...mel]))
}
// 战斗 BGM：小调驱动
{
  const beat = 0.32
  const seq = [N.A3, N.A3, N.C4, N.A3, N.E4, N.D4, N.C4, N.D4]
  const voices = []
  const total = seq.length * beat * 2
  for (let L = 0; L < 2; L++) {
    seq.forEach((f, i) => {
      voices.push({ f: tone(f, beat * 0.85, 0.2, 0.35), at: (i + seq.length * L) * beat })
      if (i % 2 === 1) voices.push({ f: (t) => { const g = Math.max(0, 1 - t * 30) * 0.12; return (Math.random() * 2 - 1) * g }, at: (i + seq.length * L) * beat })
    })
  }
  synthWav(AUD(S, 'bgm/bgm_battle.wav'), render(total, voices))
}
// 记忆大厅 BGM：慢速摇篮曲
{
  const { total, voices } = waltz([[N.F3, N.A3, N.C4], [N.C4 - 12, N.E4, N.G4], [N.A3 - 12, N.C4, N.E4], [N.G3, N.B4 - 100, N.D4]], 0.9, 2)
  synthWav(AUD(S, 'bgm/bgm_lobby.wav'), render(total, voices))
}
// SFX
synthWav(AUD(S, 'sfx/sfx_click.wav'), render(0.07, [{ f: tone(880, 0.07, 0.25, 0.1) }]))
synthWav(AUD(S, 'sfx/sfx_confirm.wav'), render(0.3, [{ f: tone(660, 0.14, 0.22), at: 0 }, { f: tone(990, 0.18, 0.22), at: 0.12 }]))
synthWav(AUD(S, 'sfx/sfx_hit.wav'), render(0.22, [
  { f: (t) => { const g = Math.max(0, 1 - t * 12) * 0.4; return (Math.random() * 2 - 1) * g }, at: 0 },
  { f: tone(110, 0.2, 0.35, 0.2), at: 0.01 },
]))
synthWav(AUD(S, 'sfx/sfx_heal.wav'), render(0.55, [N.C4, N.E4, N.G4, N.C5].map((f, i) => ({ f: tone(f, 0.2, 0.2), at: i * 0.12 }))))
synthWav(AUD(S, 'sfx/sfx_perfect.wav'), render(0.4, [
  { f: vibratoTone(1200, 1800, 0.3, 0.14), at: 0 },
  { f: tone(N.G5, 0.3, 0.18), at: 0.1 },
]))
// 语音占位（音调各异的柔和哼鸣）
synthWav(AUD(S, 'voice/voice_mari_01.wav'), render(0.8, [{ f: vibratoTone(392, 360, 0.8, 0.2) }]))
synthWav(AUD(S, 'voice/voice_mari_02.wav'), render(0.9, [{ f: vibratoTone(440, 466, 0.9, 0.2) }]))
synthWav(AUD(S, 'voice/voice_sakurako_01.wav'), render(0.8, [{ f: vibratoTone(311, 300, 0.8, 0.18) }]))
synthWav(AUD(S, 'voice/voice_mine_01.wav'), render(0.8, [{ f: vibratoTone(349, 370, 0.8, 0.18) }]))
synthWav(AUD(S, 'voice/voice_generic_01.wav'), render(0.6, [{ f: vibratoTone(330, 340, 0.6, 0.16) }]))

console.log('[assets] 完成 ✓')
