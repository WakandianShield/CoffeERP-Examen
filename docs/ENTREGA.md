# Entrega local de CoffeERP

Incluye frontend Angular, backend Express, esquema SQL, README, SRS, 26 diagramas, wireframes, mockups y evidencias de casos de uso.

Esta revisión recupera los colores oscuros, acentos café, menú lateral y paneles translúcidos del proyecto original. Se conserva el alcance simplificado de cinco módulos. El proyecto se entrega en el repositorio CoffeERP-Examen y en ZIP.

## Ejecutar

1. Instalar Node.js 22.12 o superior y MySQL 8 o MariaDB compatible.
2. Seguir el README principal para crear una base nueva y completar back-erp/.env a partir de .env.example.
3. Ejecutar npm ci en back-erp y coffeERP.
4. Ejecutar npm run init-db en back-erp e iniciar el backend con npm start.
5. Iniciar Angular con npm start en coffeERP y abrir http://localhost:4200.

No se incluyen contraseñas, tokens, .env, node_modules ni datos de una base de producción.

## Verificación realizada

- Compilación de producción Angular.
- 12 pruebas del backend aprobadas con SQL y Express reales.
- Formularios de producto, ajuste, proveedor, compra, venta, empleado, salario y gasto operados en Chromium.
- Descarga real de XML, error de correo por falta de claves, rechazo de nómina duplicada, guard de cajero y vista móvil de 390px.

Las pruebas automáticas conservan respuestas externas controladas para comprobar fallos. Además, se ejecutaron pruebas con las APIs reales: captura de $1.00 MXN en PayPal Sandbox con tarjeta ficticia oficial, estado COMPLETED, una sola entrada contable y dos facturas XML entregadas por Brevo. El SDK v6 se inicializó; el acceso de la cuenta compradora por contraseña no se validó. Las claves reales se entregan en una configuración privada separada. El XML es un comprobante académico sin validez fiscal.

## Documentación

- El PDF del SRS conserva literalmente la portada del documento entregado como referencia, incluida su fecha y el texto de Práctica 2.
- El índice, objetivo, requisitos, diagramas, maquetados, evidencia, conclusión y bibliografía se actualizaron.
- Los diagramas se incluyen como SVG y DOT; los wireframes como SVG.
- Las capturas se identifican por caso de uso y contienen datos ficticios.
