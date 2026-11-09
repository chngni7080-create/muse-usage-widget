// Muse 额度小组件 · Scriptable
// 数据来源: https://raw.githubusercontent.com/chngni7080-create/muse-usage-widget/main/muse-usage.json
// 由 Muse 每 15 分钟自动更新, 小组件每次刷新时读取最新数据
// v2: 多地址轮换 + 本地缓存, 网络一时不通也显示上一次读到的数据

const DATA_URLS = [
  "https://raw.githubusercontent.com/chngni7080-create/muse-usage-widget/main/muse-usage.json",
  "https://cdn.jsdelivr.net/gh/chngni7080-create/muse-usage-widget@main/muse-usage.json",
  "https://api.github.com/repos/chngni7080-create/muse-usage-widget/contents/muse-usage.json",
]

const fm = FileManager.local()
const cachePath = fm.joinPath(fm.documentsDirectory(), "muse-usage-cache.json")

function readCache() {
  try {
    if (fm.fileExists(cachePath)) {
      return JSON.parse(fm.readString(cachePath))
    }
  } catch (e) {}
  return null
}

function writeCache(data) {
  try {
    fm.writeString(cachePath, JSON.stringify(data))
  } catch (e) {}
}

async function loadData() {
  for (const url of DATA_URLS) {
    try {
      const req = new Request(url)
      req.headers = { "Cache-Control": "no-cache" }
      req.timeoutInterval = 10
      if (url.includes("api.github.com")) {
        const body = await req.loadJSON()
        if (body && body.content) {
          const text = Data.fromBase64String(body.content.replace(/\n/g, "")).toRawString()
          return JSON.parse(text)
        }
      } else {
        return await req.loadJSON()
      }
    } catch (e) {}
  }
  return null
}

function daysUntil(resetAt) {
  if (!resetAt) return null
  const diff = new Date(resetAt) - new Date()
  return Math.max(0, Math.ceil(diff / 86400000))
}

function formatUpdated(iso) {
  if (!iso) return ""
  const d = new Date(iso)
  const m = d.getMonth() + 1
  const day = d.getDate()
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `更新时间: ${m}月${day}日 ${hh}:${mm}`
}

let data = await loadData()
let fromCache = false
if (data) {
  writeCache(data)
} else {
  data = readCache()
  fromCache = !!data
}

const widget = new ListWidget()
widget.backgroundColor = new Color("#1b1b26", 1)
widget.setPadding(14, 14, 12, 14)

// 标题
const title = widget.addText("✦ Muse")
title.font = Font.boldSystemFont(15)
title.textColor = Color.white()
widget.addSpacer(8)

// 每周额度
const label = widget.addText("每周额度")
label.font = Font.systemFont(12)
label.textColor = new Color("#a1a1b5")
widget.addSpacer(2)

if (data && typeof data.weekly_remaining_pct === "number") {
  const remaining = data.weekly_remaining_pct
  const big = widget.addText(`剩余 ${remaining}%`)
  big.font = Font.boldSystemFont(24)
  big.textColor = Color.white()
  widget.addSpacer(8)

  // 进度条: 总宽 124, 填充宽度按剩余百分比算
  const barBg = widget.addStack()
  barBg.backgroundColor = new Color("#3a3a4d", 1)
  barBg.cornerRadius = 3
  barBg.size = new Size(124, 6)
  barBg.layoutHorizontally()
  const filled = barBg.addStack()
  filled.backgroundColor = new Color("#8b7cff", 1)
  filled.cornerRadius = 3
  filled.size = new Size(Math.max(6, Math.round(124 * remaining / 100)), 6)
  widget.addSpacer(6)

  const days = data.reset_in_days != null ? data.reset_in_days : daysUntil(data.reset_at)
  const reset = widget.addText(days != null ? `${days}天后重置` : "重置时间未知")
  reset.font = Font.systemFont(12)
  reset.textColor = new Color("#a1a1b5")
  widget.addSpacer(10)

  const updated = widget.addText(formatUpdated(data.updated_at) + (fromCache ? " (缓存)" : ""))
  updated.font = Font.systemFont(10)
  updated.textColor = new Color("#6e6e80")
} else {
  const err = widget.addText("暂时读不到数据")
  err.font = Font.systemFont(13)
  err.textColor = Color.white()
  widget.addSpacer(6)
  const hint = widget.addText("点一下小组件重试")
  hint.font = Font.systemFont(11)
  hint.textColor = new Color("#a1a1b5")
}

widget.url = "https://github.com/chngni7080-create/muse-usage-widget"
Script.setWidget(widget)
Script.complete()
