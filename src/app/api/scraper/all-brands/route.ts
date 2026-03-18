import { NextResponse } from 'next/server';

const N8N_WEBHOOK_URL = 'https://n8n.ksinuevos.com/webhook/buscar-todas-las-marcas';

/**
 * Proxy para el webhook de n8n (buscar todas las marcas).
 * Evita CORS: el navegador llama a esta ruta y el servidor llama a n8n.
 */
export async function POST() {
    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        const rawText = await response.text();
        if (!response.ok) {
            console.error('[API Scraper] n8n all-brands error:', response.status, rawText.slice(0, 500));
            return NextResponse.json(
                { status: 'error', message: `n8n respondió ${response.status}. ${rawText.slice(0, 200)}` },
                { status: response.status }
            );
        }

        let data: unknown;
        try {
            data = JSON.parse(rawText);
        } catch {
            return NextResponse.json(
                { status: 'error', message: 'La respuesta de n8n no es JSON válido' },
                { status: 502 }
            );
        }

        return NextResponse.json(data);
    } catch (err) {
        console.error('[API Scraper] Error al llamar n8n (all-brands):', err);
        return NextResponse.json(
            { status: 'error', message: err instanceof Error ? err.message : 'Error interno del proxy' },
            { status: 500 }
        );
    }
}
