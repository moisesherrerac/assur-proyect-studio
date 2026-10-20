# Cambios y validación v2 - 20 de octubre de 2026

Se agregó el informe PDF/CSV de equipos y materiales, con resumen por tipo/estado y detalle por código. Glosas editables persistidas en el proyecto. Metrados únicamente después de calibrar; rutas y equipos con unidades separadas.

Se reforzaron archivos y autoguardado, conservación de equipos al aplicar filtros, cancelación de imágenes, detección sin geometría de relleno, numeración sin colisiones, Deshacer/Rehacer, datos de cajetín, cabecera adaptable, resumen de cálculo local y selector A3/A4.

Validación:
- 11 pruebas automatizadas aprobadas, incluyendo archivos inválidos, códigos, glosas, unidades, CSV y PDF con muchas páginas.
- TypeScript y compilación aprobados.
- Informe de muestra de 2 páginas generado con la misma función de la aplicación; ambas páginas renderizadas y revisadas visualmente.
- Navegador local: carga de ejemplo, equipos conservados al aplicar filtros, glosa editable recuperada al recargar, calibración recuperada y Deshacer de una eliminación.
- Cabecera sin controles fuera del viewport a 1366 y 768 px. No se afirma compatibilidad táctil del editor.
- La espera del evento de descarga del navegador automatizado no finalizó; la aplicación no registró errores y el generador PDF se verificó directamente con sus archivos resultantes.

Alcance: aplicación estática; no se agregaron cuentas, servicios de pago, nube ni integración de IA. El proyecto de prueba y el PDF de ejemplo contienen datos ilustrativos.
