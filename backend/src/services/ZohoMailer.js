class ZohoMailer {
  constructor(config, fetcher = fetch) {
    this.config = config;
    this.fetch = fetcher;
    this.access = null;
  }
  get enabled() {
    return [
      "zohoClientId",
      "zohoClientSecret",
      "zohoRefreshToken",
      "zohoAccountId",
    ].every((k) => !!this.config[k]);
  }
  async accessToken() {
    if (this.access && this.access.until > Date.now()) return this.access.token;
    const c = this.config;
    const response = await this.fetch(c.zohoAccountsUrl + "/oauth/v2/token", {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: c.zohoClientId,
        client_secret: c.zohoClientSecret,
        refresh_token: c.zohoRefreshToken,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    if (!response.ok || !data.access_token)
      throw new Error("No se pudo autorizar Zoho");
    this.access = {
      token: data.access_token,
      until:
        Date.now() +
        Math.max(0, (Number(data.expires_in) || 3600) - 120) * 1000,
    };
    return this.access.token;
  }
  async send({ recipient, subject, content }) {
    if (!this.enabled) throw new Error("Zoho no configurado");
    const access = await this.accessToken();
    const response = await this.fetch(
      this.config.zohoMailUrl +
        "/api/accounts/" +
        encodeURIComponent(this.config.zohoAccountId) +
        "/messages",
      {
        method: "POST",
        headers: {
          Authorization: "Zoho-oauthtoken " + access,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromAddress: this.config.mailFrom,
          toAddress: recipient,
          subject,
          content,
          mailFormat: "plaintext",
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (response.status === 401) this.access = null;
    const data = await response.json();
    if (!response.ok || data.status?.code !== 200)
      throw new Error("Zoho rechazó el envío");
  }
}
module.exports = { ZohoMailer };
