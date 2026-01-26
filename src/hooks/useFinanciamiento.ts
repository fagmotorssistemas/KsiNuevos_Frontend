import { useState, useEffect } from 'react';
import { contratosService } from '@/services/contratos.service';

export const useFinanciamiento = (contratoId: string) => {
    const [esCredito, setEsCredito] = useState(false);
    const [numeroCuotas, setNumeroCuotas] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!contratoId) return;

        const cargarAmortizacion = async () => {
            try {
                setLoading(true);
                // Llamamos a la fuente de la verdad: la tabla de cuotas
                const cuotas = await contratosService.getAmortizacion(contratoId);
                
                // Si hay más de 1 cuota, es crédito.
                if (cuotas && cuotas.length > 0) {
                    setNumeroCuotas(cuotas.length);
                    setEsCredito(true);
                } else {
                    setNumeroCuotas(0);
                    setEsCredito(false);
                }
            } catch (error) {
                console.error("Error validando financiamiento:", error);
                // Si falla, asumimos contado por seguridad o manejamos el error
                setEsCredito(false);
            } finally {
                setLoading(false);
            }
        };

        cargarAmortizacion();
    }, [contratoId]);

    // Devolvemos funciones helper para obtener el texto automáticamente
    const obtenerTextoLegal = () => {
        if (loading) return "Cargando condiciones de pago...";
        
        if (esCredito) {
            return `El valor financiado se pagará en ${numeroCuotas} cuotas mensuales, que corresponden al pago de capital e interés, de acuerdo al siguiente detalle:`;
        } else {
            return "El valor financiado se pagará en un solo pago, que corresponde al pago de capital e interés, de acuerdo al siguiente detalle:";
        }
    };

    return { 
        esCredito, 
        numeroCuotas, 
        loading,
        obtenerTextoLegal
    };
};