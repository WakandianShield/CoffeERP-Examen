// REGISTRA PROVEEDORES Y COMPRAS RECIBIDAS, JUNTO CON SUS EXISTENCIAS Y EGRESOS.
const baseDatos = require("../config/baseDatos").promise();
const transaccion = require("../lib/transaccion");
const validar = require("../lib/validacion");
const Proveedor = require("../models/proveedor.model");
const Compra = require("../models/compra.model");
const DetalleCompra = require("../models/detalleCompra.model");

// CONSULTA LOS PROVEEDORES Y DEVUELVE SUS DATOS ORDENADOS POR NOMBRE.
async function listarProveedores() {
  const [filas] = await baseDatos.query(
    "SELECT * FROM suppliers ORDER BY name",
  );
  return filas.map((fila) => new Proveedor(fila));
}

// REVISA NOMBRE, CORREO Y TELEFONO ANTES DE GUARDAR AL PROVEEDOR.
async function crearProveedor(datos) {
  const telefono = validar.texto(datos.telefono, "Teléfono", 20);
  if (!/^[+0-9 ()-]{7,20}$/.test(telefono)) validar.fallar("Teléfono inválido");
  const [resultado] = await baseDatos.execute(
    "INSERT INTO suppliers(name,email,phone) VALUES(?,?,?)",
    [
      validar.texto(datos.nombre, "Nombre"),
      validar.correo(datos.correo),
      telefono,
    ],
  );
  return { id: resultado.insertId };
}

// CONSULTA LAS ULTIMAS 200 COMPRAS CON EL NOMBRE DE SU PROVEEDOR.
async function listar() {
  const [filas] = await baseDatos.query(
    "SELECT c.*,s.name supplier FROM purchases c JOIN suppliers s ON s.id=c.supplier_id ORDER BY c.id DESC LIMIT 200",
  );
  return filas.map((fila) => new Compra(fila));
}

// CALCULA EL COSTO Y GUARDA COMPRA, DETALLES, ENTRADAS DE INVENTARIO Y EGRESO EN UNA MISMA TRANSACCION.
async function crear(datos) {
  const proveedor = validar.entero(datos.idProveedor, "Proveedor");
  const detalles = validar.carrito(datos.productos).map((detalle) => ({
    ...detalle,
    costo: validar.entero(
      datos.productos.find((p) => p.id === detalle.id).costoCentavos,
      "Costo",
    ),
  }));
  // MULTIPLICA LA CANTIDAD POR EL COSTO UNITARIO EN CENTAVOS Y SUMA TODOS LOS PRODUCTOS.
  const total = validar.entero(
    detalles.reduce((suma, i) => suma + i.cantidad * i.costo, 0),
    "Total",
  );
  // COMPRA, DETALLES, INVENTARIO Y EGRESO DEBEN GUARDARSE JUNTOS PARA EVITAR REGISTROS INCOMPLETOS.
  const id = await transaccion(async (conexion) => {
    const [proveedores] = await conexion.execute(
      "SELECT id FROM suppliers WHERE id=?",
      [proveedor],
    );
    if (!proveedores.length) validar.fallar("Proveedor inexistente");
    const [resultado] = await conexion.execute(
      "INSERT INTO purchases(supplier_id,total_cents) VALUES(?,?)",
      [proveedor, total],
    );
    for (const detalle of detalles) {
      // COMPRUEBA QUE EL PRODUCTO SIGA ACTIVO Y BLOQUEA SU FILA MIENTRAS SE RECIBE LA MERCANCIA.
      const [productos] = await conexion.execute(
        "SELECT id FROM products WHERE id=? AND active=1 FOR UPDATE",
        [detalle.id],
      );
      if (!productos.length) validar.fallar("Producto inexistente o inactivo");
      const registroDetalle = new DetalleCompra({
        purchase_id: resultado.insertId,
        product_id: detalle.id,
        quantity: detalle.cantidad,
        cost_cents: detalle.costo,
      });
      await conexion.execute("INSERT INTO purchase_items VALUES(?,?,?,?)", [
        registroDetalle.idCompra,
        registroDetalle.idProducto,
        detalle.cantidad,
        registroDetalle.costoCentavos,
      ]);
      await conexion.execute("UPDATE products SET stock=stock+? WHERE id=?", [
        detalle.cantidad,
        detalle.id,
      ]);
      await conexion.execute(
        "INSERT INTO stock_movements(product_id,quantity,reason) VALUES(?,?,?)",
        [detalle.id, detalle.cantidad, `Compra #${resultado.insertId}`],
      );
    }
    // REGISTRA LA SALIDA DE DINERO DE ESTA COMPRA Y UNA REFERENCIA QUE IDENTIFICA SU ORIGEN.
    await conexion.execute(
      "INSERT INTO ledger(kind,concept,amount_cents,reference) VALUES(?,?,?,?)",
      [
        "EGRESO",
        `Compra #${resultado.insertId}`,
        total,
        `purchase:${resultado.insertId}`,
      ],
    );
    return resultado.insertId;
  });
  return { id, mensaje: "Compra recibida y pagada; inventario actualizado" };
}

module.exports = { listarProveedores, crearProveedor, listar, crear };
