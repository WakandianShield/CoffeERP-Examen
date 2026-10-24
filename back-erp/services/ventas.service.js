// COORDINA LA VENTA: CALCULA EL TOTAL, RESERVA PRODUCTOS, CONFIRMA EL PAGO Y PREPARA LA FACTURA.
const { randomUUID } = require("node:crypto");
const baseDatos = require("../config/baseDatos").promise();
const transaccion = require("../lib/transaccion");
const validar = require("../lib/validacion");
const paypal = require("./paypal.service");
const { generarXml, enviarFactura } = require("./facturas.service");
const DetalleVenta = require("../models/detalleVenta.model");
const Venta = require("../models/venta.model");
const Producto = require("../models/producto.model");

// BUSCA LA VENTA Y COMPRUEBA QUE SEA DEL USUARIO O QUE LA CUENTA SEA ADMINISTRADORA.
async function obtenerVenta(
  id,
  usuario,
  conexion = baseDatos,
  bloquear = false,
) {
  // CUANDO SE PIDE BLOQUEO, MYSQL PROTEGE LA FILA HASTA QUE TERMINE LA TRANSACCION.
  const [filas] = await conexion.execute(
    `SELECT * FROM sales WHERE id=?${bloquear ? " FOR UPDATE" : ""}`,
    [id],
  );
  if (!filas.length) validar.fallar("Venta no encontrada", 404);
  const venta = new Venta(filas[0]);
  if (venta.idUsuario !== usuario.id && usuario.rol !== "ADMIN")
    validar.fallar("Sin acceso a esta venta", 403);
  return venta;
}
// CONSULTA LOS PRODUCTOS, CANTIDADES Y PRECIOS GUARDADOS EN LA VENTA.
async function obtenerDetalles(id, conexion = baseDatos) {
  const [filas] = await conexion.execute(
    "SELECT * FROM sale_items WHERE sale_id=? ORDER BY product_id",
    [id],
  );
  return filas.map((fila) => new DetalleVenta(fila));
}

