module.exports = {
  jwtDecrypt: jest.fn().mockResolvedValue({
    payload: { sub: 'test-user', orgId: 'test-org', roles: ['admin'] },
    protectedHeader: { alg: 'ECDH-ES+A128KW', enc: 'A128GCM' },
  }),
  base64url: {
    encode: (buf) => Buffer.from(buf).toString('base64url'),
    decode: (str) => Buffer.from(str, 'base64url'),
  },
  calculateJwkThumbprint: jest.fn().mockResolvedValue('mock-thumbprint'),
  compactDecrypt: jest.fn().mockResolvedValue({
    plaintext: Buffer.from(JSON.stringify({ sub: 'test-user', orgId: 'test-org' })),
    protectedHeader: { alg: 'ECDH-ES+A128KW', enc: 'A128GCM' },
  }),
};
