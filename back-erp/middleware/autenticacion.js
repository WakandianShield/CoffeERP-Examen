// COMPRUEBA QUIEN HACE LA PETICION Y SI SU CUENTA TIENE PERMISO PARA CONTINUAR.
const jwt = require("jsonwebtoken");

// LEE EL TOKEN DEL ENCABEZADO DE LA PETICION Y REVISA SU FIRMA Y VENCIMIENTO.
function verificarToken(solicitud, respuesta, siguiente) {
  const encabezado = solicitud.headers["authorization"];
  // EL ENCABEZADO CONTIENE DOS PARTES: BEARER Y EL TOKEN; SE TOMA LA SEGUNDA.
  const token = encabezado && encabezado.split(" ")[1];

  if (!token) {
    return respuesta.status(401).json({ mensaje: "Token requerido" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (error, contenido) => {
    // RECHAZA FIRMAS INVALIDAS, TOKENS VENCIDOS Y PERFILES QUE NO TIENEN LOS CAMPOS ACTUALES.
    if (error || !contenido.id || !contenido.rol) {
      return respuesta
        .status(401)
        .json({ mensaje: "Token inválido o expirado" });
    }
    // GUARDA EL PERFIL VERIFICADO PARA QUE LAS SIGUIENTES FUNCIONES CONOZCAN AL USUARIO.
    solicitud.usuario = contenido;
    siguiente();
  });
}

// DEVUELVE UN FILTRO QUE SOLO DEJA PASAR A LOS ROLES INDICADOS.
function permitirRoles(...roles) {
  return (solicitud, respuesta, siguiente) => {
    if (!roles.includes(solicitud.usuario.rol)) {
      return respuesta.status(403).json({ mensaje: "Sin permisos" });
    }
    siguiente();
  };
}

// DEJA PASAR AL ADMINISTRADOR O A UNA CUENTA QUE TENGA ASIGNADO EL MODULO SOLICITADO.
function permitirModulo(modulo) {
  return (solicitud, respuesta, siguiente) => {
    if (
      solicitud.usuario.rol === "ADMIN" ||
      (solicitud.usuario.modulos || []).includes(modulo)
    ) {
      return siguiente();
    }
    respuesta
      .status(403)
      .json({ mensaje: "Módulo no disponible en tu cuenta" });
  };
}

module.exports = { verificarToken, permitirRoles, permitirModulo };
