---
name: autoevaluacion-codigo
description: Autoevaluación y optimización continua (React y TypeScript). Úsala después de cada cambio de código en este repo para revisar si la solución es la más óptima, eficiente y mantenible, y cierra cada cambio con el reporte analítico breve que define.
---

# Skill de Autoevaluación y Optimización Continua (React & TypeScript)

## Propósito
Analizar de forma crítica cada cambio realizado en el código para determinar si la solución implementada es la más óptima, eficiente y mantenible, o si existe una alternativa arquitectónica superior.

## Criterios de Evaluación Obligatorios
Después de cada modificación, debes autoevaluar el código bajo los siguientes cuatro pilares:

1. **¿Es la mejor solución posible? (Eficiencia Dinámica)**
   - Evaluar si el código introduce re-renders innecesarios en React.
   - Verificar si la lógica de estado está en el lugar correcto o si requiere abstracción a un Custom Hook.
   - Validar que no se estén duplicando procesos que puedan resolverse con derivadas de estado en lugar de `useEffect`.

2. **TypeScript Estricto e Inferencia**
   - Asegurar que no existan tipos laxos (`any`, `unknown` sin validar).
   - Validar que las interfaces de las Props sean robustas, reutilizables y autodocumentadas.

3. **Mantenibilidad y Clean Code**
   - Verificar la legibilidad, principios SOLID y que el componente mantenga una única responsabilidad.
   - Evaluar si el acoplamiento con librerías externas o APIs es limpio.

4. **Internacionalización y Escalabilidad**
   - Asegurar que los textos dinámicos o estáticos estén listos para ser localizados correctamente (por ejemplo, estructurados para `react-i18next`) y no "harcodeados".

## Formato de Salida Post-Cambio
Tras procesar o realizar un cambio, muestra siempre un reporte analítico breve:
- **Análisis de la Solución Aplicada:** Por qué se hizo así.
- **Alternativa Descartada (Si aplica):** Qué otra opción había y por qué esta es mejor.
- **Puntaje de Optimización:** [Excelente / Optimizada] o [Funcional / Requiere Refactorización].
- **Sugerencia de Iteración:** Código exacto si existe una manera aún más limpia de escribirlo.
