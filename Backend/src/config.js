const required = ['JWT_SECRET', 'DATABASE_URL'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Falta la variable de entorno ${key} (revisa Backend/.env)`);
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: process.env.JWT_SECRET,
  // Registro abierto salvo que se cierre a propósito con ALLOW_REGISTRATION=false.
  allowRegistration: process.env.ALLOW_REGISTRATION !== 'false',
  isProd: process.env.NODE_ENV === 'production',
  // Dirección pública de la web: base de los enlaces de los correos (nunca se toma de la petición).
  appUrl: (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/+$/, ''),
  // Opcional: correo vía Gmail (SMTP) para recuperar la contraseña. Sin él, la opción no se muestra.
  // Google muestra la contraseña de aplicación con espacios ("abcd efgh ..."): se quitan.
  mail: {
    user: process.env.SMTP_USER ?? '',
    pass: (process.env.SMTP_PASS ?? '').replace(/\s+/g, ''),
  },
  // Opcional: sin estas variables la app funciona igual, solo no se puede conectar Google Calendar.
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:5173/api/google/callback',
  },
};
