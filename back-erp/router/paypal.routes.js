// ESTAS RUTAS YA PASARON POR EL FILTRO GENERAL DE SESION EN APP.JS.
const enrutador = require("express").Router();
const { permitirModulo } = require("../middleware/autenticacion");
const paypal = require("../controllers/paypal.controller");

// TAMBIEN SE EXIGE EL MODULO VENTAS ANTES DE CONSULTAR, CREAR O CAPTURAR ORDENES.
enrutador.use(permitirModulo("VENTAS"));
enrutador.get("/configuracion", paypal.configuracion);
enrutador.post("/orden", paypal.crearOrden);
enrutador.post("/capturar/:orderId", paypal.capturarOrden);

module.exports = enrutador;
