export default async function handler(req, res) {
    try {
        if (req.method !== 'POST') {
            res.status(405).end();
            return;
        }

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
            res.status(500).json({ ok: false, error: 'Missing TELEGRAM_BOT_TOKEN' });
            return;
        }

        // Разрешаем multipart/form-data
        const form = await req.formData();
        const file = form.get('document');
        const caption = form.get('caption') || '';
        const filename = form.get('filename') || 'brief.pdf';
        const chatIdsRaw = form.get('chat_ids');

        const defaultChatIds = ['1142868244', '521500516'];
        const chatIds = Array.isArray(chatIdsRaw)
            ? chatIdsRaw
            : (typeof chatIdsRaw === 'string' && chatIdsRaw.trim().length > 0
                ? chatIdsRaw.split(',').map(s => s.trim())
                : defaultChatIds);

        if (!file) {
            res.status(400).json({ ok: false, error: 'No document provided' });
            return;
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

        res.status(200).json({ ok: true, sent: results.length, results });
    } catch (e) {
        res.status(500).json({ ok: false, error: String(e) });
    }
}


