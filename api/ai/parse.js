// Vercel Serverless Function — AI tasting note parser via DeepSeek.
// Takes free-form text + user's existing notes, decides whether the user is
// describing a NEW tasting or RE-TASTING an existing record, and extracts
// structured data either way.
//
// Env vars required:
//   DEEPSEEK_API_KEY

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

// In-memory rate limit (per session token / IP), 10 requests per minute
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 10;
const rateLimitCache = globalThis.__aiParseRateLimit || new Map();
globalThis.__aiParseRateLimit = rateLimitCache;

function checkRate(key) {
  const now = Date.now();
  const entries = rateLimitCache.get(key) || [];
  const recent = entries.filter(t => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) return false;
  recent.push(now);
  rateLimitCache.set(key, recent);
  return true;
}

const SYSTEM_PROMPT = `你是味迹（TasteVerse）的 AI 品鉴助手。用户会发送一段品鉴描述或提问。你的任务：

1. 判断用户意图：保存新品鉴 / 再次品鉴 / 闲聊提问。
2. 如果是保存类，抽取结构化字段；如果是闲聊提问，基于「相关品鉴记忆」回答。

返回严格的 JSON：

{
  "intent": "new" | "revisit" | "chat",
  "matched_note_id": "如果 intent=revisit，给出最匹配的 note id（来自相关记忆里的 session_id）；否则 null",
  "referenced_ids": ["你在 reply 中提到或引用的相关品鉴记忆的 session_id 列表，最多 5 个；如无引用则 []"],
  "confidence": 0.0-1.0,
  "reply": "给用户的简短自然语言回复，2-3 句。如果是 chat，这里就是答案正文。",
  "data": {
    "name": "品鉴对象名称（仅 new 必填）",
    "cat": "类别 key（必须从「已有分类 key 列表」精确选择，或使用 \\"__new__\\" 创建新分类）",
    "new_cat": "仅当 cat=\\"__new__\\" 时提供：{key:'英文小写_下划线', name:'中文名', icon:'emoji', parent:'drinks'/'food'/'other'}",
    "score": 0-10 整数（没把握给 7）,
    "tags": ["风味标签 3-6 个"],
    "note": "用户描述的精炼版品鉴笔记",
    "location": "地点（如有）",
    "price": null 或 数字
  }
}

**关键规则**：

【分类】
- "cat" 字段优先从「已有分类 key 列表」中选；只有在完全没有合适的现有分类时，才用 "__new__" 提议新分类，并在 "new_cat" 字段中给出建议（key 用英文小写+下划线，比如 "whisky"、"japanese_food"）。
- 不要随意造新分类。

【防止虚构 — 极其重要】
- **绝对不要发明、虚构用户没有的品鉴记录**。
- 当用户问推荐 / 总结 / 历史时，**只能引用**「相关品鉴记忆」或「本地品鉴摘要」里**实际存在**的记录。
- 如果用户的问题相关数据为空（比如问"推荐一款咖啡"但用户没喝过咖啡），**诚实告知**："你目前没有这类的品鉴记录哦，先记录几条吧"。不要硬编一条。
- 引用具体记录时，必须使用记录的真实名称（来自 name 字段），不要换名字。

【referenced_ids】
- reply 中提到任何具体记录时，必须把对应的 session_id（或 note id）放进 referenced_ids。
- 如果 reply 没引用任何记录（比如纯通用建议），referenced_ids 为 []。

【intent 判断】
- 用户描述新品鉴体验 → new
- 用户描述对已有记录的再次品鉴 → revisit
- 用户问推荐 / 查询 / 总结 → chat，把答案写在 reply 里。

只输出 JSON，不要额外解释。`;

