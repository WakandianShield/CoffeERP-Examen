-- AGREGA LOS PERMISOS A LAS BASES ANTIGUAS SIN BORRAR CUENTAS NI CAMBIAR SUS CONTRASENAS.
-- SI LA COLUMNA YA EXISTE, NO HACE CAMBIOS.
SET @existe_modulos = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'modules'
);
SET @actualizar_usuarios = IF(
  @existe_modulos = 0,
  'ALTER TABLE users ADD COLUMN modules SET(''VENTAS'',''COMPRAS'',''INVENTARIO'',''RRHH'',''FINANZAS'') NOT NULL DEFAULT ''VENTAS''',
  'SELECT ''La tabla de usuarios ya tiene permisos'' AS mensaje'
);
PREPARE actualizar_usuarios FROM @actualizar_usuarios;
EXECUTE actualizar_usuarios;
DEALLOCATE PREPARE actualizar_usuarios;
