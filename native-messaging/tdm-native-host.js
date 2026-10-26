#!/usr/bin/env node
/**
 * Talha Download Manager (TDM) - Native Messaging Host
 * Communicates with Chromium extension via standard input/output using 32-bit length prefixes.
 */

import http from 'http';

function sendNativeMessage(msg) {
  const jsonStr = JSON.stringify(msg);
  const buffer = Buffer.alloc(4 + jsonStr.length);
  buffer.writeUInt32LE(jsonStr.length, 0);
  buffer.write(jsonStr, 4);
  process.stdout.write(buffer);
}

let inputBuffer = Buffer.alloc(0);

process.stdin.on('data', (chunk) => {
  inputBuffer = Buffer.concat([inputBuffer, chunk]);

  while (inputBuffer.length >= 4) {
    const msgLength = inputBuffer.readUInt32LE(0);
    if (inputBuffer.length < 4 + msgLength) {
      break; // Incomplete message chunk
    }

    const jsonStr = inputBuffer.slice(4, 4 + msgLength).toString('utf-8');
    inputBuffer = inputBuffer.slice(4 + msgLength);

    try {
      const message = JSON.parse(jsonStr);
      handleMessage(message);
    } catch (err) {
      sendNativeMessage({ success: false, error: err.message });
    }
  }
});

function handleMessage(msg) {
  if (msg.action === 'capture_download' && msg.url) {
    // Relay to running TDM local bridge
    const postData = JSON.stringify({
      url: msg.url,
      filename: msg.filename || '',
      referrer: msg.referrer || ''
    });

    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/extension/capture',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        sendNativeMessage({ success: true, response: data });
      });
    });

    req.on('error', (e) => {
      sendNativeMessage({ success: false, error: 'TDM is not running on 127.0.0.1:3000' });
    });

    req.write(postData);
    req.end();
  } else {
    sendNativeMessage({ success: true, message: 'TDM Native Host pong' });
  }
}
