// CONECTA EL CHECKOUT CON LAS VENTAS PERSISTIDAS Y SUS REGLAS DE INVENTARIO Y PAGO.
const ventas = require("../services/ventas.service");

// DEVUELVE SOLO LA CONFIGURACION PUBLICA QUE NECESITA EL SDK DEL NAVEGADOR.
function configuracion(solicitud, respuesta) {
  respuesta.json(ventas.configuracion());
}

// CREA LA VENTA Y SU ORDEN PAYPAL USANDO PRECIOS Y EXISTENCIAS DE MYSQL.
async function crearOrden(solicitud, respuesta) {
  respuesta
    .status(201)
    .json(await ventas.crear(solicitud.body, solicitud.usuario, "PAYPAL"));
}

// RECIBE EL ID EXTERNO DE PAYPAL Y SOLICITA VERIFICAR Y CONFIRMAR SU VENTA LOCAL.
async function capturarOrden(solicitud, respuesta) {
  const resultado = await ventas.capturarOrden(solicitud.params.orderId, solicitud.usuario);
  // ENTREGA LOS IDS DE PAYPAL Y LOS DATOS LOCALES PARA ACTUALIZAR EL HISTORIAL.
  respuesta.json({
    mensaje: resultado.mensaje,
    orderId: resultado.idOrden,
    captureId: resultado.idCaptura,
    estado: resultado.estado,
    idVenta: resultado.idVenta,
    estadoCorreo: resultado.estadoCorreo,
  });
}

module.exports = { configuracion, crearOrden, capturarOrden };
