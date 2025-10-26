Example of nextjs project using Cypress.io

<!---Start place for the badge -->

[![Cypress.io](https://img.shields.io/badge/tested%20with-Cypress-04C38E.svg)](https://www.cypress.io/)

<!---End place for the badge -->

---

## Linter_job

Al empezar la practica, me he descargado el repositorio:
[https://github.com/antoni-gimenez/nodejs-blog-practica](https://github.com/antoni-gimenez/nodejs-blog-practica)

Despues, he creado un nuevo repositorio llamado practica_github_actions
[https://github.com/davidmunt/practica_github_actions](https://github.com/davidmunt/practica_github_actions)

He añadido este codigo al workflow:

```yaml
name: practica_github_actions
on:
  push:
    branches: [main]
    paths-ignore:
      - "README.md"
jobs:
  linter_job:
    name: Linter_job
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
      - name: Install dependencies
        run: npm install
      - name: Run linter
        run: npm run lint
```

He tenido que Corregir los errores que me devolvia el linter hasta que el job se ejecut correctame, el commit que me funciono es el de:
corrijo index
practica_github_actions #5: Commit 71b1f23 pushed by davidmunt.

## Cypress_job

He añadido este codigo al archivo practica_github_actions.yml:

```yaml
    cypress_job:
    name: Cypress_job
    runs-on: ubuntu-latest
    needs: linter_job
    steps:
        - name: Checkout repository
        uses: actions/checkout@v4
        - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
            node-version: 20
        - name: Install dependencies
        run: npm install
        - name: Run Cypress tests and save results
        run: |
            npx start-server-and-test "npm run dev" http://localhost:3000 "npx cypress run > result.txt || true"
        - name: Upload test results
        uses: actions/upload-artifact@v4
        with:
            name: cypress-results
            path: result.txt
```

El commit donde me funciono este job es:
modifico workflow
practica_github_actions #8: Commit 9f21ad6 pushed by davidmunt

## Add_badge_job

He añadido este codigo al archivo practica_github_actions.yml:

```yaml
    add_badge_job:
        name: Add_badge_job
        runs-on: ubuntu-latest
        needs: cypress_job
        if: github.actor != 'github-actions[bot]'
        steps:
            - name: Checkout repository
            uses: actions/checkout@v4
            with:
                fetch-depth: 0
                token: ${{ secrets.MY_PAT }}
            - name: Download cypress results artifact
            uses: actions/download-artifact@v4
            with:
                name: cypress-results
                path: results
            - name: Parse Cypress result and set output
            id: parse
            run: |
                if grep -q -i "All specs passed" results/result.txt; then
                echo "::set-output name=cypress_outcome::success"
                else
                echo "::set-output name=cypress_outcome::failure"
                fi
            - name: Update README badge using local action
            uses: ./.github/actions/update-badge
            with:
                cypress_outcome: ${{ steps.parse.outputs.cypress_outcome }}
            - name: Commit and push README changes
            run: |
                git config --global user.name "github-actions"
                git config --global user.email "actions@github.com"
                git add README.md
                git commit -m "ci: update Cypress test badge" || echo "No changes to commit"
                git push origin HEAD:main
            env:
                MY_PAT: ${{ secrets.MY_PAT }}
```

Tambien he tenido que crear la accion en el archivo action.yml dentro de la carpeta actions/update-badge:

```yaml
name: "Update Cypress Badge"
description: ""
inputs:
  cypress_outcome:
    description: ""
    required: true
runs:
  using: "composite"
  steps:
    - name: Update README badge
      shell: bash
      run: |
        echo "Resultat dels tests: ${{ inputs.cypress_outcome }}"
        if [ ! -f README.md ]; then
          echo "# Projecte" > README.md
        fi
        sed -i '/RESULTAT DELS ÚLTIMS TESTS/,$d' README.md
        echo " " >> README.md
        echo "## RESULTAT DELS ÚLTIMS TESTS" >> README.md
        if [ "${{ inputs.cypress_outcome }}" = "success" ]; then
          echo "![Tests Success](https://img.shields.io/badge/tested%20with-Cypress-04C38E.svg)" >> README.md
        else
          echo "![Tests Failure](https://img.shields.io/badge/test-failure-red)" >> README.md
        fi
```

El commit donde me ha funcionado este job es:
Modifico workflow para que no se genere un bule infinito
practica_github_actions #22: Commit 26c3b60 pushed by davidmunt

## Deploy_job

Antes de añadir este job, he tenido que crear un proyecto en Vercel para poder desplegar la aplicacion. El proyecto esta disponible en:

[https://vercel.com/practica-github-actions-projects/practica-github-actions](https://vercel.com/practica-github-actions-projects/practica-github-actions)

He añadido este codigo al archivo practica_github_actions.yml:

```yaml
    deploy_job:
    name: Deploy to Vercel
    runs-on: ubuntu-latest
    needs: cypress_job
    steps:
        - name: Checkout repository
        uses: actions/checkout@v4
        - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
            vercel-token: ${{ secrets.VERCEL_TOKEN }}
            vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
            vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
            vercel-args: "--prod"
        env:
            VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

El commit donde me funciono este job es:
Deploy_job
practica_github_actions #23: Commit a96f23d pushed by davidmunt

## Notification_job

He añadido este codigo al archivo practica_github_actions.yml:

```yaml
    notification_job:
        name: Notification_job
        runs-on: ubuntu-latest
        needs:
        - linter_job
        - cypress_job
        - add_badge_job
        - deploy_job
        if: always()
        steps:
        - name: Checkout repository
            uses: actions/checkout@v4
        - name: Run notification action (send email)
            uses: ./.github/actions/send-notification
            with:
            recipient: ${{ secrets.EMAIL_RECIPIENT }}
            subject: "Resultat del workflow ${GITHUB_WORKFLOW} - ${GITHUB_REF}"
            linter_status: ${{ needs.linter_job.result }}
            cypress_status: ${{ needs.cypress_job.result }}
            add_badge_status: ${{ needs.add_badge_job.result }}
            deploy_status: ${{ needs.deploy_job.result }}
            env:
            SMTP_HOST: ${{ secrets.SMTP_HOST }}
            SMTP_PORT: ${{ secrets.SMTP_PORT }}
            SMTP_USER: ${{ secrets.SMTP_USER }}
            SMTP_PASS: ${{ secrets.SMTP_PASS }}
```

He tenido que crear tambien una accion personalizada en la carpeta actions/send-notification con estos archivos:

action.yml

```yaml
name: "Send Notification Email"
description: "Envia un correu amb l'estat dels jobs del workflow"
inputs:
  recipient:
    description: "Correu del destinatari"
    required: true
  subject:
    description: "Assumpte del correu"
    required: true
  linter_status:
    description: "Resultat del linter_job"
    required: true
  cypress_status:
    description: "Resultat del cypress_job"
    required: true
  add_badge_status:
    description: "Resultat del add_badge_job"
    required: true
  deploy_status:
    description: "Resultat del deploy_job"
    required: true
runs:
  using: "composite"
  steps:
    - name: Install node dependencies
      shell: bash
      run: |
        npm install --prefix "$GITHUB_ACTION_PATH" nodemailer
    - name: Send email using Node script
      shell: bash
      env:
        RECIPIENT: ${{ inputs.recipient }}
        SUBJECT: ${{ inputs.subject }}
        LINTER_STATUS: ${{ inputs.linter_status }}
        CYPRESS_STATUS: ${{ inputs.cypress_status }}
        ADD_BADGE_STATUS: ${{ inputs.add_badge_status }}
        DEPLOY_STATUS: ${{ inputs.deploy_status }}
        SMTP_HOST: ${{ env.SMTP_HOST }}
        SMTP_PORT: ${{ env.SMTP_PORT }}
        SMTP_USER: ${{ env.SMTP_USER }}
        SMTP_PASS: ${{ env.SMTP_PASS }}
      run: |
        node "$GITHUB_ACTION_PATH/send.js"
```

package.json

```yaml
{ "name": "send-notification-action", "version": "1.0.0", "private": true, "dependencies": { "nodemailer": "^6.9.3" } }
```

send.js

```javascript
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
```

El commit donde me ha funcionado este job es:
.
practica_github_actions #25: Commit 34506b7 pushed by davidmunt

## Configuracion_readme_personal

Este apartado no le he podido entregar por que al intentar generar las metricas de mi perfil, la accion me daba error de permisos, aunque le haya dado todos los permisos al token. GitHub no me permitia el acceso para recibir los datos del perfil.

---

## RESULTAT DELS ÚLTIMS TESTS

![Tests Success](https://img.shields.io/badge/tested%20with-Cypress-04C38E.svg)
