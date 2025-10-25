const nodemailer = require("nodemailer");

async function main() {
  const recipient = process.env.RECIPIENT;
  const subject = process.env.SUBJECT || "Notification";
  const linter = process.env.LINTER_STATUS || "unknown";
  const cypress = process.env.CYPRESS_STATUS || "unknown";
  const addBadge = process.env.ADD_BADGE_STATUS || "unknown";
  const deploy = process.env.DEPLOY_STATUS || "unknown";

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!recipient) {
    console.error("Recipient (EMAIL) not provided. Aborting.");
    process.exit(1);
  }
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.error("SMTP credentials not provided. Please set SMTP_HOST, SMTP_USER and SMTP_PASS secrets.");
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort, 10),
    secure: parseInt(smtpPort, 10) === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const body = `
S'ha realitzat un push en la branca main que ha provocat l'execució del workflow ${process.env.GITHUB_WORKFLOW || ""} amb els següents resultats:

- linter_job: ${linter}
- cypress_job: ${cypress}
- add_badge_job: ${addBadge}
- deploy_job: ${deploy}

(Consulta el workflow: ${process.env.GITHUB_SERVER_URL || "https://github.com"}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID})
  `.trim();

  const mailOptions = {
    from: smtpUser,
    to: recipient,
    subject: subject,
    text: body,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId || info.response);
  } catch (err) {
    console.error("Failed to send email:", err);
    process.exit(1);
  }
}

main();
