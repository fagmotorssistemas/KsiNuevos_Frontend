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

        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchValue }),
        });

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
        return NextResponse.json(
            { status: 'error', message: err instanceof Error ? err.message : 'Error interno del proxy' },
            { status: 500 }
        );
    }
}
