import nodemailer from 'nodemailer';

export interface MailTransport {
  sendMail(options: Record<string, unknown>): Promise<{ messageId?: string }>;
}

export class EmailService {
  private readonly transporter: MailTransport;

  constructor(transporter: MailTransport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // Google App Password
      },
    })) {
    this.transporter = transporter;
  }

  async sendMail(to: string, subject: string, text: string, html?: string) {
    try {
      const info = await this.transporter.sendMail({
        from: `"MeatLens" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });
      console.log('Message sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
}

export const emailService = new EmailService();
