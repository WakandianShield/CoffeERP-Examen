// RECIBE PETICIONES HTTP, LLAMA AL SERVICIO DEL MODULO Y ENVIA SU RESPUESTA AL FRONTEND.
const servicio = require("../services/empleados.service");

// DEVUELVE LOS EXPEDIENTES DE EMPLEADOS.
async function listar(solicitud, respuesta) {
  respuesta.json(await servicio.listar());
}

// PIDE GUARDAR UN EMPLEADO Y RESPONDE CON 201.
async function crear(solicitud, respuesta) {
  respuesta.status(201).json(await servicio.crear(solicitud.body));
}

// PASA EL ID Y LOS DATOS DEL EMPLEADO PARA ACTUALIZAR SU EXPEDIENTE.
async function actualizar(solicitud, respuesta) {
  respuesta.json(
    await servicio.actualizar(solicitud.params.id, solicitud.body),
  );
}

// DEVUELVE EL HISTORIAL DE SALARIOS PAGADOS.
async function listarNomina(solicitud, respuesta) {
  respuesta.json(await servicio.listarNomina());
}

// SOLICITA REGISTRAR EL SALARIO DEL PERIODO Y RESPONDE CON 201.
async function pagarNomina(solicitud, respuesta) {
  respuesta.status(201).json(await servicio.pagarNomina(solicitud.body));
}

module.exports = { listar, crear, actualizar, listarNomina, pagarNomina };