// SI LA VENTA NO ESTABA PAGADA, DESCUENTA EXISTENCIAS, LIBERA RESERVAS Y REGISTRA EL INGRESO.
async function confirmarVenta(conexion, venta, idCaptura = null) {
  // ESTA SALIDA EVITA DESCONTAR PRODUCTOS O REGISTRAR EL INGRESO OTRA VEZ AL REPETIR LA CONFIRMACION.
  if (venta.estado === "PAGADA") return;
  const detalles = await obtenerDetalles(venta.id, conexion);
  for (const detalle of detalles) {
    await conexion.execute(
      "UPDATE products SET stock=stock-?,reserved=reserved-? WHERE id=?",
      [detalle.cantidad, detalle.cantidad, detalle.idProducto],
    );
    await conexion.execute(
      "INSERT INTO stock_movements(product_id,quantity,reason) VALUES(?,?,?)",
      [detalle.idProducto, -detalle.cantidad, `Venta ${venta.id}`],
    );
  }
  await conexion.execute(
    "UPDATE sales SET status='PAGADA',capture_id=? WHERE id=?",
    [idCaptura, venta.id],
  );
  // LA REFERENCIA UNICA DE LA VENTA TAMBIEN IMPIDE INSERTAR DOS VECES SU INGRESO.
  await conexion.execute(
    "INSERT INTO ledger(kind,concept,amount_cents,reference) VALUES(?,?,?,?)",
    ["INGRESO", `Venta ${venta.id}`, venta.totalCentavos, `sale:${venta.id}`],
  );
}
// INTENTA ENVIAR LA FACTURA; SI EL CORREO FALLA, LO DEJA PENDIENTE SIN DESHACER LA VENTA.
async function notificar(id, usuario) {
  const venta = await obtenerVenta(id, usuario);
  const detalles = await obtenerDetalles(id);
  try {
    await enviarFactura(venta, detalles);
    return "ENVIADA";
  } catch {
    return "PENDIENTE";
  }
}
// VALIDA EL PEDIDO, CALCULA EL TOTAL CON PRECIOS DE MYSQL Y RESERVA LOS PRODUCTOS ANTES DE COBRAR.
async function crear(datos, usuario, metodo) {
  const cliente = validar.texto(datos.cliente, "Cliente");
  const correo = validar.correo(datos.correo);
  const carrito = validar.carrito(datos.productos);
  if (
    metodo === "PAYPAL" &&
    (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET)
  )
    validar.fallar("Configura PayPal Sandbox en el backend", 503);
  const id = randomUUID();
  await transaccion(async (conexion) => {
    let total = 0;
    const detalles = [];

    // EL CARRITO YA VIENE ORDENADO POR ID; REVISA Y BLOQUEA LOS PRODUCTOS EN ESE ORDEN.
    for (const detalle of carrito) {
      const [filas] = await conexion.execute(
        "SELECT * FROM products WHERE id=? AND active=1 FOR UPDATE",
        [detalle.id],
      );
      if (
        !filas.length ||
        filas[0].stock - filas[0].reserved < detalle.cantidad
      )
        validar.fallar("Producto sin existencia suficiente", 409);
      const producto = new Producto(filas[0]);
      // USA EL PRECIO GUARDADO EN MYSQL Y NO UN PRECIO ENVIADO DESDE EL NAVEGADOR.
      total += producto.precioCentavos * detalle.cantidad;
      detalles.push({ ...detalle, ...producto });
    }
    validar.entero(total, "Total");
    await conexion.execute(
      "INSERT INTO sales(id,user_id,customer,email,total_cents,status,method) VALUES(?,?,?,?,?,?,?)",
      [id, usuario.id, cliente, correo, total, "CREANDO", metodo],
    );
    // GUARDA UNA COPIA DEL PRECIO Y DEL NOMBRE DE CADA PRODUCTO Y APARTA SUS UNIDADES.
    for (const detalle of detalles) {
      await conexion.execute("INSERT INTO sale_items VALUES(?,?,?,?,?)", [
        id,
        detalle.id,
        detalle.nombre,
        detalle.cantidad,
        detalle.precioCentavos,
      ]);
      await conexion.execute(
        "UPDATE products SET reserved=reserved+? WHERE id=?",
        [detalle.cantidad, detalle.id],
      );
    }
    // EN EFECTIVO EL COBRO SE CONFIRMA DE INMEDIATO DENTRO DE ESTA MISMA TRANSACCION.
    if (metodo === "EFECTIVO")
      await confirmarVenta(conexion, {
        id,
        totalCentavos: total,
        estado: "CREANDO",
      });
  });
  if (metodo === "EFECTIVO") {
    const estadoCorreo = await notificar(id, usuario);
    return { id, mensaje: "Venta pagada en efectivo", estadoCorreo };
  }
  try {
    const venta = await obtenerVenta(id, usuario);
    // ENVIA A PAYPAL EL TOTAL EN PESOS; LAS CLAVES EN INGLES SON OBLIGATORIAS EN SU API.
    const orden = await paypal.paypalRequest(
      "/v2/checkout/orders",
      "POST",
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            custom_id: id,
            amount: {
              currency_code: "MXN",
              value: (venta.totalCentavos / 100).toFixed(2),
            },
          },
        ],
      },
      id,
    );
    if (!orden.id) validar.fallar("PayPal no devolvió una orden", 502);
    await baseDatos.execute(
      "UPDATE sales SET paypal_id=?,status='CREADA' WHERE id=?",
      [orden.id, id],
    );
    return {
      id: orden.id,
      idVenta: id,
      total: (venta.totalCentavos / 100).toFixed(2),
    };
  } catch (error) {
    // SI NO SE PUDO ENTREGAR LA ORDEN AL NAVEGADOR, INTENTA LIBERAR LA RESERVA LOCAL.
    await cancelarReserva(id, usuario);
    throw error;
  }
}
// LIBERA LAS UNIDADES RESERVADAS Y MARCA LA VENTA CANCELADA SI EL PAGO NO ESTA CONFIRMADO NI EN REVISION.
async function cancelarReserva(id, usuario) {
  await transaccion(async (conexion) => {
    const venta = await obtenerVenta(id, usuario, conexion, true);
    if (venta.estado === "CANCELADA") return;
    // NO LIBERA PRODUCTOS SI EL COBRO YA SE CONFIRMO O SI SU RESULTADO TODAVIA ES INCIERTO.
    if (["PAGADA", "REVISION"].includes(venta.estado))
      validar.fallar("Verifica el pago antes de cancelar", 409);
    for (const detalle of await obtenerDetalles(id, conexion))
      await conexion.execute(
        "UPDATE products SET reserved=reserved-? WHERE id=?",
        [detalle.cantidad, detalle.idProducto],
      );
    await conexion.execute("UPDATE sales SET status='CANCELADA' WHERE id=?", [
      id,
    ]);
  });
}
// CONSULTA O CAPTURA EL PAGO EN PAYPAL, COMPRUEBA EL RESULTADO Y SOLO ENTONCES CONFIRMA LA VENTA.
async function capturar(id, usuario) {
  // GUARDA EL ESTADO REVISION ANTES DE CONSULTAR PAYPAL PARA NO CANCELAR UNA VENTA CON COBRO INCIERTO.
  const venta = await transaccion(async (conexion) => {
    const venta = await obtenerVenta(id, usuario, conexion, true);
    if (venta.estado === "PAGADA") return venta;
    if (!venta.idPaypal || venta.estado === "CANCELADA")
      validar.fallar("Orden no disponible para captura", 409);
    await conexion.execute("UPDATE sales SET status='REVISION' WHERE id=?", [
      id,
    ]);
    return venta;
  });
  let idCaptura = venta.idCaptura;
  if (venta.estado !== "PAGADA") {
    let resultado = await paypal.paypalRequest(
      `/v2/checkout/orders/${encodeURIComponent(venta.idPaypal)}`,
    );
    if (resultado.status === "APPROVED")
      resultado = await paypal.paypalRequest(
        `/v2/checkout/orders/${encodeURIComponent(venta.idPaypal)}/capture`,
        "POST",
        {},
        id,
      );
    // REVISA QUE EL COBRO ESTE COMPLETADO Y QUE SU ID, MONEDA E IMPORTE CORRESPONDAN A ESTA VENTA.
    const captura = paypal.verificarCaptura(resultado, venta);
    if (!captura)
      validar.fallar(
        "Pago pendiente de verificación; no se registró como pagado",
        409,
      );
    idCaptura = captura.id;
    // VUELVE A LEER LA VENTA CON BLOQUEO ANTES DE APLICAR EL COBRO Y ACTUALIZAR EL INVENTARIO.
    await transaccion(async (conexion) => {
      const actual = await obtenerVenta(id, usuario, conexion, true);
      await confirmarVenta(conexion, actual, captura.id);
    });
  }
  return {
    id,
    idVenta: id,
    idOrden: venta.idPaypal,
    idCaptura,
    estado: "PAGADA",
    mensaje: "Pago completado",
    estadoCorreo: await notificar(id, usuario),
  };
}

