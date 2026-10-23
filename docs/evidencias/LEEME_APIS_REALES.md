# Verificación externa de las integraciones

Pruebas realizadas el 21 de octubre de 2026, hora de Ciudad de México.

- PayPal OAuth: respuesta HTTP 200 con las credenciales Sandbox de la aplicación autorizada.
- Orden 9MT738004E0785006: captura 36T4764777771110X, estado COMPLETED, importe MXN 1.00. Fuente: tarjeta ficticia oficial de PayPal Sandbox, confirmada mediante Orders v2. No se utilizó dinero real.
- La venta quedó PAGADA en SQL. Repetir la verificación conservó un único ingreso contable.
- El SDK v6 se inicializó y el botón se habilitó en Angular. El acceso con contraseña de la cuenta compradora no quedó validado; la captura por API con tarjeta Sandbox es una comprobación distinta.
- Brevo registró delivered para las facturas XML de las dos ventas técnicas. Los identificadores de mensaje coinciden con SQL.
- CU05-paypal-real.png y CU06-correo-real.png son capturas de la aplicación en ejecución. Los JSON conservan respuestas resumidas de las APIs, sin claves ni destinatario personal.
- Las capturas CU01-CU08 anteriores conservan la ejecución inicial con datos ficticios. CU06-correo-pendiente.png muestra el estado anterior a configurar Brevo; se conserva como evidencia del manejo de errores. El estado final se documenta en las capturas y registros de APIs reales.
- pruebas-backend.txt corresponde a 12 pruebas controladas de SQL/HTTP, seguridad, concurrencia, errores e idempotencia, independientes de la validación externa.
