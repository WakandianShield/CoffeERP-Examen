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
  if (venta.estado === "CANCELADA")
    validar.fallar("La reserva ya está cancelada", 409);
  const detalles = await obtenerDetalles(venta.id, conexion);
  for (const detalle of detalles) {
    const [actualizacion] = await conexion.execute(
      "UPDATE products SET stock=stock-?,reserved=reserved-? WHERE id=? AND stock>=? AND reserved>=?",
      [
        detalle.cantidad,
        detalle.cantidad,
        detalle.idProducto,
        detalle.cantidad,
        detalle.cantidad,
      ],
    );
    if (!actualizacion.affectedRows)
      validar.fallar(
        "No se pudo confirmar el inventario; revisa la reserva de esta venta",
        409,
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
  const pendiente = await transaccion(async (conexion) => {
    if (metodo === "PAYPAL") {
      // ORDENA LAS PETICIONES DE ESTA CUENTA PARA NO CREAR DOS RESERVAS AL REINTENTAR.
      await conexion.execute("SELECT id FROM users WHERE id=? FOR UPDATE", [
        usuario.id,
      ]);
      const [pendientes] = await conexion.execute(
        "SELECT * FROM sales WHERE user_id=? AND customer=? AND email=? AND method='PAYPAL' AND status IN ('CREANDO','CREADA','REVISION') ORDER BY created_at DESC FOR UPDATE",
        [usuario.id, cliente, correo],
      );
      for (const fila of pendientes) {
        const detalles = await obtenerDetalles(fila.id, conexion);
        const mismoCarrito =
          detalles.length === carrito.length &&
          detalles.every(
            (detalle, indice) =>
              detalle.idProducto === carrito[indice].id &&
              detalle.cantidad === carrito[indice].cantidad,
          );
        if (!mismoCarrito) continue;
        if (fila.status === "REVISION")
          validar.fallar(
            "Este pedido tiene un pago en revisión. Usa Verificar pago antes de volver a pagar.",
            409,
          );
        if (!fila.paypal_id)
          validar.fallar(
            "La orden de este pedido se está preparando. Actualiza el historial antes de reintentar.",
            409,
          );
        // DEVUELVE LA MISMA ORDEN SIN INSERTAR OTRA VENTA NI RESERVAR PRODUCTOS OTRA VEZ.
        return {
          id: fila.paypal_id,
          idVenta: fila.id,
          total: (fila.total_cents / 100).toFixed(2),
        };
      }
    }
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
  if (pendiente) return pendiente;
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
      `${id}:crear`,
    );
    if (!orden.id) validar.fallar("PayPal no devolvió una orden", 502);
    const [actualizacion] = await baseDatos.execute(
      "UPDATE sales SET paypal_id=?,status='CREADA' WHERE id=? AND status='CREANDO'",
      [orden.id, id],
    );
    // NO REACTIVA UNA RESERVA QUE SE CANCELO MIENTRAS PAYPAL CREABA LA ORDEN.
    if (!actualizacion.affectedRows)
      validar.fallar(
        "La reserva se canceló antes de terminar de crear la orden",
        409,
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
// LIBERA CADA RESERVA UNA SOLA VEZ; LA VENTA SE LEE CON BLOQUEO EN LA MISMA TRANSACCION.
async function liberarReserva(conexion, venta) {
  if (venta.estado === "CANCELADA") return;
  if (venta.estado === "PAGADA")
    validar.fallar(
      "La venta ya está pagada y no se puede cancelar su reserva",
      409,
    );
  for (const detalle of await obtenerDetalles(venta.id, conexion)) {
    const [actualizacion] = await conexion.execute(
      "UPDATE products SET reserved=reserved-? WHERE id=? AND reserved>=?",
      [detalle.cantidad, detalle.idProducto, detalle.cantidad],
    );
    if (!actualizacion.affectedRows)
      validar.fallar(
        "No se pudo liberar el inventario; revisa la reserva de esta venta",
        409,
      );
  }
  await conexion.execute("UPDATE sales SET status='CANCELADA' WHERE id=?", [
    venta.id,
  ]);
}

// DESHACE LA RESERVA SI NO SE PUDO CREAR Y ENTREGAR LA ORDEN DE PAYPAL.
async function cancelarReserva(id, usuario) {
  await transaccion(async (conexion) => {
    const venta = await obtenerVenta(id, usuario, conexion, true);
    if (venta.estado === "CANCELADA") return;
    // NO LIBERA PRODUCTOS SI EL COBRO YA SE CONFIRMO O SI SU RESULTADO TODAVIA ES INCIERTO.
    if (["PAGADA", "REVISION"].includes(venta.estado))
      validar.fallar("Verifica el pago antes de cancelar", 409);
    await liberarReserva(conexion, venta);
  });
}

// LA CONSULTA Y LA CONFIRMACION COMPARTEN EL BLOQUEO PARA NO CRUZARSE CON UNA CANCELACION.
async function verificar(id, usuario) {
  const resultado = await transaccion(async (conexion) => {
    const venta = await obtenerVenta(id, usuario, conexion, true);
    const respuesta = {
      id,
      idVenta: id,
      idOrden: venta.idPaypal,
      idCaptura: venta.idCaptura,
      estado: venta.estado,
      estadoCorreo: venta.estadoCorreo,
    };
    if (venta.estado === "PAGADA")
      return { ...respuesta, mensaje: "Pago confirmado" };
    if (venta.estado === "CANCELADA")
      return { ...respuesta, mensaje: "La reserva ya está cancelada" };
    if (!venta.idPaypal)
      return {
        ...respuesta,
        mensaje:
          "La venta todavía no tiene una orden de PayPal disponible para comprobar.",
      };

    await conexion.execute("UPDATE sales SET status='REVISION' WHERE id=?", [
      id,
    ]);
    let orden;
    try {
      orden = await paypal.paypalRequest(
        `/v2/checkout/orders/${encodeURIComponent(venta.idPaypal)}`,
      );
      if (!orden || orden.id !== venta.idPaypal)
        validar.fallar(
          "PayPal devolvió otra orden; el pago sigue en revisión",
          409,
        );
      if (orden.status === "APPROVED") {
        orden = await paypal.paypalRequest(
          `/v2/checkout/orders/${encodeURIComponent(venta.idPaypal)}/capture`,
          "POST",
          {},
          `${id}:capturar`,
        );
      }
    } catch (error) {
      // CONFIRMA REVISION ANTES DE DEVOLVER UN FALLO DE COMUNICACION AL NAVEGADOR.
      return { error };
    }

    const captura = paypal.verificarCaptura(orden, venta);
    if (captura) {
      await confirmarVenta(conexion, venta, captura.id);
      return {
        ...respuesta,
        estado: "PAGADA",
        idCaptura: captura.id,
        mensaje: "Pago confirmado",
      };
    }
    if (paypal.ordenSinPago(orden, venta)) {
      if (orden.status === "VOIDED") {
        await liberarReserva(conexion, venta);
        return {
          ...respuesta,
          estado: "CANCELADA",
          mensaje: "La orden de PayPal está anulada; se liberó la reserva",
        };
      }
      // UNA ORDEN SIN APROBAR NO ES UN COBRO INCIERTO Y PUEDE VOLVER A CREADA.
      await conexion.execute("UPDATE sales SET status='CREADA' WHERE id=?", [
        id,
      ]);
      return {
        ...respuesta,
        estado: "CREADA",
        mensaje:
          "El pago todavía no está aprobado en PayPal. Puedes completar el pago o cancelar la reserva.",
      };
    }
    return {
      ...respuesta,
      estado: "REVISION",
      mensaje:
        "PayPal aún no confirma un cobro válido. La reserva se conserva; vuelve a verificar el pago.",
    };
  });
  if (resultado.error) throw resultado.error;
  if (resultado.estado === "PAGADA")
    resultado.estadoCorreo = await notificar(id, usuario);
  return resultado;
}

// EL CHECKOUT SOLO RECIBE EXITO CUANDO EL PAGO REALMENTE QUEDO CONFIRMADO.
async function capturar(id, usuario) {
  const resultado = await verificar(id, usuario);
  if (resultado.estado !== "PAGADA") validar.fallar(resultado.mensaje, 409);
  return resultado;
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
  const resultado = await transaccion(async (conexion) => {
    const venta = await obtenerVenta(id, usuario, conexion, true);
    if (venta.estado === "CANCELADA")
      return {
        idVenta: id,
        estado: "CANCELADA",
        mensaje: "La reserva ya estaba cancelada",
      };
    if (venta.estado === "PAGADA")
      validar.fallar(
        "La venta ya está pagada. No se puede cancelar su reserva.",
        409,
      );
    if (venta.idPaypal) {
      let orden;
      try {
        orden = await paypal.paypalRequest(
          `/v2/checkout/orders/${encodeURIComponent(venta.idPaypal)}`,
        );
      } catch (error) {
        await conexion.execute(
          "UPDATE sales SET status='REVISION' WHERE id=?",
          [id],
        );
        return { error };
      }
      if (!paypal.ordenSinPago(orden, venta)) {
        await conexion.execute(
          "UPDATE sales SET status='REVISION' WHERE id=?",
          [id],
        );
        return {
          error: Object.assign(
            new Error(
              "No se puede cancelar: PayPal no confirma que la orden esté sin cobros. Usa Verificar pago.",
            ),
            { status: 409 },
          ),
        };
      }
    } else if (venta.estado !== "CREANDO") {
      validar.fallar(
        "La venta no tiene una orden de PayPal que se pueda comprobar; revisa su registro antes de cancelarla",
        409,
      );
    }
    await liberarReserva(conexion, venta);
    return {
      idVenta: id,
      estado: "CANCELADA",
      mensaje: "Reserva cancelada; las existencias están disponibles de nuevo",
    };
  });
  if (resultado.error) throw resultado.error;
  return resultado;
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
  verificar,
  capturarOrden,
  cancelar,
  descargarFactura,
  enviarCorreo,
};
