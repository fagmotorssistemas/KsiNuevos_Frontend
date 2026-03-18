import { NextRequest, NextResponse } from 'next/server';

const N8N_WEBHOOK_URL = 'https://n8n.ksinuevos.com/webhook/buscar-producto-marketplace';

/**
 * Proxy para el webhook de n8n (buscar producto en Marketplace).
 * Evita CORS: el navegador llama a esta ruta (mismo origen) y el servidor llama a n8n.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const searchValue = typeof body?.searchValue === 'string' ? body.searchValue.trim() : '';
        if (!searchValue) {
            return NextResponse.json(
                { status: 'error', message: 'searchValue es requerido y debe ser un string no vacío' },
                { status: 400 }
            );
        }

        // Timeout 5 min: el scrape (Apify + OpenAI + DB) puede tardar mucho; 524 = timeout del proxy/origen
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchValue }),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const rawText = await response.text();
        if (!response.ok) {
            console.error('[API Scraper] n8n error:', response.status, rawText.slice(0, 500));
            return NextResponse.json(
                { status: 'error', message: `n8n respondió ${response.status}. ${rawText.slice(0, 200)}` },
                { status: response.status }
            );
        }

        let data: unknown;
        try {
            data = JSON.parse(rawText);
        } catch {
            console.error('[API Scraper] Respuesta n8n no es JSON:', rawText.slice(0, 300));
            return NextResponse.json(
                { status: 'error', message: 'La respuesta de n8n no es JSON válido' },
                { status: 502 }
            );
        }

        return NextResponse.json(data);
    } catch (err) {
        console.error('[API Scraper] Error al llamar n8n:', err);
        const isTimeout = err instanceof Error && err.name === 'AbortError';
        return NextResponse.json(
            {
                status: 'error',
                message: isTimeout
                    ? 'El scrape tardó demasiado (timeout 5 min). n8n puede haber terminado bien; revisa el workflow en n8n.'
                    : err instanceof Error ? err.message : 'Error interno del proxy',
            },
            { status: isTimeout ? 504 : 500 }
        );
    }
}