// Call EverOS to search semantic-related memories for the user
async function searchEverOSMemories(userId, query, topK = 10) {
  const KEY = process.env.EVEROS_API_KEY;
  const UPSTREAM = process.env.EVEROS_UPSTREAM || 'https://api.evermind.ai/api/v1';
  if (!KEY || !userId) return [];
  try {
    const r = await fetch(`${UPSTREAM}/memories/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KEY}`,
      },
      body: JSON.stringify({
        filters: { user_id: userId },
        query: query,
        method: 'hybrid',
        top_k: topK,
      }),
    });
    if (!r.ok) {
      console.warn('[ai/parse] EverOS search non-ok:', r.status);
      return [];
    }
    const data = await r.json();
    const payload = (data && data.data) || (data && data.result) || data;
    const episodes = (payload && (payload.episodes || payload.memories)) || [];
    if (!Array.isArray(episodes)) return [];
    return episodes.map(m => ({
      session_id: m.session_id || m.id || null,
      content: m.content || (m.messages && m.messages[0] && m.messages[0].content) || '',
      score: m.score || m.relevance || null,
    })).filter(m => m.content);
  } catch (e) {
    console.error('[ai/parse] EverOS search error:', e.message);
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const KEY = process.env.DEEPSEEK_API_KEY;
  if (!KEY) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Rate limit by IP (best-effort)
  const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
  if (!checkRate(String(ip).split(',')[0].trim())) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { text, categories, history, userId, notes } = req.body || {};
  if (!text || typeof text !== 'string' || text.length > 4000) {
    return res.status(400).json({ error: 'Invalid text' });
  }

  // Fetch relevant memories from EverOS using semantic search
  const memories = await searchEverOSMemories(userId, text, 10);
  console.log('[ai/parse] EverOS returned', memories.length, 'memories for query:', text.slice(0, 50));

  const catSummary = Object.keys(categories || {}).map(k => ({
    key: k,
    name: categories[k].name,
  }));
  const catKeys = catSummary.map(c => c.key);

  // Local notes summary (as fallback / supplement to EverOS)
  const localNotes = (notes || []).slice(0, 50).map(n => ({
    id: n.id,
    name: n.name,
    cat: n.cat,
    score: n.score,
    tags: (n.tags || []).slice(0, 5),
    time: n.time,
    visits: (n.visits || []).length + 1,
    location: n.location || null,
    price: n.price ? n.price.price : null,
  }));

  // Context goes into the system prompt so it's not duplicated across history
  const contextSection = `

【已有分类】
key 列表（cat 字段必选其一，或使用 "__new__"）：${JSON.stringify(catKeys)}
详情：${JSON.stringify(catSummary)}

【本地品鉴摘要 — 用户全部记录的精简列表（共 ${localNotes.length} 条）】
${localNotes.length === 0 ? '（用户当前还没有任何品鉴记录）' : JSON.stringify(localNotes)}

【相关品鉴记忆 — EverOS 语义搜索的最相关 ${memories.length} 条（含完整内容）】
${memories.length === 0 ? '（EverOS 未返回相关记忆，请基于上方「本地品鉴摘要」回答）' : memories.map((m, i) => `${i+1}. id=${m.session_id}\n${m.content}`).join('\n\n')}`;

  // Build messages: system + history + current user message
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + contextSection },
  ];
  // Filter and validate prior history
  if (Array.isArray(history)) {
    for (const h of history.slice(-12)) { // keep at most last 12 turns
      if (h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string' && h.content.length < 4000) {
        messages.push({ role: h.role, content: h.content });
      }
    }
  }
  messages.push({ role: 'user', content: text });

  try {
    const aiRes = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('[ai/parse] DeepSeek error:', aiRes.status, errText);
      return res.status(502).json({ error: 'AI service error', detail: aiRes.status });
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: 'Empty AI response' });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('[ai/parse] Failed to parse AI JSON:', content);
      return res.status(502).json({ error: 'AI returned invalid JSON' });
    }

    res.status(200).json(parsed);
  } catch (e) {
    console.error('[ai/parse] Exception:', e);
    res.status(500).json({ error: 'Internal error' });
  }
}
