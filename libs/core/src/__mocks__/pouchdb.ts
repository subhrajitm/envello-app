// Stub for pouchdb — replaced in jest environment with an in-memory mock
const PouchDB = jest.fn().mockImplementation(() => ({
  get:     jest.fn().mockRejectedValue({ name: 'not_found', status: 404 }),
  put:     jest.fn().mockResolvedValue({ ok: true, id: '', rev: '1-a' }),
  remove:  jest.fn().mockResolvedValue({ ok: true }),
  allDocs: jest.fn().mockResolvedValue({ rows: [] }),
  bulkDocs:jest.fn().mockResolvedValue([]),
  destroy: jest.fn().mockResolvedValue({}),
}));

export default PouchDB;
module.exports = PouchDB;
