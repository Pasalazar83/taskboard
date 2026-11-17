const { validateCoordinates } = require("../validators/coordinatesValidator");

// Capa de control de servicios externos: estado de integraciones y clima.
class IntegrationController {
  constructor({ weather, mailer, weatherEnabled }) {
    Object.assign(this, { weather, mailer, weatherEnabled });
  }

  status = (req, res) => res.json({ mail: this.mailer.enabled, weather: this.weatherEnabled });

  weatherNow = async (req, res) => {
    const { lat, lon } = validateCoordinates(req.query);
    res.json(await this.weather(lat, lon));
  };
}

module.exports = { IntegrationController };
