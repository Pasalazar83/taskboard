// Capa de control de cuentas: traduce HTTP ⇄ AuthService. Sin reglas de negocio.
class AuthController {
  constructor(authService) {
    this.service = authService;
  }

  register = async (req, res) => res.status(201).json(await this.service.register(req.body));
  login = async (req, res) => res.json(await this.service.login(req.body));
  me = (req, res) => res.json(req.user);
  logout = async (req, res) => {
    await this.service.logout(req.sessionHash);
    res.status(204).end();
  };
  forgotPassword = async (req, res) => res.json(await this.service.forgotPassword(req.body));
  resetPassword = async (req, res) => res.json(await this.service.resetPassword(req.body));
}

module.exports = { AuthController };
