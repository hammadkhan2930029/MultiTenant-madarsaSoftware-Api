import net from 'node:net';
import tls from 'node:tls';
import { Buffer } from 'node:buffer';
import { env } from '../config/env.js';

const createMessageId = () => `<${Date.now()}.${Math.random().toString(16).slice(2)}@madarsa-system.local>`;

const encodeHeader = (value = '') => {
  const text = String(value || '');
  return /^[\x00-\x7F]*$/.test(text)
    ? text
    : `=?UTF-8?B?${Buffer.from(text, 'utf8').toString('base64')}?=`;
};

const normalizeAddress = (value) => String(value || '').trim();

const readSmtpResponse = (socket) =>
  new Promise((resolve, reject) => {
    let buffer = '';

    const cleanup = () => {
      socket.off('data', onData);
      socket.off('error', onError);
      socket.off('close', onClose);
    };

    const onError = (error) => {
      cleanup();
      reject(error);
    };

    const onClose = () => {
      cleanup();
      reject(new Error('SMTP connection closed unexpectedly.'));
    };

    const onData = (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const lastLine = lines[lines.length - 1] || '';

      if (/^\d{3}\s/.test(lastLine)) {
        cleanup();
        resolve({
          code: Number(lastLine.slice(0, 3)),
          text: lines.join('\n'),
        });
      }
    };

    socket.on('data', onData);
    socket.once('error', onError);
    socket.once('close', onClose);
  });

const sendCommand = async (socket, command, expectedCodes = []) => {
  socket.write(`${command}\r\n`);
  const response = await readSmtpResponse(socket);

  if (expectedCodes.length && !expectedCodes.includes(response.code)) {
    throw new Error(`SMTP command failed (${command}): ${response.text}`);
  }

  return response;
};

const connectSocket = () =>
  new Promise((resolve, reject) => {
    const options = {
      host: env.smtpHost,
      port: env.smtpPort,
      rejectUnauthorized: env.smtpRejectUnauthorized,
    };

    const socket = env.smtpSecure ? tls.connect(options, () => resolve(socket)) : net.connect(options, () => resolve(socket));
    socket.setTimeout(20000, () => {
      socket.destroy(new Error('SMTP connection timed out.'));
    });
    socket.once('error', reject);
  });

const upgradeToTls = (socket) =>
  new Promise((resolve, reject) => {
    const secureSocket = tls.connect(
      {
        socket,
        servername: env.smtpHost,
        rejectUnauthorized: env.smtpRejectUnauthorized,
      },
      () => resolve(secureSocket)
    );

    secureSocket.setTimeout(20000, () => {
      secureSocket.destroy(new Error('SMTP TLS connection timed out.'));
    });
    secureSocket.once('error', reject);
  });

export const sendEmail = async ({ to, subject, text, html }) => {
  const recipient = normalizeAddress(to);
  const sender = normalizeAddress(env.smtpFrom);

  if (!env.smtpHost || !sender) {
    throw new Error('SMTP settings are missing. Set SMTP_HOST, SMTP_FROM, and credentials if required.');
  }

  let socket = await connectSocket();

  try {
    await readSmtpResponse(socket);
    await sendCommand(socket, `EHLO ${env.smtpHost}`, [250]);

    if (!env.smtpSecure) {
      await sendCommand(socket, 'STARTTLS', [220]);
      socket = await upgradeToTls(socket);
      await sendCommand(socket, `EHLO ${env.smtpHost}`, [250]);
    }

    if (env.smtpUser && env.smtpPass) {
      const authToken = Buffer.from(`\u0000${env.smtpUser}\u0000${env.smtpPass}`, 'utf8').toString('base64');
      await sendCommand(socket, `AUTH PLAIN ${authToken}`, [235]);
    }

    await sendCommand(socket, `MAIL FROM:<${sender}>`, [250]);
    await sendCommand(socket, `RCPT TO:<${recipient}>`, [250, 251]);
    await sendCommand(socket, 'DATA', [354]);

    const safeText = String(text || '').replace(/^\./gm, '..');
    const safeHtml = html ? String(html).replace(/^\./gm, '..') : '';
    const boundary = `madarsa-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const message = [
      `From: ${encodeHeader(env.appName)} <${sender}>`,
      `To: <${recipient}>`,
      `Subject: ${encodeHeader(subject)}`,
      'MIME-Version: 1.0',
      `Message-ID: ${createMessageId()}`,
      html ? `Content-Type: multipart/alternative; boundary="${boundary}"` : 'Content-Type: text/plain; charset=UTF-8',
      '',
      html
        ? [
            `--${boundary}`,
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
            '',
            safeText,
            `--${boundary}`,
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
            '',
            safeHtml,
            `--${boundary}--`,
          ].join('\r\n')
        : safeText,
      '.',
    ].join('\r\n');

    socket.write(`${message}\r\n`);
    const dataResponse = await readSmtpResponse(socket);
    if (dataResponse.code !== 250) {
      throw new Error(`SMTP message rejected: ${dataResponse.text}`);
    }
    await sendCommand(socket, 'QUIT', [221]);
  } finally {
    socket.end();
  }
};
