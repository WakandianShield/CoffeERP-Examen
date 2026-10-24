// RECIBE PETICIONES HTTP, LLAMA AL SERVICIO DEL MODULO Y ENVIA SU RESPUESTA AL FRONTEND.
const servicio = require("../services/finanzas.service");

// DEVUELVE LOS MOVIMIENTOS Y TOTALES DEL LIBRO DE FINANZAS.
async function listar(solicitud, respuesta) {
  respuesta.json(await servicio.listar());
}

// PASA EL MOVIMIENTO MANUAL AL SERVICIO Y CONFIRMA SU REGISTRO CON 201.
async function crear(solicitud, respuesta) {
  respuesta.status(201).json(await servicio.crear(solicitud.body));
}

module.exports = { listar, crear };
