// RELACIONA LAS RUTAS DEL MODULO CON SUS CONTROLADORES Y APLICA LOS PERMISOS ANTES DE EJECUTARLOS.
const enrutador = require("express").Router();
const { permitirModulo } = require("../middleware/autenticacion");
const productos = require("../controllers/productos.controller");

enrutador.get("/productos", productos.listar);
enrutador.post("/productos", permitirModulo("INVENTARIO"), productos.crear);
enrutador.put(
  "/productos/:id",
  permitirModulo("INVENTARIO"),
  productos.actualizar,
);
enrutador.get(
  "/inventario",
  permitirModulo("INVENTARIO"),
  productos.movimientos,
);
enrutador.post("/inventario", permitirModulo("INVENTARIO"), productos.ajuste);

module.exports = enrutador;
