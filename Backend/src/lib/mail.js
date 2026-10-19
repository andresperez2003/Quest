import nodemailer from 'nodemailer';
import { config } from '../config.js';

export const mailEnabled = Boolean(config.mail.user && config.mail.pass);

let transport = null;

function getTransport() {
  transport ??= nodemailer.createTransport({
    service: 'gmail',
    auth: { user: config.mail.user, pass: config.mail.pass },
  });
  return transport;
}

export function sendMail({ to, subject, text, html }) {
  return getTransport().sendMail({ from: `Quest <${config.mail.user}>`, to, subject, text, html });
}
