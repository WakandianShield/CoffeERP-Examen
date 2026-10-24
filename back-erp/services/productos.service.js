// ADMINISTRA EL CATALOGO Y LOS CAMBIOS DE INVENTARIO CON SUS MOTIVOS.
const baseDatos = require("../config/baseDatos").promise();
const transaccion = require("../lib/transaccion");
const validar = require("../lib/validacion");
const Producto = require("../models/producto.model");
const MovimientoInventario = require("../models/movimientoInventario.model");

// CONSULTA EL CATALOGO CON PRECIOS, EXISTENCIAS Y UNIDADES RESERVADAS.
async function listar() {
  const [filas] = await baseDatos.query("SELECT * FROM products ORDER BY name");
  return filas.map((fila) => new Producto(fila));
}

// CREA EL PRODUCTO CON PRECIO Y MINIMO; LAS EXISTENCIAS SE MODIFICAN MEDIANTE OPERACIONES DE INVENTARIO.
async function crear(datos) {
  const [resultado] = await baseDatos.execute(
    "INSERT INTO products(name,price_cents,minimum) VALUES(?,?,?)",
    [
      validar.texto(datos.nombre, "Nombre"),
      validar.entero(datos.precioCentavos, "Precio"),
      validar.entero(datos.minimo, "Mínimo", 0),
    ],
  );
  return { id: resultado.insertId };
}

// EDITA NOMBRE, PRECIO, MINIMO Y ESTADO SIN CAMBIAR DIRECTAMENTE LAS EXISTENCIAS.
async function actualizar(id, datos) {
  if (typeof datos.activo !== "boolean") validar.fallar("Estado inválido");
  const [resultado] = await baseDatos.execute(
    "UPDATE products SET name=?,price_cents=?,minimum=?,active=? WHERE id=?",
    [
      validar.texto(datos.nombre, "Nombre"),
      validar.entero(datos.precioCentavos, "Precio"),
      validar.entero(datos.minimo, "Mínimo", 0),
      datos.activo,
      id,
    ],
  );
  if (!resultado.affectedRows) validar.fallar("Producto no encontrado", 404);
  return { mensaje: "Producto actualizado" };
}

// CONSULTA LAS ULTIMAS 200 ENTRADAS Y SALIDAS CON EL NOMBRE DEL PRODUCTO.
async function movimientos() {
  const [filas] = await baseDatos.query(
    "SELECT m.*,p.name FROM stock_movements m JOIN products p ON p.id=m.product_id ORDER BY m.id DESC LIMIT 200",
  );
  return filas.map((fila) => new MovimientoInventario(fila));
}

// SUMA O RESTA EXISTENCIAS Y GUARDA EL MOTIVO; IMPIDE RETIRAR UNIDADES QUE YA ESTAN RESERVADAS.
async function ajuste(datos) {
  const id = validar.entero(datos.idProducto, "Producto");
  const cantidad = validar.entero(datos.cantidad, "Cantidad", -100000, 100000);
  if (!cantidad) validar.fallar("La cantidad no puede ser cero");
  const motivo = validar.texto(datos.motivo, "Motivo", 150);
  await transaccion(async (conexion) => {
    const [filas] = await conexion.execute(
      "SELECT * FROM products WHERE id=? FOR UPDATE",
      [id],
    );
    if (!filas.length) validar.fallar("Producto no encontrado", 404);
    // EL RESULTADO DEL AJUSTE DEBE ALCANZAR PARA LAS UNIDADES QUE YA ESTAN APARTADAS EN OTRAS VENTAS.
    if (filas[0].stock + cantidad < filas[0].reserved)
      validar.fallar("No se puede retirar stock reservado o inexistente", 409);
    await conexion.execute("UPDATE products SET stock=stock+? WHERE id=?", [
      cantidad,
      id,
    ]);
    // GUARDA EL MOTIVO JUNTO CON EL CAMBIO DE EXISTENCIAS PARA PODER REVISARLO EN EL HISTORIAL.
    await conexion.execute(
      "INSERT INTO stock_movements(product_id,quantity,reason) VALUES(?,?,?)",
      [id, cantidad, motivo],
    );
  });
  return { mensaje: "Movimiento registrado" };
}

module.exports = { listar, crear, actualizar, movimientos, ajuste };
