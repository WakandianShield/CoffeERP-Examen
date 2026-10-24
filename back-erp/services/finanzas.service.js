// CONSULTA INGRESOS Y EGRESOS Y PERMITE REGISTRAR MOVIMIENTOS MANUALES.
const baseDatos = require("../config/baseDatos").promise();
const validar = require("../lib/validacion");
const LibroContable = require("../models/libroContable.model");

// DEVUELVE LOS ULTIMOS 200 MOVIMIENTOS Y LOS TOTALES DE TODO EL HISTORIAL.
async function listar() {
  const [movimientos] = await baseDatos.query(
    "SELECT * FROM ledger ORDER BY id DESC LIMIT 200",
  );
  // SUMA TODO EL HISTORIAL, NO SOLO LOS 200 MOVIMIENTOS QUE SE MUESTRAN EN LA TABLA.
  const [totales] = await baseDatos.query(
    "SELECT COALESCE(SUM(IF(kind='INGRESO',amount_cents,0)),0) income,COALESCE(SUM(IF(kind='EGRESO',amount_cents,0)),0) expense FROM ledger",
  );
  return {
    movimientos: movimientos.map((fila) => new LibroContable(fila)),
    // MYSQL PUEDE DEVOLVER LAS SUMAS COMO TEXTO; LAS CONVIERTE A NUMERO ANTES DE ENVIARLAS.
    ingresos: Number(totales[0].income),
    egresos: Number(totales[0].expense),
  };
}

// REVISA TIPO, CONCEPTO E IMPORTE Y GUARDA UN INGRESO O EGRESO MANUAL.
async function crear(datos) {
  if (!["INGRESO", "EGRESO"].includes(datos.tipo))
    validar.fallar("Tipo inválido");
  await baseDatos.execute(
    "INSERT INTO ledger(kind,concept,amount_cents) VALUES(?,?,?)",
    [
      datos.tipo,
      validar.texto(datos.concepto, "Concepto", 150),
      validar.entero(datos.importeCentavos, "Importe"),
    ],
  );
  return { mensaje: "Movimiento contable registrado" };
}

module.exports = { listar, crear };
