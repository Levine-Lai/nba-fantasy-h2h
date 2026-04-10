const DEFAULT_API_BASE = "";
const TARGET_GW = 25;
const DAY_ANIMATION_RATE = 0.55;

const dom = {
  canvas: document.getElementById("race-canvas"),
  slider: document.getElementById("timeline-slider"),
  dayTitle: document.getElementById("day-title"),
  statusPill: document.getElementById("status-pill"),
  legend: document.getElementById("legend"),
  matchups: document.getElementById("matchups"),
  ranking: document.getElementById("ranking"),
  gamedayInfo: document.getElementById("gameday-info"),
  metaLine: document.getElementById("meta-line"),
  exportLine: document.getElementById("export-line"),
  refreshBtn: document.getElementById("refresh-btn"),
  playBtn: document.getElementById("play-btn"),
  resetBtn: document.getElementById("reset-btn"),
  speedSelect: document.getElementById("speed-select"),
  exportBtn: document.getElementById("export-btn"),
};

const state = {
  payload: null,
  playing: false,
  playhead: 0,
  speed: 1,
  rafId: 0,
  lastTs: 0,
  exporting: false,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function getApiBase() {
  const params = new URLSearchParams(window.location.search);
  const customBase = (params.get("api_base") || "").trim();
  if (customBase) return customBase.replace(/\/+$/, "");
  return DEFAULT_API_BASE;
}

function buildDataEndpoint() {
  const apiBase = getApiBase();
  return `${apiBase}/api/gw25-title-race-data?gw=${encodeURIComponent(String(TARGET_GW))}&_=${Date.now()}`;
}

function statusToLabel(status) {
  if (status === "live") return "当前进行中";
  if (status === "settled") return "已结算";
  return "未开赛";
}

function statusToClass(status) {
  if (status === "live") return "live";
  if (status === "settled") return "settled";
  return "future";
}

function formatDiff(diff) {
  if (!isFiniteNumber(diff)) return "-";
  const value = Number(diff);
  if (value > 0) return `+${value}`;
  return String(value);
}

function createLegend() {
  const payload = state.payload;
  if (!payload) return;
  dom.legend.innerHTML = payload.contenders.map((item) => `
    <div class="legend-item" data-uid="${item.uid}">
      <span class="legend-dot" style="background:${item.color}"></span>
      <span class="legend-name">${item.display_name}</span>
      <span class="legend-val" id="legend-val-${item.uid}">-</span>
    </div>
  `).join("");
}

function getSeriesValueAt(series, index) {
  if (!Array.isArray(series)) return null;
  const row = series[index];
  if (!row) return null;
  return isFiniteNumber(row.league_points) ? Number(row.league_points) : null;
}

function getSeriesValueAtPlayhead(series, playhead) {
  if (!Array.isArray(series) || !series.length) return null;
  const maxIndex = series.length - 1;
  const clamped = clamp(playhead, 0, maxIndex);
  const leftIndex = Math.floor(clamped);
  const rightIndex = Math.ceil(clamped);
  const leftValue = getSeriesValueAt(series, leftIndex);
  if (rightIndex === leftIndex) return leftValue;
  const rightValue = getSeriesValueAt(series, rightIndex);
  if (!isFiniteNumber(leftValue) || !isFiniteNumber(rightValue)) return leftValue;
  const t = clamped - leftIndex;
  return leftValue + (rightValue - leftValue) * t;
}

function getChartBounds(payload) {
  const values = [];
  for (const contender of payload.contenders || []) {
    for (const row of contender.series || []) {
      if (isFiniteNumber(row?.league_points)) values.push(Number(row.league_points));
    }
    if (isFiniteNumber(contender?.base_points)) values.push(Number(contender.base_points));
  }
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 10;
  const padding = 1;
  return {
    minY: Math.floor(min - padding),
    maxY: Math.ceil(max + padding),
  };
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function renderChartToContext(ctx, canvasWidth, canvasHeight, playhead, options = {}) {
  const payload = state.payload;
  if (!payload) return;
  const days = payload.days || [];
  if (!days.length) return;

  const maxIndex = days.length - 1;
  const clampedPlayhead = clamp(playhead, 0, maxIndex);
  const { minY, maxY } = getChartBounds(payload);

  const padding = {
    left: Math.round(canvasWidth * 0.08),
    right: Math.round(canvasWidth * 0.08),
    top: Math.round(canvasHeight * 0.12),
    bottom: Math.round(canvasHeight * 0.16),
  };
  const innerWidth = canvasWidth - padding.left - padding.right;
  const innerHeight = canvasHeight - padding.top - padding.bottom;

  const getX = (index) => padding.left + (innerWidth * (index / Math.max(1, maxIndex)));
  const getY = (value) => {
    const ratio = (Number(value) - minY) / Math.max(1, maxY - minY);
    return padding.top + innerHeight - ratio * innerHeight;
  };

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  ctx.save();
  drawRoundedRect(ctx, 0, 0, canvasWidth, canvasHeight, 24);
  const bgGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  bgGradient.addColorStop(0, "rgba(8, 16, 34, 0.98)");
  bgGradient.addColorStop(1, "rgba(2, 8, 20, 0.98)");
  ctx.fillStyle = bgGradient;
  ctx.fill();
  ctx.restore();

  const guideCount = Math.max(4, maxY - minY);
  ctx.strokeStyle = "rgba(190, 210, 230, 0.14)";
  ctx.lineWidth = 1;
  ctx.font = `${Math.round(canvasHeight * 0.02)}px "Noto Sans SC"`;
  ctx.fillStyle = "rgba(196, 208, 226, 0.76)";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= guideCount; i += 1) {
    const value = minY + ((maxY - minY) * i) / guideCount;
    const y = getY(value);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(canvasWidth - padding.right, y);
    ctx.stroke();
    ctx.fillText(String(Math.round(value)), padding.left - 12, y);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let i = 0; i < days.length; i += 1) {
    const x = getX(i);
    const dayLabel = days[i]?.day_label || `Day ${i + 1}`;
    ctx.fillStyle = "rgba(214, 228, 246, 0.86)";
    ctx.fillText(dayLabel, x, canvasHeight - padding.bottom + 14);
  }

  for (const contender of payload.contenders || []) {
    const color = contender?.color || "#ffffff";
    const series = contender?.series || [];
    const points = [];
    const floorIndex = Math.floor(clampedPlayhead);
    for (let idx = 0; idx <= floorIndex; idx += 1) {
      const value = getSeriesValueAt(series, idx);
      if (!isFiniteNumber(value)) continue;
      points.push({ x: getX(idx), y: getY(value), value });
    }
    const nextIndex = Math.ceil(clampedPlayhead);
    if (nextIndex > floorIndex && nextIndex < series.length) {
      const leftValue = getSeriesValueAt(series, floorIndex);
      const rightValue = getSeriesValueAt(series, nextIndex);
      if (isFiniteNumber(leftValue) && isFiniteNumber(rightValue)) {
        const t = clampedPlayhead - floorIndex;
        const interpolated = leftValue + (rightValue - leftValue) * t;
        points.push({
          x: getX(clampedPlayhead),
          y: getY(interpolated),
          value: interpolated,
        });
      }
    }

    if (!points.length) continue;
    ctx.lineWidth = Math.max(2.8, canvasWidth * 0.0028);
    ctx.strokeStyle = color;
    ctx.shadowBlur = Math.round(canvasWidth * 0.009);
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    for (let i = 0; i < points.length; i += 1) {
      if (i !== points.length - 1 && i !== 0 && !options.export) continue;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(points[i].x, points[i].y, Math.max(3, canvasWidth * 0.0034), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(8, 16, 34, 0.9)";
      ctx.lineWidth = Math.max(1.6, canvasWidth * 0.0012);
      ctx.stroke();
    }

    const currentPoint = points[points.length - 1];
    const currentValue = getSeriesValueAtPlayhead(series, clampedPlayhead);
    if (isFiniteNumber(currentValue)) {
      const tagText = `${contender.display_name}  ${Math.round(currentValue)}`;
      ctx.font = `${Math.round(canvasHeight * 0.026)}px "Noto Sans SC"`;
      const textWidth = ctx.measureText(tagText).width;
      const tagWidth = textWidth + 16;
      const tagHeight = Math.round(canvasHeight * 0.048);
      const tagX = clamp(currentPoint.x + 12, padding.left + 2, canvasWidth - padding.right - tagWidth - 2);
      const tagY = clamp(currentPoint.y - tagHeight - 8, padding.top + 2, canvasHeight - padding.bottom - tagHeight - 2);
      drawRoundedRect(ctx, tagX, tagY, tagWidth, tagHeight, 8);
      ctx.fillStyle = "rgba(5, 12, 26, 0.86)";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(tagText, tagX + 9, tagY + tagHeight / 2 + 1);
    }
  }

  if (options.export) {
    ctx.fillStyle = "rgba(238, 246, 255, 0.92)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = `${Math.round(canvasHeight * 0.06)}px "Bebas Neue"`;
    ctx.fillText("GW25 TITLE RACE", padding.left, Math.round(canvasHeight * 0.03));
  }
}

function currentDayIndex() {
  const payload = state.payload;
  if (!payload) return 0;
  return clamp(Math.round(state.playhead), 0, Math.max(0, (payload.days || []).length - 1));
}

function renderPanels() {
  const payload = state.payload;
  if (!payload) return;
  const dayIndex = currentDayIndex();
  const dayRow = payload.days?.[dayIndex] || null;
  const contenders = payload.contenders || [];

  const dayTitle = dayRow?.day_label || "Day ?";
  dom.dayTitle.textContent = `${dayTitle} · GW${payload.gw || TARGET_GW}`;
  const statusText = statusToLabel(dayRow?.status || "future");
  dom.statusPill.textContent = statusText;
  dom.statusPill.className = `status-pill ${statusToClass(dayRow?.status || "future")}`;

  const matchupRows = contenders.map((contender) => {
    const row = contender?.series?.[dayIndex] || {};
    const myScore = isFiniteNumber(row?.my_week_total) ? Number(row.my_week_total) : null;
    const oppScore = isFiniteNumber(row?.opponent_week_total) ? Number(row.opponent_week_total) : null;
    const leaguePoints = isFiniteNumber(row?.league_points) ? Number(row.league_points) : null;

    const badge = row?.result === "W"
      ? '<span class="badge win">胜 +3</span>'
      : row?.result === "L"
        ? '<span class="badge lose">负 +0</span>'
        : row?.result === "D"
          ? '<span class="badge draw">平 +1</span>'
          : '<span class="badge waiting">待定</span>';

    return `
      <div class="row-item">
        <div class="row-top">
          <div class="row-title">${contender.display_name} vs ${contender.opponent_name}</div>
          ${badge}
        </div>
        <div>${myScore === null ? "-" : myScore} : ${oppScore === null ? "-" : oppScore}
          <span class="muted">（分差 ${formatDiff(row?.diff)}）</span>
        </div>
        <div class="muted">当前联赛积分：${leaguePoints === null ? "-" : leaguePoints}</div>
      </div>
    `;
  }).join("");
  dom.matchups.innerHTML = matchupRows;

  const rankingRows = contenders
    .map((contender) => {
      const row = contender?.series?.[dayIndex] || {};
      const leaguePoints = isFiniteNumber(row?.league_points)
        ? Number(row.league_points)
        : Number(contender?.base_points || 0);
      return {
        name: contender.display_name,
        points: leaguePoints,
        diff: isFiniteNumber(row?.diff) ? Number(row.diff) : -99999,
      };
    })
    .sort((left, right) =>
      Number(right?.points || 0) - Number(left?.points || 0) ||
      Number(right?.diff || 0) - Number(left?.diff || 0) ||
      String(left?.name || "").localeCompare(String(right?.name || ""))
    );

  dom.ranking.innerHTML = rankingRows.map((row, index) => `
    <div class="row-item">
      <div class="row-top">
        <div class="row-title">#${index + 1} ${row.name}</div>
        <span>${row.points}</span>
      </div>
      <div class="muted">当前轮对阵分差参考：${row.diff === -99999 ? "-" : formatDiff(row.diff)}</div>
    </div>
  `).join("");

  dom.gamedayInfo.innerHTML = (payload.days || []).map((day) => `
    <div class="row-item">
      <div class="row-top">
        <div class="row-title">${day.day_label}</div>
        <span class="badge ${day.status === "settled" ? "win" : day.status === "live" ? "draw" : "waiting"}">
          ${statusToLabel(day.status)}
        </span>
      </div>
      <div>Event ${day.event_id} · ${day.event_name}</div>
      <div class="muted">
        NBA 赛程：${day.games_count ?? 0} 场，已结束 ${day.finished_games_count ?? 0} 场
      </div>
    </div>
  `).join("");

  for (const contender of contenders) {
    const legendVal = document.getElementById(`legend-val-${contender.uid}`);
    if (!legendVal) continue;
    const row = contender?.series?.[dayIndex] || {};
    legendVal.textContent = isFiniteNumber(row?.league_points) ? String(Number(row.league_points)) : "-";
  }
}

function render() {
  const payload = state.payload;
  if (!payload) return;
  const ctx = dom.canvas.getContext("2d");
  renderChartToContext(ctx, dom.canvas.width, dom.canvas.height, state.playhead);
  renderPanels();
  dom.slider.value = String(state.playhead);
}

function stopAnimation() {
  state.playing = false;
  dom.playBtn.textContent = "播放";
  if (state.rafId) {
    cancelAnimationFrame(state.rafId);
    state.rafId = 0;
  }
}

function animationLoop(timestamp) {
  if (!state.playing || !state.payload) return;
  if (!state.lastTs) state.lastTs = timestamp;
  const deltaSec = (timestamp - state.lastTs) / 1000;
  state.lastTs = timestamp;

  const maxIndex = Math.max(0, (state.payload.days || []).length - 1);
  state.playhead = clamp(state.playhead + deltaSec * DAY_ANIMATION_RATE * state.speed, 0, maxIndex);
  render();
  if (state.playhead >= maxIndex - 0.0001) {
    stopAnimation();
    return;
  }
  state.rafId = requestAnimationFrame(animationLoop);
}

function startAnimation() {
  if (!state.payload) return;
  const maxIndex = Math.max(0, (state.payload.days || []).length - 1);
  if (state.playhead >= maxIndex - 0.0001) state.playhead = 0;
  state.playing = true;
  state.lastTs = 0;
  dom.playBtn.textContent = "暂停";
  state.rafId = requestAnimationFrame(animationLoop);
}

function updateMetaLine() {
  const payload = state.payload;
  if (!payload) return;
  const generatedAt = payload.generated_at
    ? new Date(payload.generated_at).toLocaleString("zh-CN", { hour12: false })
    : "-";
  const currentEvent = payload?.current?.event_name || "未知";
  const availableDays = payload?.available_day_count ?? 0;
  dom.metaLine.textContent = `数据源：${payload.source || "-"} · ${generatedAt} · 当前 ${currentEvent} · 已可视化 ${availableDays} 天`;
}

async function loadPayload() {
  dom.metaLine.textContent = "正在拉取 GW25 数据...";
  dom.exportLine.textContent = "";
  let payload = null;
  let sourceTag = "";
  try {
    const endpoint = buildDataEndpoint();
    const response = await fetch(endpoint, { method: "GET" });
    if (!response.ok) {
      throw new Error(`数据接口失败：${response.status}`);
    }
    payload = await response.json();
    sourceTag = "live";
  } catch {
    const fallbackResponse = await fetch("./mock-data.json", { method: "GET" });
    if (!fallbackResponse.ok) {
      throw new Error("实时接口与本地备份均不可用");
    }
    payload = await fallbackResponse.json();
    sourceTag = "mock";
  }
  if (!payload?.success) {
    throw new Error(payload?.error || "接口返回失败");
  }
  if (sourceTag === "mock") {
    payload.source = `${payload.source || "mock"} (fallback)`;
  }
  state.payload = payload;
  const maxIndex = Math.max(0, (payload.days || []).length - 1);
  const latestIndex = clamp((payload.available_day_count || 1) - 1, 0, maxIndex);
  state.playhead = latestIndex;
  dom.slider.min = "0";
  dom.slider.max = String(maxIndex);
  dom.slider.value = String(state.playhead);
  createLegend();
  updateMetaLine();
  render();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function pickBestRecorderMime() {
  const candidates = [
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const mime of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "";
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`load script failed: ${src}`)), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.src = src;
    script.addEventListener("load", () => {
      script.dataset.loaded = "1";
      resolve();
    }, { once: true });
    script.addEventListener("error", () => reject(new Error(`load script failed: ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

let ffmpegInstance = null;
async function ensureFfmpeg() {
  if (ffmpegInstance) return ffmpegInstance;
  await loadScriptOnce("https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js");
  const FFmpegClass = window.FFmpegWASM?.FFmpeg;
  if (!FFmpegClass) {
    throw new Error("FFmpeg wasm 初始化失败");
  }
  const ffmpeg = new FFmpegClass();
  await ffmpeg.load({
    coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js",
    wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm",
    workerURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.worker.js",
  });
  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

async function transcodeWebmToMp4(webmBlob) {
  const ffmpeg = await ensureFfmpeg();
  const stamp = Date.now();
  const inputName = `gw25-${stamp}.webm`;
  const outputName = `gw25-${stamp}.mp4`;
  const inputData = new Uint8Array(await webmBlob.arrayBuffer());
  await ffmpeg.writeFile(inputName, inputData);
  await ffmpeg.exec([
    "-i", inputName,
    "-c:v", "libx264",
    "-preset", "fast",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    outputName,
  ]);
  const outputData = await ffmpeg.readFile(outputName);
  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch {
    // Ignore cleanup errors.
  }
  return new Blob([outputData.buffer], { type: "video/mp4" });
}

async function exportAnimation() {
  if (!state.payload || state.exporting) return;
  state.exporting = true;
  stopAnimation();
  dom.exportBtn.disabled = true;

  try {
    dom.exportLine.textContent = "正在录制动画...";
    const fps = 30;
    const secondsPerDay = 1.35;
    const maxIndex = Math.max(0, (state.payload.days || []).length - 1);
    const totalDurationSec = Math.max(1.2, maxIndex * secondsPerDay);
    const totalFrames = Math.max(2, Math.round(totalDurationSec * fps));

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = 1920;
    exportCanvas.height = 1080;
    const exportCtx = exportCanvas.getContext("2d");
    const stream = exportCanvas.captureStream(fps);
    const mime = pickBestRecorderMime();
    if (!mime) throw new Error("当前浏览器不支持视频录制");

    const chunks = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 10_000_000,
    });
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };
    const stopPromise = new Promise((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.start(250);

    for (let frame = 0; frame < totalFrames; frame += 1) {
      const head = (frame / (totalFrames - 1)) * maxIndex;
      renderChartToContext(exportCtx, exportCanvas.width, exportCanvas.height, head, { export: true });
      await sleep(1000 / fps);
    }

    recorder.stop();
    await stopPromise;

    const rawBlob = new Blob(chunks, { type: recorder.mimeType || mime });
    if (String(recorder.mimeType || mime).toLowerCase().includes("mp4")) {
      downloadBlob(rawBlob, `gw25-title-race-${Date.now()}.mp4`);
      dom.exportLine.textContent = "导出完成：MP4 已下载。";
      return;
    }

    dom.exportLine.textContent = "浏览器先导出为 WebM，正在尝试转码 MP4...";
    try {
      const mp4Blob = await transcodeWebmToMp4(rawBlob);
      downloadBlob(mp4Blob, `gw25-title-race-${Date.now()}.mp4`);
      dom.exportLine.textContent = "导出完成：MP4 已下载。";
    } catch (error) {
      downloadBlob(rawBlob, `gw25-title-race-${Date.now()}.webm`);
      dom.exportLine.textContent = `MP4 转码失败，已回退下载 WebM（${String(error?.message || error)}）。`;
    }
  } catch (error) {
    dom.exportLine.textContent = `导出失败：${String(error?.message || error)}`;
  } finally {
    state.exporting = false;
    dom.exportBtn.disabled = false;
  }
}

function bindEvents() {
  dom.refreshBtn.addEventListener("click", async () => {
    stopAnimation();
    try {
      await loadPayload();
    } catch (error) {
      dom.metaLine.textContent = `加载失败：${String(error?.message || error)}`;
    }
  });

  dom.playBtn.addEventListener("click", () => {
    if (state.playing) {
      stopAnimation();
      return;
    }
    startAnimation();
  });

  dom.resetBtn.addEventListener("click", () => {
    stopAnimation();
    state.playhead = 0;
    render();
  });

  dom.slider.addEventListener("input", () => {
    stopAnimation();
    state.playhead = Number(dom.slider.value || 0);
    render();
  });

  dom.speedSelect.addEventListener("change", () => {
    state.speed = Number(dom.speedSelect.value || 1) || 1;
  });

  dom.exportBtn.addEventListener("click", async () => {
    await exportAnimation();
  });
}

async function bootstrap() {
  bindEvents();
  try {
    await loadPayload();
  } catch (error) {
    dom.metaLine.textContent = `加载失败：${String(error?.message || error)}。请确认通过 Pages Functions 访问该页面。`;
  }
}

bootstrap();
