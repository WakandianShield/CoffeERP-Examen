// BUSCA CUENTAS, COMPARA CONTRASENAS Y GENERA EL COMPROBANTE DE INICIO DE SESION.
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const baseDatos = require("../config/baseDatos").promise();
const validar = require("../lib/validacion");
const Usuario = require("../models/usuario.model");

// BUSCA UNA CUENTA ACTIVA POR CORREO; DEVUELVE SUS DATOS O NULO SI NO EXISTE.
async function buscarPorCorreo(correo) {
  // LOS SIGNOS DE INTERROGACION RECIBEN VALORES POR SEPARADO PARA NO ARMAR SQL CON DATOS DEL USUARIO.
  const [filas] = await baseDatos.execute(
    "SELECT * FROM users WHERE email=? AND active=1",
    [correo],
  );
  return filas.length ? new Usuario(filas[0]) : null;
}

// COMPARA LA CONTRASENA CON SU HASH Y DEVUELVE UN PERFIL SEGURO CON UN TOKEN QUE DURA UNA HORA.
async function iniciarSesion(correo, contrasena) {
  const correoValidado = validar.correo(correo);
  if (typeof contrasena !== "string" || contrasena.length > 72)
    validar.fallar("Credenciales incorrectas", 401);
  const usuario = await buscarPorCorreo(correoValidado);
  if (!usuario || !(await bcrypt.compare(contrasena, usuario.hashContrasena)))
    validar.fallar("Credenciales incorrectas", 401);
  // EL PERFIL PUBLICO EXCLUYE EL HASH; EL TOKEN SE FIRMA CON EL SECRETO GUARDADO EN EL SERVIDOR.
  const perfil = usuario.paraCliente();
  const token = jwt.sign(perfil, process.env.JWT_SECRET, {
    subject: String(perfil.id),
    expiresIn: "1h",
    algorithm: "HS256",
  });
  return { token, usuario: perfil };
}

// VALIDA LA CUENTA, GUARDA EL HASH DE LA CONTRASENA Y ASIGNA SOLO MODULOS RECONOCIDOS.
async function registrarUsuario(datos) {
  const nombre = validar.texto(datos.nombre, "Nombre");
  const correo = validar.correo(datos.correo);
  // GUARDA UN HASH PARA COMPARAR CONTRASENAS DESPUES; NO ALMACENA LA CONTRASENA ORIGINAL.
  const hashContrasena = await bcrypt.hash(
    validar.contrasena(datos.contrasena),
    12,
  );
  if (!["ADMIN", "CAJERO"].includes(datos.rol)) validar.fallar("Rol inválido");
  const pedidos = Array.isArray(datos.modulos) ? datos.modulos : [];
  const modulos =
    datos.rol === "ADMIN"
      ? [...Usuario.MODULOS]
      : Usuario.MODULOS.filter((m) => pedidos.includes(m));

  // SI UN CAJERO NO TIENE MODULOS VALIDOS EN LA SOLICITUD, SE LE ASIGNA VENTAS COMO ACCESO MINIMO.
  const finales = modulos.length ? modulos : ["VENTAS"];
  const [resultado] = await baseDatos.execute(
    "INSERT INTO users(name,email,password_hash,role,modules) VALUES(?,?,?,?,?)",
    [nombre, correo, hashContrasena, datos.rol, finales.join(",")],
  );
  return {
    id: resultado.insertId,
    nombre,
    correo,
    rol: datos.rol,
    modulos: finales,
  };
}

module.exports = { iniciarSesion, buscarPorCorreo, registrarUsuario };
