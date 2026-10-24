// RELACIONA LAS RUTAS DEL MODULO CON SUS CONTROLADORES Y APLICA LOS PERMISOS ANTES DE EJECUTARLOS.
const enrutador = require("express").Router();
const { permitirModulo } = require("../middleware/autenticacion");
const empleados = require("../controllers/empleados.controller");

enrutador.get("/empleados", permitirModulo("RRHH"), empleados.listar);
enrutador.post("/empleados", permitirModulo("RRHH"), empleados.crear);
enrutador.put("/empleados/:id", permitirModulo("RRHH"), empleados.actualizar);
enrutador.get("/nomina", permitirModulo("RRHH"), empleados.listarNomina);
enrutador.post("/nomina", permitirModulo("RRHH"), empleados.pagarNomina);

module.exports = enrutador;
