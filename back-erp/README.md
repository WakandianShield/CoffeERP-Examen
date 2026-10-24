# Backend Express y MySQL

La API recibe las peticiones de Angular, verifica la sesión y los permisos y ejecuta las operaciones de los cinco módulos. Ejecuta los comandos desde `back-erp` para que `dotenv` encuentre `.env`.

La [guía principal](../README.md) explica la instalación y el proceso completo de autenticación. Aquí se detallan las capas, los métodos de negocio y las rutas.

Una **API** es el conjunto de direcciones que ofrece el servidor para consultar datos o pedir acciones. Angular manda una petición a una de esas direcciones; Express revisa los datos, realiza la operación y devuelve una respuesta. MySQL conserva los registros del sistema.

Los procesos completos están en [Autenticación y permisos](#autenticación-y-permisos), [PayPal](#paypal-cómo-se-crea-y-se-confirma-el-pago) y [Envío de correos](#envío-de-correos-cómo-se-prepara-y-se-manda-el-xml).

## Capas y archivos

| Archivo o carpeta             | Responsabilidad                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| `app.js`                      | Carga configuración, abre la conexión, registra filtros y rutas y arranca Express. |
| `config/baseDatos.js`         | Conexión MySQL con `host`, `user`, `password` y `database`.                        |
| `router/*.routes.js`          | Método HTTP, dirección, permisos y controlador de cada operación.                  |
| `controllers/*.controller.js` | Lee `body`, `params` y el usuario; llama al servicio y envía la respuesta.         |
| `services/*.service.js`       | Validaciones, consultas SQL, transacciones y reglas de negocio.                    |
| `models/*.model.js`           | Convierte columnas SQL en propiedades en español.                                  |
| `middleware/autenticacion.js` | `verificarToken`, `permitirRoles` y `permitirModulo`.                              |
| `middleware/errores.js`       | Manejo común de errores con respuestas JSON.                                       |
| `lib/validacion.js`           | Valida texto, correo, contraseña, enteros y carrito.                               |
| `lib/transaccion.js`          | Ejecuta una operación entre inicio de transacción, confirmación y reversión.       |
| `sql/schema.sql`              | Tablas, relaciones y restricciones de unicidad.                                    |

Las carpetas mantienen sus nombres. Las terminaciones `.routes`, `.controller`, `.service` y `.model` identifican las responsabilidades. Los servicios no reciben objetos de Express: reciben datos, IDs o perfiles y devuelven resultados o lanzan errores. Los modelos actuales representan datos; no ejecutan consultas.

## Orden de ejecución de una petición

1. `express.json()` interpreta el cuerpo JSON.
2. Express busca una ruta que coincida con la dirección y el método HTTP.
3. `verificarToken` valida la sesión cuando la ruta lo requiere.
4. El filtro de rol o módulo comprueba el permiso de la cuenta.
5. El controlador extrae datos como `solicitud.body` o `solicitud.params.id`.
6. El servicio valida los valores y realiza la operación. Si trabaja con una venta, comprueba además su propietario cuando corresponde.
7. El controlador envía el resultado con el código HTTP y formato adecuados. Una excepción pasa a `manejarError`.

En `app.js`, las rutas de autenticación se registran antes de `app.use('/api', verificarToken)` para que el inicio de sesión sea público. Dentro de `autenticacion.routes.js`, tanto el perfil como la creación de cuentas tienen su propio `verificarToken`; crear cuentas también exige ADMIN. Las demás rutas quedan detrás del filtro general de sesión.

## Autenticación y permisos

La autenticación comprueba **quién hace la petición**. Los permisos comprueban **si esa cuenta puede hacer lo que pide**. El backend toma ambas decisiones antes de permitir las operaciones protegidas.

### Cómo se guarda una cuenta

Las cuentas de acceso se guardan en la tabla `users`. Son independientes de los expedientes de empleados: registrar un empleado no le crea automáticamente una contraseña para entrar.

La contraseña de una cuenta nueva debe tener entre 10 y 72 caracteres, al menos una mayúscula, un número y un símbolo. Estas reglas se comprueban en el servidor, además de lo que pida el formulario.

Al crear una cuenta mediante POST `/api/autenticacion/usuarios`, se exige una sesión de ADMIN. `registrarUsuario()`, en `services/autenticacion.service.js`, valida los datos y usa bcrypt para generar un **hash** de la contraseña: un valor calculado que permite comprobarla después sin guardar el texto original. El rol debe ser ADMIN o CAJERO. ADMIN recibe todos los módulos; CAJERO recibe los módulos válidos solicitados y, si no queda ninguno, VENTAS.

### Qué pasa al iniciar sesión

1. Angular manda `correo` y `contrasena` a POST `/api/autenticacion/iniciar-sesion`. Esta ruta es pública porque la persona todavía no tiene token.
2. `router/autenticacion.routes.js` elige el controlador. El controlador llama a `iniciarSesion()` de `services/autenticacion.service.js`.
3. `buscarPorCorreo()` consulta una cuenta activa en MySQL. `bcrypt.compare()` comprueba si la contraseña recibida corresponde al hash guardado.
4. Si las credenciales no coinciden, responde `401` con un mensaje de credenciales incorrectas. El formato de los datos también se valida.
5. Si coinciden, `usuario.paraCliente()` prepara el perfil con `id`, `nombre`, `correo`, `rol` y `modulos`. Excluye la contraseña y su hash.
6. `jwt.sign()` firma ese perfil usando `JWT_SECRET` y le da una duración de una hora. El resultado es un **JWT**, un texto firmado que funciona como comprobante de acceso.
7. El servidor devuelve `{ token, usuario }`. Angular guarda el token en la pestaña y lo manda en las siguientes peticiones.

El token está firmado, no cifrado: su contenido se puede leer, pero cambiarlo invalida la firma. Por eso no contiene la contraseña. `JWT_SECRET` debe permanecer en `back-erp/.env`; nunca se manda al navegador.

### Cómo se comprueba una petición protegida

Angular agrega este encabezado a la petición:

```http
Authorization: Bearer <TOKEN_DE_LA_SESION>
```

`verificarToken()`, en `middleware/autenticacion.js`, obtiene el token, comprueba su firma y vencimiento y exige que tenga `id` y `rol`. Si falta o no es válido, responde 401. Si lo acepta, deja el perfil en `solicitud.usuario` para que las siguientes funciones sepan qué cuenta está operando.

Después se comprueba el permiso de la operación:

| Comprobación                               | Qué decide                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `permitirRoles('ADMIN')`                   | La cuenta debe tener ese rol; se usa al crear usuarios.                                          |
| `permitirModulo('VENTAS')`, por ejemplo    | Permite ADMIN o una cuenta que tenga VENTAS en sus módulos.                                      |
| `obtenerVenta()`, en el servicio de ventas | La venta debe pertenecer a la cuenta solicitante. ADMIN puede acceder a ventas de otras cuentas. |

Si hay sesión, pero falta el rol, el módulo o la propiedad de la venta, se devuelve `403`. Por ejemplo, un CAJERO con solo VENTAS puede consultar sus ventas, pero no administrar Finanzas ni capturar una venta de otro cajero.

### Recargar, cerrar sesión y cambiar permisos

Al recargar Angular, GET `/api/autenticacion/perfil` verifica el token y devuelve su perfil. El servidor no vuelve a consultar la cuenta en MySQL en cada petición: utiliza los datos firmados al iniciar sesión. Por eso los cambios posteriores de rol o módulos requieren un nuevo inicio de sesión; no cambian automáticamente los tokens ya emitidos.

Cerrar sesión borra el token y el perfil del navegador. El backend no mantiene una lista para anular esos tokens y no ofrece renovación automática. Un token emitido conserva su vencimiento de una hora. Los guards y el menú de Angular ayudan a navegar, mientras que estas comprobaciones de Express protegen las operaciones aunque alguien envíe la petición manualmente.

## Métodos HTTP y endpoints

GET consulta información; POST crea un registro o solicita una acción; PUT modifica un producto o empleado existente. No hay rutas DELETE o PATCH. Para desactivar un producto o empleado se utiliza PUT con `activo: false` y el resto de sus datos.

Todas las direcciones de esta tabla incluyen el prefijo `/api`. ADMIN supera los permisos por módulo y puede consultar ventas de cualquier propietario.

| Método | Endpoint                            | Permiso adicional a la sesión | Resultado                                     |
| ------ | ----------------------------------- | ----------------------------- | --------------------------------------------- |
| POST   | `/api/autenticacion/iniciar-sesion` | Público; no requiere sesión   | Token y perfil.                               |
| GET    | `/api/autenticacion/perfil`         | Ninguno                       | Perfil del token verificado.                  |
| POST   | `/api/autenticacion/usuarios`       | ADMIN                         | Nueva cuenta.                                 |
| GET    | `/api/productos`                    | Ninguno                       | Catálogo, existencias y reservas.             |
| POST   | `/api/productos`                    | INVENTARIO                    | Nuevo producto.                               |
| PUT    | `/api/productos/:id`                | INVENTARIO                    | Producto actualizado.                         |
| GET    | `/api/inventario`                   | INVENTARIO                    | Historial de movimientos.                     |
| POST   | `/api/inventario`                   | INVENTARIO                    | Ajuste de unidades con motivo.                |
| GET    | `/api/proveedores`                  | COMPRAS                       | Lista de proveedores.                         |
| POST   | `/api/proveedores`                  | COMPRAS                       | Nuevo proveedor.                              |
| GET    | `/api/compras`                      | COMPRAS                       | Últimas compras.                              |
| POST   | `/api/compras`                      | COMPRAS                       | Compra, entrada de inventario y egreso.       |
| GET    | `/api/empleados`                    | RRHH                          | Expedientes laborales.                        |
| POST   | `/api/empleados`                    | RRHH                          | Nuevo empleado.                               |
| PUT    | `/api/empleados/:id`                | RRHH                          | Expediente actualizado.                       |
| GET    | `/api/nomina`                       | RRHH                          | Historial de salarios pagados.                |
| POST   | `/api/nomina`                       | RRHH                          | Salario del periodo y egreso.                 |
| GET    | `/api/finanzas`                     | FINANZAS                      | Movimientos y totales.                        |
| POST   | `/api/finanzas`                     | FINANZAS                      | Movimiento manual.                            |
| GET    | `/api/ventas/configuracion`         | VENTAS                        | ID público de PayPal y modo de pruebas.       |
| GET    | `/api/ventas`                       | VENTAS                        | Ventas permitidas para la cuenta.             |
| POST   | `/api/ventas/efectivo`              | VENTAS                        | Venta pagada en efectivo.                     |
| POST   | `/api/ventas/paypal`                | VENTAS                        | Reserva y orden PayPal.                       |
| POST   | `/api/ventas/:id/capturar`          | VENTAS y propietario          | Captura o recuperación del resultado de pago. |
| POST   | `/api/ventas/:id/cancelar`          | VENTAS y propietario          | Cancelación si el estado lo permite.          |
| GET    | `/api/ventas/:id/xml`               | VENTAS y propietario          | XML de una venta pagada.                      |
| POST   | `/api/ventas/:id/correo`            | VENTAS y propietario          | Envío de factura de una venta pagada.         |

## Principales métodos del código

El checkout de Angular utiliza estas rutas adicionales, todas protegidas por JWT y el módulo VENTAS:

| Método | Endpoint                        | Función                                                              |
| ------ | ------------------------------- | -------------------------------------------------------------------- |
| GET    | `/api/paypal/configuracion`     | Obtiene el ID público para preparar el SDK.                          |
| POST   | `/api/paypal/orden`             | Crea la venta y la orden con el carrito, cliente y correo recibidos. |
| POST   | `/api/paypal/capturar/:orderId` | Busca la venta por su ID externo de PayPal y confirma su cobro.      |

`router/paypal.routes.js` conecta estas rutas con `controllers/paypal.controller.js`. El controlador reutiliza las reglas de `ventas.service.js`; las órdenes, precios, reservas y estados persisten en MySQL.

`obtenerToken()` de `paypal.service.js` obtiene el token privado con autenticación Basic y `grant_type=client_credentials`. `paypalRequest()` lo utiliza como Bearer para crear, consultar o capturar órdenes en `/v2/checkout/orders`. Las peticiones tienen un tiempo límite y los fallos de red se devuelven como 502. La captura guarda REVISION antes de salir al proveedor.

| Archivo                    | Métodos                                                                       | Qué hacen                                                                         |
| -------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `autenticacion.service.js` | `buscarPorCorreo`, `iniciarSesion`, `registrarUsuario`                        | Buscan cuentas activas, validan credenciales y crean cuentas con hash y permisos. |
| `productos.service.js`     | `listar`, `crear`, `actualizar`, `movimientos`, `ajuste`                      | Administran catálogo y movimientos, respetando las unidades reservadas.           |
| `compras.service.js`       | `listarProveedores`, `crearProveedor`, `listar`, `crear`                      | Administran proveedores y guardan compra, inventario y egreso juntos.             |
| `empleados.service.js`     | `listar`, `crear`, `actualizar`, `listarNomina`, `pagarNomina`                | Administran expedientes y registran salarios por empleado y mes.                  |
| `finanzas.service.js`      | `listar`, `crear`                                                             | Consultan el libro y sus totales o registran movimientos manuales.                |
| `ventas.service.js`        | `crear`, `listar`, `capturar`, `cancelar`, `descargarFactura`, `enviarCorreo` | Coordinan reservas, cobros y acceso a las facturas.                               |
| `paypal.service.js`        | `obtenerToken`, `paypalRequest`, `verificarCaptura`                           | Llaman a PayPal y comprueban identidad, estado, moneda e importe del cobro.       |
| `facturas.service.js`      | `generarXml`, `enviarFactura`                                                 | Preparan el XML académico y solicitan su envío como archivo adjunto.              |
| `lib/validacion.js`        | `texto`, `correo`, `entero`, `contrasena`, `carrito`, `fallar`                | Validan datos y detienen una operación con un error controlado.                   |
| `lib/transaccion.js`       | `transaccion`                                                                 | Confirma todos los cambios relacionados o los revierte si algo falla.             |

Los controladores suelen usar nombres de método equivalentes a la operación del servicio. Por ejemplo, `productos.controller.js` tiene `crear(solicitud, respuesta)`: recibe los datos HTTP y llama a `productos.service.js`. El método `crear(datos)` del servicio comprueba los datos y ejecuta el INSERT.

## Ejemplo de petición protegida

```http
POST /api/productos
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

```json
{
  "nombre": "Café americano",
  "precioCentavos": 4500,
  "minimo": 5
}
```

Requiere INVENTARIO o ADMIN. Si se guarda, responde `201` con `{ "id": 10 }`, donde el ID depende de MySQL. La consulta posterior devuelve propiedades como `nombre` y `precioCentavos`, aunque las columnas sean `name` y `price_cents`.

Para una compra se envían `idProveedor` y `productos`, cada uno con `id`, `cantidad` y `costoCentavos`. Para una venta se envían `cliente`, `correo` y productos con `id` y `cantidad`; los precios de venta se consultan en MySQL. La creación PayPal devuelve `id` para la orden externa e `idVenta` para el folio local.

## Transacciones, pagos y errores

Compras y nómina guardan el registro principal y su egreso en una transacción. Las ventas reservan productos y confirman inventario e ingreso al completar el pago. Las restricciones únicas de la base ayudan a impedir salarios, referencias contables o capturas repetidas.

PayPal conserva sus claves externas en inglés y solo se usa en Sandbox. Una operación incierta permanece en REVISION. Un error del correo no revierte el cobro; la factura se puede descargar o reenviar.

`manejarError` responde duplicados con `409`, conserva los códigos de errores previstos y devuelve un mensaje general para `500`. Los errores JSON usan la propiedad `mensaje`. La factura descargada se envía como `application/xml` con nombre de archivo.

## Conexión y ejecución

Configura `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET` y `PORT` en `.env`. MySQL usa el puerto 3306 y la configuración horaria predeterminada del controlador. `PORT` es el puerto HTTP de Express, normalmente 3200 en este proyecto.

Los importes se guardan como centavos enteros. Las sumas de finanzas se convierten explícitamente a número porque MySQL puede devolverlas como texto.

```bash
npm ci
npm start
```

`npm run dev` inicia el servidor con vigilancia de archivos. `npm test` ejecuta `test/paypal.test.js`: comprueba rutas, permisos, cálculo de precios, reservas, captura, reintentos, fallos de red y recuperación de pagos con MySQL y PayPal simulados. No realiza cobros ni envía correos reales.

## PayPal: cómo se crea y se confirma el pago

Hay tres participantes: Angular muestra el carrito y el botón, Express calcula y guarda la venta, y PayPal autoriza y procesa el pago. Este proyecto usa únicamente **Sandbox**, el entorno de pruebas de PayPal.

### Archivos y configuración

| Archivo                            | Responsabilidad                                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `app.js`                           | Monta `/api/paypal` después del filtro general de sesión.                                                      |
| `router/paypal.routes.js`          | Exige el módulo VENTAS y conecta configuración, creación y captura con sus controladores.                      |
| `controllers/paypal.controller.js` | Lee la petición, llama al servicio de ventas y envía la respuesta para el checkout.                            |
| `services/ventas.service.js`       | Comprueba el propietario, calcula el total, reserva productos, guarda estados y confirma inventario e ingreso. |
| `services/paypal.service.js`       | Obtiene el token de PayPal, envía sus peticiones y revisa los datos del cobro.                                 |

En `back-erp/.env` se definen estos valores y después se reinicia Express:

```dotenv
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_CLIENT_ID=TU_CLIENT_ID_SANDBOX
PAYPAL_CLIENT_SECRET=TU_SECRET_SANDBOX
```

GET `/api/paypal/configuracion` devuelve el ID público como `idCliente` y el modo de pruebas. La clave secreta permanece en Express. El servicio de Angular está en `coffeERP/src/app/componentes/ventas/checkout/servicios/paypal.service.ts`.

### El token de PayPal es distinto del token de sesión

El **JWT del sistema** identifica al usuario de CoffeERP y permite comprobar sus permisos. El **token de PayPal** autoriza a Express a operar con la cuenta de PayPal configurada. No sirven para lo mismo y el token de PayPal no se entrega a Angular.

`obtenerToken()` combina el ID de cliente y su secreto, los representa en Base64 y manda POST a `/v1/oauth2/token` con autenticación Basic y `grant_type=client_credentials`. Base64 es una forma de representar el texto, no un cifrado. PayPal devuelve un token de acceso. `paypalRequest()` lo obtiene para enviar la operación con `Authorization: Bearer <TOKEN_PAYPAL>`. Estas llamadas salen del backend, no del navegador.

### Crear la orden y apartar los productos

El checkout envía POST `/api/paypal/orden`. Un ejemplo del cuerpo es:

```json
{
  "cliente": "Ana",
  "correo": "ana@example.com",
  "productos": [{ "id": 1, "cantidad": 2 }]
}
```

1. El servidor comprueba el JWT y VENTAS. El controlador llama a `crear(datos, usuario, 'PAYPAL')`.
2. El servicio valida nombre, correo y carrito. Consulta los productos activos y sus precios en MySQL; no acepta que Angular determine el precio de venta.
3. Comprueba las unidades disponibles: existencias menos unidades ya apartadas. Guarda la venta en CREANDO, sus productos y sus precios y aumenta la reserva.
4. Esos cambios se guardan dentro de una **transacción**: se confirman juntos o se deshacen juntos si falla esa parte. Las filas se bloquean mientras se revisan para evitar que dos compras usen simultáneamente las mismas unidades disponibles.
5. `paypalRequest('/v2/checkout/orders', 'POST', ...)` crea la orden en PayPal con intención CAPTURE, moneda MXN y el total en pesos con dos decimales. MySQL mantiene los importes como centavos enteros.
6. Se guarda el ID externo en `sales.paypal_id` y la venta pasa a CREADA. Se devuelve `{ id, idVenta, total }`: `id` es la orden de PayPal e `idVenta` es el folio local.

Por ejemplo, dos productos de 4500 centavos dan 9000 centavos. El importe que se manda a PayPal es `90.00` MXN. Si la creación falla después de guardar la reserva, el código intenta cancelarla y liberar las unidades locales.

### Capturar y comprobar el cobro

Aprobar la ventana de PayPal no marca por sí solo la venta como pagada. El checkout debe enviar POST `/api/paypal/capturar/:orderId`.

1. `capturarOrden()` busca en MySQL la venta relacionada con ese ID externo. `obtenerVenta()` exige ser su propietario o ADMIN.
2. Antes de contactar a PayPal, `capturar()` guarda REVISION. Así un resultado incierto no permite liberar productos como si nunca hubiera existido un cobro.
3. Consulta GET `/v2/checkout/orders/:orderId`. Si PayPal responde APPROVED, solicita POST a `/v2/checkout/orders/:orderId/capture`. Si ya estaba completada, comprueba el resultado obtenido.
4. `verificarCaptura()` exige la misma orden, estado COMPLETED, exactamente una captura completada con ID, moneda MXN e importe igual al total guardado.
5. Solo entonces se confirma la venta en una transacción: marca PAGADA, guarda el ID del cobro, descuenta existencias, reduce reservas y registra el ingreso en finanzas.
6. `confirmarVenta()` comprueba si ya estaba PAGADA para no descontar ni registrar el ingreso otra vez. Además se reutiliza el folio como `PayPal-Request-Id`, que permite reconocer reintentos de una misma operación en PayPal.
7. Después de confirmar, `notificar()` intenta enviar la factura. El controlador responde `{ mensaje, orderId, captureId, estado, idVenta, estadoCorreo }` al checkout.

`orderId` identifica la orden de PayPal; `captureId` identifica su cobro; `idVenta` identifica la venta de CoffeERP. Las rutas del historial siguen usando el folio local y mantienen sus respuestas anteriores.

### Estados y recuperación

| Estado local de la venta | Qué significa                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| CREANDO                  | Ya se está preparando la venta local y la solicitud de orden.                                      |
| CREADA                   | La orden de PayPal quedó relacionada con la venta; el cobro todavía no está confirmado localmente. |
| REVISION                 | Se está comprobando el pago o no se logró confirmar su resultado. Mantiene las reservas.           |
| PAGADA                   | Se verificó el cobro y se registraron inventario e ingreso.                                        |
| CANCELADA                | Se canceló la reserva local y se liberaron sus unidades.                                           |

Un fallo de comunicación no demuestra que PayPal no haya cobrado. Ante un resultado incierto, se conserva REVISION. El botón **Verificar pago** usa POST `/api/ventas/:id/capturar` para consultar o capturar por el folio local. No hay una comprobación periódica automática ni un webhook que procese avisos de PayPal; la recuperación actual se hace solicitando esa verificación.

POST `/api/ventas/:id/cancelar` consulta el estado de PayPal antes de intentar liberar la reserva. Rechaza pagos aprobados o inciertos y no cancela una venta PAGADA o en REVISION. Cerrar la ventana de PayPal tampoco libera automáticamente las unidades. Esta operación de reserva no realiza devoluciones de cobros completados.

Las llamadas tienen un tiempo máximo de espera. Si el proveedor no confirma la operación, el backend puede devolver 502; si el pago no pasa la verificación, devuelve 409. Las órdenes se conservan en MySQL y sobreviven a un reinicio de Express.

## Envío de correos: cómo se prepara y se manda el XML

Después de pagar, el cliente recibe un correo con un archivo XML adjunto. **Brevo** es el servicio externo al que Express solicita ese envío. El backend prepara el comprobante y usa el correo que quedó guardado en la venta.

### Configuración necesaria

Se definen estos valores en `back-erp/.env` y se reinicia el backend:

```dotenv
BREVO_API_KEY=TU_CLAVE_API_BREVO
MAIL_FROM=tu-remitente-autorizado@example.com
```

`BREVO_API_KEY` permite al backend identificarse ante Brevo. `MAIL_FROM` es la dirección remitente configurada para enviar desde ese servicio; no es la dirección del cliente. El destinatario es `venta.correo`, capturado en el formulario de Ventas. Ninguna de estas claves privadas se coloca en Angular.

### Proceso automático después de pagar

1. `crear()` en una venta en efectivo, o `capturar()` en PayPal, confirma primero el pago, las existencias y el ingreso.
2. `notificar()`, en `services/ventas.service.js`, recupera la venta y sus productos y llama a `enviarFactura()` de `services/facturas.service.js`.
3. Si esa venta ya tiene el correo ENVIADA, `enviarFactura()` responde que ya fue aceptado y no manda otra solicitud al proveedor.
4. `generarXml()` prepara un texto con folio, fecha, cliente, correo, productos, cantidades, precios, total en MXN y referencia del pago. Usa los datos guardados de la venta. Limpia caracteres que podrían romper el XML.
5. Convierte el XML a **Base64**, una representación de texto que permite incluir el archivo en la petición JSON. No lo cifra ni necesita guardar un archivo temporal en una carpeta de subidas.
6. Envía POST a `https://api.brevo.com/v3/smtp/email`, con la clave en el encabezado `api-key`. Incluye remitente, destinatario, asunto, mensaje y el adjunto `factura-<folio>.xml`. La espera máxima de esa petición es de 15 segundos.
7. Si Brevo acepta la petición, guarda `sales.email_status='ENVIADA'` y el `messageId` si el proveedor lo devolvió. El mensaje de respuesta indica que el servicio de correo aceptó la factura.

El XML es un comprobante académico sin validez fiscal; no incluye timbrado CFDI. El archivo se puede volver a generar a partir de los datos de MySQL.

### Pago y correo se guardan por separado

| Estado del correo | Qué representa                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| PENDIENTE         | No se ha confirmado la aceptación del envío. Es también el estado inicial y puede permanecer así si falta configuración. |
| ERROR             | Falló el proceso dentro del intento de envío; por ejemplo, Brevo rechazó la petición o no respondió a tiempo.            |
| ENVIADA           | Brevo aceptó la solicitud. No es una confirmación de entrega en la bandeja del cliente.                                  |

Si faltan `BREVO_API_KEY` o `MAIL_FROM`, `enviarFactura()` devuelve un error 503 antes de contactar al proveedor. Si falla dentro de su intento de envío, procura guardar ERROR y lanza el error. En el envío automático, `notificar()` atrapa ese fallo y devuelve `estadoCorreo: 'PENDIENTE'` en la respuesta de pago; el historial puede mostrar ERROR porque vuelve a leer el estado guardado en MySQL.

El fallo del correo no deshace un pago confirmado. Una venta puede estar PAGADA con correo ERROR. No se vuelve a cobrar ni se repite el descuento de inventario por solicitar después el envío de la factura.

### Solicitar de nuevo el correo y descargar la factura

POST `/api/ventas/:id/correo` permite solicitar el envío desde el historial. Exige token válido, módulo VENTAS, ser propietario de la venta o ADMIN, y que la venta esté PAGADA. El controlador llama a `ventas.enviarCorreo()`; este recupera los datos mediante `obtenerFactura()` y después usa `enviarFactura()`. No recibe un nuevo destinatario: usa el que ya está guardado.

Si el proveedor ya había aceptado la factura y ese estado quedó guardado, la operación no la vuelve a enviar. Si la respuesta anterior se perdió después de que Brevo aceptara el mensaje, un reintento podría duplicarlo. No hay una cola de reintentos automáticos ni un proceso que confirme la entrega final; el historial muestra el último estado local.

GET `/api/ventas/:id/xml` aplica las mismas comprobaciones de acceso a una venta pagada, genera el XML y lo devuelve como `application/xml` para descargarlo. Esta descarga funciona sin Brevo, incluso si el envío está pendiente o falló.
