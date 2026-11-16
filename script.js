// Xpay proxy: ваш ключ Gemini хранится на сервере (секрет GEMINI_API_KEY), пользователи его не видят.
const MODELS = { smart: 'gemini-2.5-pro', fast: 'gemini-2.5-flash', lite: 'gemini-2.5-flash-lite' };
const ALLOWED_ORIGIN = '*'; // после публикации замените на адрес вашего сайта, например https://xpay.example.com

const cors = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const reply = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return reply({ error: { message: 'Только POST' } }, 405);
    if (!env.GEMINI_API_KEY) return reply({ error: { message: 'На сервере не задан GEMINI_API_KEY' } }, 500);

    const raw = await req.text();
    if (raw.length > 6_000_000) return reply({ error: { message: 'Слишком большой запрос' } }, 413);

    let body;
    try { body = JSON.parse(raw); } catch { return reply({ error: { message: 'Неверный JSON' } }, 400); }

    const { model, systemInstruction, contents } = body;
    const m = MODELS[model] || MODELS.fast;
    if (!Array.isArray(contents) || contents.length > 60) return reply({ error: { message: 'Неверные данные' } }, 400);

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({ systemInstruction, contents }),
      }
    );
    return new Response(await r.text(), { status: r.status, headers: { ...cors, 'Content-Type': 'application/json' } });
  },
};
        
