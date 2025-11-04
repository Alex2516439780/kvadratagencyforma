export const config = { runtime: 'edge' };

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req) {
    try {
        if (req.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        if (req.method !== 'POST') {
            return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
        }

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
            return new Response(JSON.stringify({ ok: false, error: 'Missing TELEGRAM_BOT_TOKEN' }), {
                status: 500,
                headers: { 'content-type': 'application/json', ...corsHeaders }
            });
        }

        const form = await req.formData();
        const file = form.get('document');
        const caption = form.get('caption') || '';
        const filename = form.get('filename') || 'brief.pdf';
        const chatIdsRaw = form.get('chat_ids');

        const defaultChatIds = ['1142868244', '521500516'];
        const chatIds = typeof chatIdsRaw === 'string' && chatIdsRaw.trim().length > 0
            ? chatIdsRaw.split(',').map(s => s.trim())
            : defaultChatIds;

        if (!file) {
            return new Response(JSON.stringify({ ok: false, error: 'No document provided' }), {
                status: 400,
                headers: { 'content-type': 'application/json', ...corsHeaders }
            });
        }

        const url = `https://api.telegram.org/bot${botToken}/sendDocument`;

        const results = await Promise.all(chatIds.map(async (chatId) => {
            const tgForm = new FormData();
            tgForm.append('chat_id', chatId);
            tgForm.append('caption', caption);
            tgForm.append('document', file, filename);

            const r = await fetch(url, { method: 'POST', body: tgForm });
            if (!r.ok) {
                const t = await r.text();
                throw new Error(`Chat ${chatId}: ${t}`);
            }
            return { chatId, ok: true };
        }));

        return new Response(JSON.stringify({ ok: true, sent: results.length, results }), {
            status: 200,
            headers: { 'content-type': 'application/json', ...corsHeaders }
        });
    } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: String(e) }), {
            status: 500,
            headers: { 'content-type': 'application/json', ...corsHeaders }
        });
    }
}


