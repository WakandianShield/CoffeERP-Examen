// CONVIERTE LOS ERRORES EN RESPUESTAS QUE EL FRONTEND PUEDE MOSTRAR AL USUARIO.
// RESPONDE DUPLICADOS CON 409 Y OCULTA LOS DETALLES DE ERRORES INTERNOS CON UN MENSAJE GENERAL.
function manejarError(error, solicitud, respuesta, siguiente) {
  if (error.code === "ER_DUP_ENTRY") {
    return respuesta.status(409).json({
      mensaje: "El registro ya existe (correo o nómina del periodo)",
    });
  }

  // RESPETA EL ERROR PREVISTO POR EL SERVICIO; UN FALLO SIN CODIGO SE TRATA COMO ERROR INTERNO.
  const estado = error.status || 500;
  if (estado === 500) console.error("Error interno:", error.code || error.name);
  respuesta.status(estado).json({
    mensaje: estado === 500 ? "Error interno del servidor" : error.message,
  });
}

module.exports = manejarError;