// RELACIONA EL ID DE PAYPAL CON LA VENTA GUARDADA; CAPTURAR VUELVE A COMPROBAR SU PROPIETARIO.
async function capturarOrden(idOrden, usuario) {
  const [filas] = await baseDatos.execute(
    "SELECT id FROM sales WHERE paypal_id=?",
    [idOrden],
  );
  if (!filas.length) validar.fallar("Orden no encontrada", 404);
  return capturar(filas[0].id, usuario);
}
// MUESTRA TODAS LAS VENTAS AL ADMINISTRADOR Y SOLO LAS PROPIAS A LAS DEMAS CUENTAS.
async function listar(usuario) {
  const [filas] = await baseDatos.execute(
    `SELECT * FROM sales ${usuario.rol === "ADMIN" ? "" : "WHERE user_id=?"} ORDER BY created_at DESC LIMIT 200`,
    usuario.rol === "ADMIN" ? [] : [usuario.id],
  );
  return filas.map((fila) => new Venta(fila));
}

// DEVUELVE EL ID PUBLICO DE PAYPAL PARA EL NAVEGADOR; NO ENVIA LA CLAVE SECRETA.
function configuracion() {
  return { idCliente: process.env.PAYPAL_CLIENT_ID || "", pruebas: true };
}

// CONSULTA EL ESTADO DE PAYPAL ANTES DE INTENTAR LIBERAR LOS PRODUCTOS RESERVADOS.
async function cancelar(id, usuario) {
  const venta = await obtenerVenta(id, usuario);

  if (venta.idPaypal && venta.estado !== "CANCELADA") {
    const orden = await paypal.paypalRequest(
      `/v2/checkout/orders/${encodeURIComponent(venta.idPaypal)}`,
    );
    if (
      !["CREATED", "SAVED", "PAYER_ACTION_REQUIRED", "VOIDED"].includes(
        orden.status,
      )
    )
      validar.fallar("Pago aprobado o incierto: usa Verificar pago", 409);
  }
  await cancelarReserva(id, usuario);
  return { mensaje: "Reserva cancelada" };
}

// EXIGE UNA VENTA PAGADA Y CON ACCESO PERMITIDO ANTES DE OBTENER SUS DATOS Y DETALLES.
async function obtenerFactura(id, usuario) {
  const venta = await obtenerVenta(id, usuario);
  if (venta.estado !== "PAGADA") validar.fallar("La venta no está pagada", 409);
  return { venta, detalles: await obtenerDetalles(id) };
}

// GENERA EL CONTENIDO XML DE UNA VENTA PAGADA PARA QUE EL CONTROLADOR LO ENVIE COMO ARCHIVO.
async function descargarFactura(id, usuario) {
  const { venta, detalles } = await obtenerFactura(id, usuario);
  return generarXml(venta, detalles);
}

// OBTIENE LA VENTA PAGADA Y SOLICITA EL ENVIO DE SU FACTURA POR CORREO.
async function enviarCorreo(id, usuario) {
  const { venta, detalles } = await obtenerFactura(id, usuario);
  return enviarFactura(venta, detalles);
}

module.exports = {
  configuracion,
  listar,
  crear,
  capturar,
  capturarOrden,
  cancelar,
  descargarFactura,
  enviarCorreo,
};
