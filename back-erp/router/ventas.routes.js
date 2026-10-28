// RELACIONA LAS RUTAS DEL MODULO CON SUS CONTROLADORES Y APLICA LOS PERMISOS ANTES DE EJECUTARLOS.
const enrutador = require("express").Router();
const { permitirModulo } = require("../middleware/autenticacion");
const ventas = require("../controllers/ventas.controller");

enrutador.use(permitirModulo("VENTAS"));

enrutador.get("/configuracion", ventas.configuracion);
enrutador.get("/", ventas.listar);
enrutador.post("/efectivo", ventas.efectivo);
enrutador.post("/paypal", ventas.conPaypal);
enrutador.post("/:id/capturar", ventas.capturar);
enrutador.post("/:id/verificar", ventas.verificar);
enrutador.post("/:id/cancelar", ventas.cancelar);
enrutador.get("/:id/xml", ventas.xml);
enrutador.post("/:id/correo", ventas.correo);

module.exports = enrutador;
