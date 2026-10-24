// RELACIONA LAS RUTAS DEL MODULO CON SUS CONTROLADORES Y APLICA LOS PERMISOS ANTES DE EJECUTARLOS.
const enrutador = require("express").Router();
const { permitirModulo } = require("../middleware/autenticacion");
const finanzas = require("../controllers/finanzas.controller");

enrutador.get("/finanzas", permitirModulo("FINANZAS"), finanzas.listar);
enrutador.post("/finanzas", permitirModulo("FINANZAS"), finanzas.crear);

module.exports = enrutador;
