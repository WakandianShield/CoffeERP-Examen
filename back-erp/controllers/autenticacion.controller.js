// RECIBE PETICIONES HTTP, LLAMA AL SERVICIO DEL MODULO Y ENVIA SU RESPUESTA AL FRONTEND.
const autenticacion = require("../services/autenticacion.service");

// ENVIA LAS CREDENCIALES AL SERVICIO Y DEVUELVE EL TOKEN Y EL PERFIL.
async function iniciarSesion(solicitud, respuesta) {
  respuesta.json(
    await autenticacion.iniciarSesion(
      solicitud.body.correo,
      solicitud.body.contrasena,
    ),
  );
}

// DEVUELVE SOLO LOS DATOS PUBLICOS DEL USUARIO QUE YA FUE VERIFICADO.
function perfil(solicitud, respuesta) {
  const { id, nombre, correo, rol, modulos } = solicitud.usuario;
  respuesta.json({ id, nombre, correo, rol, modulos });
}

// PIDE CREAR LA CUENTA Y RESPONDE CON 201 CUANDO EL REGISTRO SE GUARDA.
async function crearUsuario(solicitud, respuesta) {
  respuesta
    .status(201)
    .json(await autenticacion.registrarUsuario(solicitud.body));
}

module.exports = { iniciarSesion, perfil, crearUsuario };
