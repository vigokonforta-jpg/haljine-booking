import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "NOEMA <info@noemabooking.com>";
const REPLY_TO = "noema.booking1@gmail.com";

const BRAND_CSS = `
  body { margin:0; padding:0; background:#FAFAF8; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; }
  .wrap { max-width:520px; margin:40px auto; background:#ffffff; border:1px solid #E2DDD6; }
  .header { background:#1A1A1A; padding:32px 40px; text-align:center; }
  .logo { color:#F5F0EB; font-size:22px; letter-spacing:0.25em; text-transform:uppercase; font-weight:300; margin:0; }
  .tagline { color:#A09890; font-size:10px; letter-spacing:0.2em; text-transform:uppercase; margin:6px 0 0; }
  .body { padding:36px 40px; }
  .greeting { font-size:15px; color:#1A1A1A; margin:0 0 20px; font-weight:400; }
  .divider { border:none; border-top:1px solid #E2DDD6; margin:24px 0; }
  .label { font-size:10px; letter-spacing:0.18em; text-transform:uppercase; color:#A09890; margin:0 0 4px; }
  .value { font-size:15px; color:#1A1A1A; margin:0 0 18px; font-weight:400; }
  .note { font-size:13px; color:#6B6560; line-height:1.6; margin:0; }
  .footer { background:#F5F0EB; padding:20px 40px; text-align:center; border-top:1px solid #E2DDD6; }
  .footer-text { font-size:11px; color:#A09890; letter-spacing:0.1em; margin:0; }
`;

function formatSlot(date: string, hour: number): { date: string; time: string } {
  const d = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00`);
  return {
    date: d.toLocaleDateString("hr-HR", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
    time: d.toLocaleTimeString("hr-HR", { hour: "2-digit", minute: "2-digit" }),
  };
}

export async function sendConfirmationEmail(
  to: string,
  name: string,
  date: string,
  hour: number,
  people: number = 1
): Promise<boolean> {
  const slot = formatSlot(date, hour);
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    replyTo: REPLY_TO,
    subject: "Potvrda rezervacije — NOEMA",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BRAND_CSS}</style></head><body>
      <div class="wrap">
        <div class="header">
          <p class="logo">NOEMA</p>
          <p class="tagline">Croatian Fashion Rental Closet</p>
        </div>
        <div class="body">
          <p class="greeting">Drage naše,</p>
          <p class="note">Dobrodošle u Noema studio za najam odjeće. Zahvaljujemo na rezervaciji termina i veselimo se vašem dolasku.</p>
          <hr class="divider" />
          <p class="label">Datum</p>
          <p class="value">${slot.date}</p>
          <p class="label">Vrijeme</p>
          <p class="value">${slot.time}</p>
          <p class="label">Broj osoba</p>
          <p class="value">${people === 2 ? "2 osobe" : "1 osoba"}</p>
          <hr class="divider" />
          <p class="label">Informacije o terminu</p>
          <p class="note" style="margin-bottom:8px;">— Termin se naplaćuje <strong>8,00&nbsp;€</strong></p>
          <p class="note" style="margin-bottom:8px;">— Trajanje termina: <strong>45 minuta</strong></p>
          <p class="note" style="margin-bottom:8px;">— Adresa: <strong>Nova Ves 50, Zagreb</strong></p>
          <hr class="divider" />
          <p class="label">Otkazivanje</p>
          <p class="note">Termin je moguće otkazati najkasnije <strong>24 sata prije dolaska</strong>. Nakon tog roka otkazivanje nije moguće.</p>
        </div>
        <div class="footer">
          <p class="footer-text">NOEMA &mdash; Nova Ves 50, Zagreb &mdash; info@noemabooking.com</p>
        </div>
      </div>
    </body></html>`,
  });
  if (error) throw error;
  return true;
}

export async function sendReminderEmail(
  to: string,
  name: string,
  date: string,
  hour: number
): Promise<boolean> {
  const slot = formatSlot(date, hour);
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    replyTo: REPLY_TO,
    subject: "Podsjetnik: Vaš termin je sutra — NOEMA",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BRAND_CSS}</style></head><body>
      <div class="wrap">
        <div class="header">
          <p class="logo">NOEMA</p>
          <p class="tagline">Croatian Fashion Rental Closet</p>
        </div>
        <div class="body">
          <p class="greeting">Poštovani/a ${name},</p>
          <p class="note">Podsjećamo vas da vam je termin <strong>sutra</strong>. Radujemo se vašem dolasku!</p>
          <hr class="divider" />
          <p class="label">Datum</p>
          <p class="value">${slot.date}</p>
          <p class="label">Vrijeme</p>
          <p class="value">${slot.time}</p>
          <hr class="divider" />
          <p class="note">Za promjenu ili otkazivanje termina, kontaktirajte nas što prije.</p>
        </div>
        <div class="footer">
          <p class="footer-text">NOEMA &mdash; Zagreb &mdash; @noema.zagreb</p>
        </div>
      </div>
    </body></html>`,
  });
  if (error) throw error;
  return true;
}
