module.exports = {
  fileTypeFromBuffer: jest.fn().mockResolvedValue({ mime: 'application/octet-stream', ext: 'bin' }),
};
