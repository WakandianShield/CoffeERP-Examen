// RELACIONA LAS RUTAS DEL MODULO CON SUS CONTROLADORES Y APLICA LOS PERMISOS ANTES DE EJECUTARLOS.
const enrutador = require("express").Router();
const { permitirModulo } = require("../middleware/autenticacion");
const compras = require("../controllers/compras.controller");

enrutador.get(
  "/proveedores",
  permitirModulo("COMPRAS"),
  compras.listarProveedores,
);
enrutador.post(
  "/proveedores",
  permitirModulo("COMPRAS"),
  compras.crearProveedor,
);
enrutador.get("/compras", permitirModulo("COMPRAS"), compras.listar);
enrutador.post("/compras", permitirModulo("COMPRAS"), compras.crear);

module.exports = enrutador;
