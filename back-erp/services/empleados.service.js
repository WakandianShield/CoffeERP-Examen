// ADMINISTRA EMPLEADOS Y REGISTRA LOS SALARIOS PAGADOS EN EL LIBRO DE FINANZAS.
const baseDatos = require("../config/baseDatos").promise();
const transaccion = require("../lib/transaccion");
const validar = require("../lib/validacion");
const Empleado = require("../models/empleado.model");
const Nomina = require("../models/nomina.model");

// CONSULTA LOS EXPEDIENTES DE EMPLEADOS ORDENADOS POR NOMBRE.
async function listar() {
  const [filas] = await baseDatos.query(
    "SELECT * FROM employees ORDER BY name",
  );
  return filas.map((fila) => new Empleado(fila));
}

// VALIDA LOS DATOS DEL EMPLEADO Y SU SALARIO EN CENTAVOS ANTES DE GUARDARLO.
async function crear(datos) {
  const [resultado] = await baseDatos.execute(
    "INSERT INTO employees(name,position,email,salary_cents) VALUES(?,?,?,?)",
    [
      validar.texto(datos.nombre, "Nombre"),
      validar.texto(datos.puesto, "Puesto"),
      validar.correo(datos.correo),
      validar.entero(datos.salarioCentavos, "Salario"),
    ],
  );
  return { id: resultado.insertId };
}

// CAMBIA LOS DATOS Y EL ESTADO DEL EMPLEADO; AVISA SI EL ID NO EXISTE.
async function actualizar(id, datos) {
  if (typeof datos.activo !== "boolean") validar.fallar("Estado inválido");
  const [resultado] = await baseDatos.execute(
    "UPDATE employees SET name=?,position=?,email=?,salary_cents=?,active=? WHERE id=?",
    [
      validar.texto(datos.nombre, "Nombre"),
      validar.texto(datos.puesto, "Puesto"),
      validar.correo(datos.correo),
      validar.entero(datos.salarioCentavos, "Salario"),
      datos.activo,
      id,
    ],
  );
  if (!resultado.affectedRows) validar.fallar("Empleado no encontrado", 404);
  return { mensaje: "Empleado actualizado" };
}

// CONSULTA LOS ULTIMOS 200 PAGOS DE SALARIO CON EL NOMBRE DEL EMPLEADO.
async function listarNomina() {
  const [filas] = await baseDatos.query(
    "SELECT n.*,e.name FROM payroll n JOIN employees e ON e.id=n.employee_id ORDER BY n.id DESC LIMIT 200",
  );
  return filas.map((fila) => new Nomina(fila));
}

// USA EL SALARIO GUARDADO DEL EMPLEADO ACTIVO Y REGISTRA SU PAGO Y EL EGRESO DEL PERIODO.
async function pagarNomina(datos) {
  const id = validar.entero(datos.idEmpleado, "Empleado");
  // ACEPTA SOLO UN PERIODO CON ANO Y MES VALIDOS, COMO 2026-10.
  const periodo = datos.periodo;
  if (typeof periodo !== "string" || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(periodo))
    validar.fallar("Periodo inválido: AAAA-MM");
  await transaccion(async (conexion) => {
    const [filas] = await conexion.execute(
      "SELECT * FROM employees WHERE id=? AND active=1 FOR UPDATE",
      [id],
    );
    if (!filas.length) validar.fallar("Empleado inexistente o inactivo");
    // TOMA EL SALARIO DE MYSQL; LA CLAVE UNICA DE EMPLEADO Y PERIODO IMPIDE PAGAR EL MISMO MES DOS VECES.
    const [resultado] = await conexion.execute(
      "INSERT INTO payroll(employee_id,period,amount_cents) VALUES(?,?,?)",
      [id, periodo, filas[0].salary_cents],
    );
    // EL EGRESO USA EL MISMO SALARIO Y SE GUARDA DENTRO DE LA TRANSACCION DEL PAGO.
    await conexion.execute(
      "INSERT INTO ledger(kind,concept,amount_cents,reference) VALUES(?,?,?,?)",
      [
        "EGRESO",
        `Nómina ${periodo}: ${filas[0].name}`,
        filas[0].salary_cents,
        `payroll:${resultado.insertId}`,
      ],
    );
  });
  return { mensaje: "Pago de nómina registrado" };
}

module.exports = { listar, crear, actualizar, listarNomina, pagarNomina };
