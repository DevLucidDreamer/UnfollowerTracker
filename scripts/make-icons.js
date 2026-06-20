/*
 * 의존성 없이(node 내장 zlib만 사용) 확장 아이콘 PNG 생성.
 *   생성물: icons/16.png, icons/48.png, icons/128.png
 * 디자인: 인스타그램풍 대각 그라데이션 라운드 사각형 + 흰색 돋보기(검색/체커 의미)
 * 사용법:  node scripts/make-icons.js
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SS = 4; // 슈퍼샘플 배율(안티앨리어싱용)

// 인스타그램풍 그라데이션 스톱 (대각선 0→1)
const STOPS = [
  { t: 0.0, c: [254, 218, 117] },
  { t: 0.25, c: [250, 126, 30] },
  { t: 0.5, c: [214, 41, 118] },
  { t: 0.75, c: [150, 47, 191] },
  { t: 1.0, c: [79, 91, 213] },
];

function gradient(t) {
  if (t <= 0) return STOPS[0].c;
  if (t >= 1) return STOPS[STOPS.length - 1].c;
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i].t) {
      const a = STOPS[i - 1];
      const b = STOPS[i];
      const k = (t - a.t) / (b.t - a.t);
      return [
        Math.round(a.c[0] + (b.c[0] - a.c[0]) * k),
        Math.round(a.c[1] + (b.c[1] - a.c[1]) * k),
        Math.round(a.c[2] + (b.c[2] - a.c[2]) * k),
      ];
    }
  }
  return STOPS[STOPS.length - 1].c;
}

// 라운드 사각형 내부 판정
function inRoundRect(x, y, w, h, r) {
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  const cx = Math.min(Math.max(x, r), w - r);
  const cy = Math.min(Math.max(y, r), h - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

// 선분까지의 거리(캡슐 그리기용)
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + dx * t;
  const qy = ay + dy * t;
  return Math.hypot(px - qx, py - qy);
}

function renderHiRes(S) {
  const W = S * SS;
  const buf = new Uint8ClampedArray(W * W * 4); // RGBA

  const r = 0.225 * W; // 라운드 반경
  // 돋보기 기하 (단위 비율 * W)
  const ringCx = 0.42 * W;
  const ringCy = 0.42 * W;
  const ringOuter = 0.255 * W;
  const stroke = 0.085 * W;
  const ringInner = ringOuter - stroke;
  // 손잡이: 링 외곽 45° 지점 → 우하단
  const k = Math.SQRT1_2;
  const hx0 = ringCx + ringOuter * k;
  const hy0 = ringCy + ringOuter * k;
  const hx1 = 0.8 * W;
  const hy1 = 0.8 * W;
  const handleHalf = stroke * 0.62;

  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (!inRoundRect(x, y, W, W, r)) {
        buf[i + 3] = 0; // 라운드 밖 = 투명
        continue;
      }
      // 배경 그라데이션
      const t = (x + y) / (2 * W);
      const bg = gradient(t);

      // 전경(흰 돋보기) 커버리지
      const dRing = Math.hypot(x - ringCx, y - ringCy);
      const onRing = dRing <= ringOuter && dRing >= ringInner;
      const onHandle = distToSegment(x, y, hx0, hy0, hx1, hy1) <= handleHalf;
      const fg = onRing || onHandle;

      if (fg) {
        buf[i] = 255;
        buf[i + 1] = 255;
        buf[i + 2] = 255;
      } else {
        buf[i] = bg[0];
        buf[i + 1] = bg[1];
        buf[i + 2] = bg[2];
      }
      buf[i + 3] = 255;
    }
  }
  return { buf, W };
}

// 슈퍼샘플 → 목표 크기로 박스 평균 다운스케일
function downscale(hi, W, S) {
  const out = new Uint8ClampedArray(S * S * 4);
  const f = SS;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < f; sy++) {
        for (let sx = 0; sx < f; sx++) {
          const i = ((y * f + sy) * W + (x * f + sx)) * 4;
          const alpha = hi[i + 3];
          r += hi[i] * alpha;
          g += hi[i + 1] * alpha;
          b += hi[i + 2] * alpha;
          a += alpha;
        }
      }
      const o = (y * S + x) * 4;
      if (a === 0) {
        out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0;
      } else {
        out[o] = Math.round(r / a);
        out[o + 1] = Math.round(g / a);
        out[o + 2] = Math.round(b / a);
        out[o + 3] = Math.round(a / (f * f));
      }
    }
  }
  return out;
}

// ── 최소 PNG 인코더 (RGBA, 8bit) ───────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(rgba, S) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0);
  ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // 스캔라인 필터 바이트(0) 삽입
  const raw = Buffer.alloc(S * (S * 4 + 1));
  for (let y = 0; y < S; y++) {
    raw[y * (S * 4 + 1)] = 0;
    for (let x = 0; x < S * 4; x++) {
      raw[y * (S * 4 + 1) + 1 + x] = rgba[y * S * 4 + x];
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── 실행 ───────────────────────────────────────────────────────────
const outDir = path.join(__dirname, "..", "icons");
fs.mkdirSync(outDir, { recursive: true });

for (const S of [16, 48, 128]) {
  const { buf, W } = renderHiRes(S);
  const small = downscale(buf, W, S);
  const png = encodePng(small, S);
  const file = path.join(outDir, S + ".png");
  fs.writeFileSync(file, png);
  console.log("- icons/" + S + ".png  (" + png.length + " bytes)");
}
console.log("OK");
