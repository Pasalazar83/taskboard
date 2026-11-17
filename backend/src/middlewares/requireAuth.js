const { asyncHandler } = require("./asyncHandler");

// Protege las rutas privadas: exige un token de sesión válido y deja el usuario en req.user.
function requireAuth(authService) {
  return asyncHandler(async (req, res, next) => {
    const { user, sessionHash } = await authService.authenticate(req.headers.authorization);
    req.user = user;
    req.sessionHash = sessionHash;
    next();
  });
}

module.exports = { requireAuth };
