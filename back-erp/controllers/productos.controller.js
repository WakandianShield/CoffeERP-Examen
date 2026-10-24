// RECIBE PETICIONES HTTP, LLAMA AL SERVICIO DEL MODULO Y ENVIA SU RESPUESTA AL FRONTEND.
const servicio = require("../services/productos.service");

// DEVUELVE EL CATALOGO COMO JSON.
async function listar(solicitud, respuesta) {
  respuesta.json(await servicio.listar());
}

// ENVIA LOS DATOS DEL NUEVO PRODUCTO AL SERVICIO Y RESPONDE CON 201.
async function crear(solicitud, respuesta) {
  respuesta.status(201).json(await servicio.crear(solicitud.body));
}

// ENVIA EL ID DE LA RUTA Y LOS DATOS DEL FORMULARIO PARA EDITAR EL PRODUCTO.
async function actualizar(solicitud, respuesta) {
  respuesta.json(
    await servicio.actualizar(solicitud.params.id, solicitud.body),
  );
}

// DEVUELVE EL HISTORIAL DE ENTRADAS Y SALIDAS.
async function movimientos(solicitud, respuesta) {
  respuesta.json(await servicio.movimientos());
}

// SOLICITA UN AJUSTE DE INVENTARIO Y RESPONDE CON 201 SI SE REGISTRA.
async function ajuste(solicitud, respuesta) {
  respuesta.status(201).json(await servicio.ajuste(solicitud.body));
}

module.exports = { listar, crear, actualizar, movimientos, ajuste };
