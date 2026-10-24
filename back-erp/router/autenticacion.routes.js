// RELACIONA LAS RUTAS DEL MODULO CON SUS CONTROLADORES Y APLICA LOS PERMISOS ANTES DE EJECUTARLOS.
const enrutador = require("express").Router();
const {
  verificarToken,
  permitirRoles,
} = require("../middleware/autenticacion");
const autenticacion = require("../controllers/autenticacion.controller");

enrutador.post("/iniciar-sesion", autenticacion.iniciarSesion);
enrutador.get("/perfil", verificarToken, autenticacion.perfil);

enrutador.post(
  "/usuarios",
  verificarToken,
  permitirRoles("ADMIN"),
  autenticacion.crearUsuario,
);

module.exports = enrutador;
