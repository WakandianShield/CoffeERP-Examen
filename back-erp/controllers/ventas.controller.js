// RECIBE PETICIONES HTTP, LLAMA AL SERVICIO DEL MODULO Y ENVIA SU RESPUESTA AL FRONTEND.
const ventas = require("../services/ventas.service");

// DEVUELVE LA CONFIGURACION PUBLICA NECESARIA PARA ABRIR PAYPAL.
function configuracion(solicitud, respuesta) {
  respuesta.json(ventas.configuracion());
}

// DEVUELVE LAS VENTAS QUE PUEDE CONSULTAR EL USUARIO ACTUAL.
async function listar(solicitud, respuesta) {
  respuesta.json(await ventas.listar(solicitud.usuario));
}

// PIDE REGISTRAR Y CONFIRMAR UNA VENTA PAGADA EN EFECTIVO.
async function efectivo(solicitud, respuesta) {
  respuesta
    .status(201)
    .json(await ventas.crear(solicitud.body, solicitud.usuario, "EFECTIVO"));
}

// PIDE CREAR LA RESERVA Y LA ORDEN DE PAYPAL PARA UNA NUEVA VENTA.
async function conPaypal(solicitud, respuesta) {
  respuesta
    .status(201)
    .json(await ventas.crear(solicitud.body, solicitud.usuario, "PAYPAL"));
}

// PASA EL FOLIO Y EL USUARIO AL SERVICIO PARA CONFIRMAR O RECUPERAR EL RESULTADO DEL PAGO.
async function capturar(solicitud, respuesta) {
  respuesta.json(await ventas.capturar(solicitud.params.id, solicitud.usuario));
}

// SOLICITA CANCELAR LA VENTA SI SU ESTADO PERMITE LIBERAR LA RESERVA.
async function cancelar(solicitud, respuesta) {
  respuesta.json(await ventas.cancelar(solicitud.params.id, solicitud.usuario));
}

// ENVIA EL XML CON EL TIPO DE ARCHIVO Y EL NOMBRE NECESARIOS PARA DESCARGARLO.
async function xml(solicitud, respuesta) {
  const contenido = await ventas.descargarFactura(
    solicitud.params.id,
    solicitud.usuario,
  );
  respuesta
    .type("application/xml")
    .attachment(`factura-${solicitud.params.id}.xml`)
    .send(contenido);
}

// SOLICITA EL ENVIO DE LA FACTURA DE UNA VENTA PAGADA.
async function correo(solicitud, respuesta) {
  respuesta.json(
    await ventas.enviarCorreo(solicitud.params.id, solicitud.usuario),
  );
}

module.exports = {
  configuracion,
  listar,
  efectivo,
  conPaypal,
  capturar,
  cancelar,
  xml,
  correo,
};
