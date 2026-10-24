// RECIBE PETICIONES HTTP, LLAMA AL SERVICIO DEL MODULO Y ENVIA SU RESPUESTA AL FRONTEND.
const servicio = require("../services/compras.service");

// DEVUELVE LA LISTA DE PROVEEDORES.
async function listarProveedores(solicitud, respuesta) {
  respuesta.json(await servicio.listarProveedores());
}

// PIDE GUARDAR AL PROVEEDOR Y RESPONDE CON 201.
async function crearProveedor(solicitud, respuesta) {
  respuesta.status(201).json(await servicio.crearProveedor(solicitud.body));
}

// DEVUELVE LAS COMPRAS RECIENTES.
async function listar(solicitud, respuesta) {
  respuesta.json(await servicio.listar());
}

// PASA LA COMPRA AL SERVICIO Y RESPONDE CUANDO LA RECEPCION Y EL PAGO QUEDAN REGISTRADOS.
async function crear(solicitud, respuesta) {
  respuesta.status(201).json(await servicio.crear(solicitud.body));
}

module.exports = { listarProveedores, crearProveedor, listar, crear };
