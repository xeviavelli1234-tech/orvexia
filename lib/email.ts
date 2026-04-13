import { Resend } from "resend";

function baseUrl() {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

async function tryResend(to: string, subject: string, html: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");

  const resend = new Resend(apiKey);
  // EMAIL_FROM takes priority (verified domain), then RESEND_FROM, then test fallback
  const from =
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM ||
    `${process.env.NEXT_PUBLIC_APP_NAME || "Orvexia"} <onboarding@resend.dev>`;

  const result = await resend.emails.send({ from, to, subject, html, text });
  if (result.error) throw new Error(JSON.stringify(result.error));
}

export async function sendVerificationEmail(options: {
  to: string;
  code: string;
}): Promise<{ emailSent: boolean }> {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Folio";
  const primary = "#2563eb";
  const verifyPageUrl = `${baseUrl()}/verify?email=${encodeURIComponent(
    options.to
  )}&code=${options.code}`;

  const html = `<!DOCTYPE html>
  <html lang="es">
    <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
    <body style="margin:0;padding:0;background:#0b1220;font-family:'Segoe UI',Arial,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 0;">
        <tr><td align="center">
          <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 35px rgba(0,0,0,0.18);">
            <tr>
              <td style="background:linear-gradient(135deg,#1e293b,#0ea5e9);color:#e2f3ff;padding:28px 28px 18px 28px;">
                <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:.9;font-weight:600;">${appName}</div>
                <div style="font-size:22px;font-weight:700;margin-top:6px;">Confirma tu correo</div>
                <div style="margin-top:6px;font-size:14px;line-height:1.5;color:#cfe9ff;">Usa este código para verificar tu cuenta.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px 18px 28px;color:#0f172a;">
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;text-align:center;">
                  <div style="font-size:12px;letter-spacing:0.12em;color:#475569;text-transform:uppercase;font-weight:700;">Código de verificación</div>
                  <div style="font-size:32px;font-weight:800;letter-spacing:0.24em;color:${primary};margin-top:6px;">${options.code}</div>
                  <div style="font-size:12px;color:#475569;margin-top:10px;">Caduca en 15 minutos.</div>
                </div>
                <p style="margin:18px 0 6px 0;font-size:14px;color:#475569;">También puedes abrir la página y pegaremos el código por ti:</p>
                <a href="${verifyPageUrl}" style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700;font-size:14px;">Abrir verificación</a>
                <p style="margin:20px 0 6px 0;font-size:13px;color:#475569;">Si no solicitaste este correo puedes ignorarlo.</p>
              </td>
            </tr>
            <tr>
              <td style="background:#f1f5f9;color:#475569;padding:16px 28px;font-size:12px;">Enviado por ${appName}.</td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
  </html>`;

  const text = `Tu código es ${options.code}. Caduca en 15 minutos. También puedes verificar aquí: ${verifyPageUrl}`;

  try {
    await tryResend(options.to, "Verifica tu correo", html, text);
    return { emailSent: true };
  } catch (err) {
    console.warn("[email] Resend falló o no está configurado:", err);
    console.warn(`[email] Usa este código manualmente para ${options.to}: ${options.code}`);
    return { emailSent: false };
  }
}

export async function sendDiscountAvailableEmail(options: {
  to: string;
  userName: string;
  productName: string;
  productImage: string | null;
  store: string;
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
  externalUrl: string;
}): Promise<{ emailSent: boolean }> {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Orvexia";
  const dashboardUrl = `${baseUrl()}/dashboard`;

  const priceHtml = options.priceOld
    ? `<span style="font-size:24px;font-weight:800;color:#0F172A;">${options.priceCurrent.toFixed(2)}€</span>
       <span style="font-size:16px;color:#94A3B8;text-decoration:line-through;margin-left:8px;">${options.priceOld.toFixed(2)}€</span>`
    : `<span style="font-size:24px;font-weight:800;color:#0F172A;">${options.priceCurrent.toFixed(2)}€</span>`;

  const discountBadge = options.discountPercent
    ? `<span style="display:inline-block;background:#DCFCE7;color:#166534;font-size:13px;font-weight:700;padding:4px 10px;border-radius:999px;margin-left:8px;">−${options.discountPercent}%</span>`
    : "";

  const productImageHtml = options.productImage
    ? `<img src="${options.productImage}" alt="${options.productName}" style="width:80px;height:80px;object-fit:contain;border-radius:10px;border:1px solid #E2E8F0;margin-right:16px;" />`
    : "";

  const html = `<!DOCTYPE html>
  <html lang="es">
    <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
    <body style="margin:0;padding:0;background:#0b1220;font-family:'Segoe UI',Arial,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 0;">
        <tr><td align="center">
          <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 35px rgba(0,0,0,0.18);">
            <tr>
              <td style="background:linear-gradient(135deg,#1e293b,#0ea5e9);color:#e2f3ff;padding:28px 28px 18px 28px;">
                <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:.9;font-weight:600;">${appName}</div>
                <div style="font-size:22px;font-weight:700;margin-top:6px;">¡Tu producto está en oferta!</div>
                <div style="margin-top:6px;font-size:14px;line-height:1.5;color:#cfe9ff;">Hola ${options.userName}, el producto que guardaste acaba de entrar en oferta.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px 18px 28px;color:#0f172a;">
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;display:flex;align-items:center;">
                  ${productImageHtml}
                  <div>
                    <div style="font-size:15px;font-weight:700;color:#0F172A;margin-bottom:4px;">${options.productName}</div>
                    <div style="font-size:12px;color:#64748B;margin-bottom:10px;">${options.store}</div>
                    <div style="display:flex;align-items:center;">
                      ${priceHtml}
                      ${discountBadge}
                    </div>
                  </div>
                </div>
                <div style="margin-top:20px;">
                  <a href="${options.externalUrl}" style="display:inline-block;background:#2563EB;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:12px;font-weight:700;font-size:15px;">Ver oferta →</a>
                </div>
                <p style="margin:20px 0 6px 0;font-size:13px;color:#475569;">
                  También puedes ver todos tus productos guardados en el
                  <a href="${dashboardUrl}" style="color:#2563EB;text-decoration:underline;">dashboard</a>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f1f5f9;color:#475569;padding:16px 28px;font-size:12px;">Enviado por ${appName}.</td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
  </html>`;

  const text = `¡${options.productName} está en oferta en ${options.store} a ${options.priceCurrent.toFixed(2)}€! Ver oferta: ${options.externalUrl} | Dashboard: ${dashboardUrl}`;

  try {
    await tryResend(options.to, `¡${options.productName} ahora en oferta!`, html, text);
    return { emailSent: true };
  } catch (err) {
    console.warn("[email] Resend falló o no está configurado:", err);
    return { emailSent: false };
  }
}

export async function sendBetterDealEmail(options: {
  to: string;
  userName: string;
  productName: string;
  productImage: string | null;
  store: string;
  priceCurrent: number;
  priceOld: number;
  discountPercent: number | null;
  externalUrl: string;
}): Promise<{ emailSent: boolean }> {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Orvexia";
  const dashboardUrl = `${baseUrl()}/dashboard`;
  const savings = (options.priceOld - options.priceCurrent).toFixed(2);

  const discountBadge = options.discountPercent
    ? `<span style="display:inline-block;background:#DCFCE7;color:#166534;font-size:13px;font-weight:700;padding:4px 10px;border-radius:999px;margin-left:8px;">−${options.discountPercent}%</span>`
    : "";

  const productImageHtml = options.productImage
    ? `<img src="${options.productImage}" alt="${options.productName}" style="width:80px;height:80px;object-fit:contain;border-radius:10px;border:1px solid #E2E8F0;margin-right:16px;" />`
    : "";

  const html = `<!DOCTYPE html>
  <html lang="es">
    <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
    <body style="margin:0;padding:0;background:#0b1220;font-family:'Segoe UI',Arial,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 0;">
        <tr><td align="center">
          <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 35px rgba(0,0,0,0.18);">
            <tr>
              <td style="background:linear-gradient(135deg,#1e293b,#0ea5e9);color:#e2f3ff;padding:28px 28px 18px 28px;">
                <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:.9;font-weight:600;">${appName}</div>
                <div style="font-size:22px;font-weight:700;margin-top:6px;">¡Mejor precio encontrado!</div>
                <div style="margin-top:6px;font-size:14px;line-height:1.5;color:#cfe9ff;">Hola ${options.userName}, el producto que guardaste está aún más barato.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px 18px 28px;color:#0f172a;">
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;display:flex;align-items:center;">
                  ${productImageHtml}
                  <div>
                    <div style="font-size:15px;font-weight:700;color:#0F172A;margin-bottom:4px;">${options.productName}</div>
                    <div style="font-size:12px;color:#64748B;margin-bottom:10px;">${options.store}</div>
                    <div style="display:flex;align-items:center;">
                      <span style="font-size:24px;font-weight:800;color:#0F172A;">${options.priceCurrent.toFixed(2)}€</span>
                      <span style="font-size:16px;color:#94A3B8;text-decoration:line-through;margin-left:8px;">${options.priceOld.toFixed(2)}€</span>
                      ${discountBadge}
                    </div>
                    <div style="font-size:13px;color:#16a34a;font-weight:600;margin-top:6px;">Ahorro: ${savings}€</div>
                  </div>
                </div>
                <div style="margin-top:20px;">
                  <a href="${options.externalUrl}" style="display:inline-block;background:#2563EB;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:12px;font-weight:700;font-size:15px;">Ver oferta →</a>
                </div>
                <p style="margin:20px 0 6px 0;font-size:13px;color:#475569;">
                  También puedes ver todos tus productos guardados en el
                  <a href="${dashboardUrl}" style="color:#2563EB;text-decoration:underline;">dashboard</a>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f1f5f9;color:#475569;padding:16px 28px;font-size:12px;">Enviado por ${appName}.</td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
  </html>`;

  const text = `¡${options.productName} está más barato en ${options.store}! Nuevo precio: ${options.priceCurrent.toFixed(2)}€ (antes ${options.priceOld.toFixed(2)}€, ahorro ${savings}€). Ver oferta: ${options.externalUrl} | Dashboard: ${dashboardUrl}`;

  try {
    await tryResend(options.to, `¡${options.productName} está más barato ahora!`, html, text);
    return { emailSent: true };
  } catch (err) {
    console.warn("[email] Resend falló o no está configurado:", err);
    return { emailSent: false };
  }
}

export async function sendPasswordResetEmail(options: {
  to: string;
  token: string;
}): Promise<{ emailSent: boolean }> {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Folio";
  const primary = "#2563eb";
  const resetUrl = `${baseUrl()}/reset-password?token=${encodeURIComponent(
    options.token
  )}`;

  const html = `<!DOCTYPE html>
  <html lang="es">
    <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
    <body style="margin:0;padding:0;background:#0b1220;font-family:'Segoe UI',Arial,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 0;">
        <tr><td align="center">
          <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 35px rgba(0,0,0,0.18);">
            <tr>
              <td style="background:linear-gradient(135deg,#1e293b,#0ea5e9);color:#e2f3ff;padding:28px 28px 18px 28px;">
                <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:.9;font-weight:600;">${appName}</div>
                <div style="font-size:22px;font-weight:700;margin-top:6px;">Restablece tu contraseña</div>
                <div style="margin-top:6px;font-size:14px;line-height:1.5;color:#cfe9ff;">Crea una nueva contraseña con el enlace.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px 18px 28px;color:#0f172a;">
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">El enlace caduca en 30 minutos.</p>
                <a href="${resetUrl}" style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:12px;font-weight:700;font-size:15px;">Crear nueva contraseña</a>
                <p style="margin:20px 0 6px 0;font-size:13px;color:#475569;">Si no solicitaste este cambio, ignora este correo.</p>
              </td>
            </tr>
            <tr>
              <td style="background:#f1f5f9;color:#475569;padding:16px 28px;font-size:12px;">Enviado por ${appName}.</td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
  </html>`;

  const text = `Cambia tu contraseña aquí: ${resetUrl}`;

  try {
    await tryResend(options.to, "Restablece tu contraseña", html, text);
    return { emailSent: true };
  } catch (err) {
    console.warn("[email] Resend falló o no está configurado:", err);
    console.warn(`[email] Token manual para ${options.to}: ${options.token}`);
    return { emailSent: false };
  }
}
