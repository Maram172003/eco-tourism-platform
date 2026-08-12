import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    async sendPasswordResetEmail(email: string, token: string) {
        const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${encodeURIComponent(token)}`;

        await this.transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to: email,
            subject: 'Réinitialisation de votre mot de passe',
            html: `
        <div style="font-family:Arial,sans-serif">
          <h2>Réinitialisation de mot de passe</h2>
          <p>Vous avez demandé à réinitialiser votre mot de passe sur Éco-Voyage.</p>
          <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
          <p>
            <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#22c55e;color:#000;text-decoration:none;border-radius:8px;font-weight:bold;">
              Réinitialiser mon mot de passe
            </a>
          </p>
          <p>Ce lien expirera dans <strong>1 heure</strong>.</p>
          <p style="color:#888;font-size:12px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        </div>
      `,
        });
    }

    async sendVerificationEmail(email: string, token: string) {
        const verifyUrl = `${process.env.BACKEND_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

        await this.transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to: email,
            subject: 'Vérifiez votre adresse email',
            html: `
        <div style="font-family:Arial,sans-serif">
          <h2>Bienvenue sur Eco Voyage</h2>
          <p>Merci pour votre inscription.</p>
          <p>Cliquez sur le bouton ci-dessous pour vérifier votre email :</p>
          <p>
            <a href="${verifyUrl}" style="display:inline-block;padding:12px 20px;background:#22c55e;color:#000;text-decoration:none;border-radius:8px;font-weight:bold;">
              Vérifier mon email
            </a>
          </p>
          <p>Ce lien expirera dans 24 heures.</p>
        </div>
      `,
        });
    }

    async sendReportWarning(email: string, name: string, reason: string, note: string) {
        await this.transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to: email,
            subject: 'Avertissement concernant votre compte Éco-Voyage',
            html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#f97316">⚠️ Avertissement officiel</h2>
          <p>Bonjour <strong>${name}</strong>,</p>
          <p>Suite à un signalement concernant votre comportement sur la plateforme Éco-Voyage, notre équipe de modération vous adresse cet avertissement officiel.</p>
          <p><strong>Motif du signalement :</strong> ${reason}</p>
          ${note ? `<p><strong>Note de l'administrateur :</strong> ${note}</p>` : ''}
          <p>Nous vous invitons à respecter les règles de la communauté. En cas de récidive, des mesures plus sévères pourront être prises.</p>
          <p style="color:#888;font-size:12px;">Éco-Voyage — Service de modération</p>
        </div>`,
        });
    }

    /** Refus d'un profil professionnel : motif + délai avant désactivation. */
    async sendProfileRejected(email: string, name: string | null, reason: string, hoursBeforeDisable = 24) {
        await this.transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to: email,
            subject: 'Votre profil Éco-Voyage a été refusé',
            html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#ef4444">Profil refusé</h2>
          ${name ? `<p>Bonjour <strong>${name}</strong>,</p>` : ''}
          <p>Après examen, votre profil professionnel n'a pas été validé par notre équipe.</p>
          ${reason ? `<p><strong>Motif :</strong> ${reason}</p>` : ''}
          <p style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px">
            Votre compte sera <strong>désactivé dans ${hoursBeforeDisable} heures</strong>.
            Passé ce délai, vous ne pourrez plus vous connecter.
          </p>
          <p>Si vous pensez qu'il s'agit d'une erreur, contactez notre support avant l'expiration de ce délai.</p>
          <p style="color:#888;font-size:12px;">Éco-Voyage — Service de modération</p>
        </div>`,
        });
    }

    async sendAccountBanned(email: string, name: string | null, note: string, banDays: number = 0) {
        const durationText = banDays > 0
          ? `pour une durée de <strong>${banDays} jour${banDays > 1 ? 's' : ''}</strong>`
          : '<strong>définitivement</strong>';
        await this.transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to: email,
            subject: 'Votre compte Éco-Voyage a été suspendu',
            html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#ef4444">🚫 Compte suspendu</h2>
          ${name ? `<p>Bonjour <strong>${name}</strong>,</p>` : ''}
          <p>Votre compte sur la plateforme Éco-Voyage a été suspendu ${durationText} suite à une violation de nos règles d'utilisation.</p>
          ${note ? `<p><strong>Raison :</strong> ${note}</p>` : ''}
          ${banDays > 0 ? `<p>Votre accès sera automatiquement rétabli après la période de suspension.</p>` : ''}
          <p>Si vous pensez qu'il s'agit d'une erreur, veuillez contacter notre support.</p>
          <p style="color:#888;font-size:12px;">Éco-Voyage — Service de modération</p>
        </div>`,
        });
    }

    async sendUnban(email: string) {
        await this.transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to: email,
            subject: 'Votre compte Éco-Voyage a été rétabli',
            html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#22c55e">✅ Compte rétabli</h2>
          <p>Votre compte sur la plateforme Éco-Voyage a été <strong>rétabli</strong>. Vous pouvez à nouveau vous connecter.</p>
          <p>Nous vous rappelons l'importance de respecter les règles de notre communauté.</p>
          <p style="color:#888;font-size:12px;">Éco-Voyage — Service de modération</p>
        </div>`,
        });
    }

    async sendReportResult(reporterEmail: string, reporterName: string, action: string, reportedName: string, note: string) {
        const actionLabels: Record<string, string> = {
            warn: 'a reçu un avertissement officiel',
            ban: 'a été suspendu de la plateforme',
            delete: 'a été supprimé de la plateforme',
            dismiss: 'a été examiné mais aucune action n\'a été jugée nécessaire',
        };
        const label = actionLabels[action] ?? 'a été traité';
        await this.transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to: reporterEmail,
            subject: 'Résultat de votre signalement — Éco-Voyage',
            html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#22c55e">✅ Votre signalement a été traité</h2>
          <p>Bonjour <strong>${reporterName}</strong>,</p>
          <p>Merci pour votre signalement. Notre équipe de modération a examiné votre demande.</p>
          <p><strong>Décision :</strong> Le compte de <strong>${reportedName}</strong> ${label}.</p>
          ${note ? `<p><strong>Note :</strong> ${note}</p>` : ''}
          <p>Nous prenons la sécurité de notre communauté très au sérieux et vous remercions de contribuer à un environnement sain.</p>
          <p style="color:#888;font-size:12px;">Éco-Voyage — Service de modération</p>
        </div>`,
        });
    }
}
