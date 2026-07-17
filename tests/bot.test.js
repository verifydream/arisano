import { jest } from '@jest/globals';

// Mock Fonnte API
jest.unstable_mockModule('../src/fonnte.js', () => ({
  sendMessage: jest.fn(),
}));

// Mock Database
jest.unstable_mockModule('../src/db.js', () => ({
  createGroup: jest.fn(),
  getGroupByWaId: jest.fn(),
  addMember: jest.fn(),
  getMembers: jest.fn(),
  removeMember: jest.fn(),
  getWinners: jest.fn(),
  resetWinners: jest.fn(),
  addWinner: jest.fn(),
  markPaid: jest.fn(),
  getPayments: jest.fn(),
}));

const { handleCommand } = await import('../src/bot.js');
const fonnteMock = await import('../src/fonnte.js');
const dbMock = await import('../src/db.js');

describe('Arisano Bot Commands', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const phone = '6281234567890';
  const waGroupId = '1234567890@g.us';
  const groupName = 'Grup Arisan Keluarga';

  describe('Command Parsing', () => {
    it('should ignore unknown commands', async () => {
      const res = await handleCommand(phone, '/unknown_cmd', waGroupId, false, groupName);
      expect(res).toBeNull();
      expect(fonnteMock.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('/mulai_arisan', () => {
    it('should create a new arisan group', async () => {
      dbMock.createGroup.mockResolvedValue({ group_name: 'Grup Arisan Keluarga' });

      await handleCommand(phone, '/mulai_arisan 50000 10', waGroupId, true, groupName);

      expect(dbMock.createGroup).toHaveBeenCalledWith(waGroupId, groupName, 50000, phone, 10);
      expect(fonnteMock.sendMessage).toHaveBeenCalledWith(
        phone,
        expect.stringContaining('✅ *Arisan dibuat!*')
      );
      expect(fonnteMock.sendMessage).toHaveBeenCalledWith(
        phone,
        expect.stringContaining('💰 Iuran: Rp 50.000/bulan')
      );
    });
  });

  describe('/tambah_anggota', () => {
    it('should show error if arisan not created', async () => {
      dbMock.getGroupByWaId.mockResolvedValue(null);

      await handleCommand(phone, '/tambah_anggota Budi', waGroupId, true, groupName);

      expect(fonnteMock.sendMessage).toHaveBeenCalledWith(
        phone,
        expect.stringContaining('❌ Arisan belum dibuat')
      );
    });

    it('should add members to arisan', async () => {
      dbMock.getGroupByWaId.mockResolvedValue({ id: 1 });
      dbMock.addMember.mockResolvedValueOnce({ name: 'Budi' }).mockResolvedValueOnce({ name: 'Andi' });
      dbMock.getMembers.mockResolvedValue([{ id: 1, name: 'Budi' }, { id: 2, name: 'Andi' }]);

      await handleCommand(phone, '/tambah_anggota Budi Andi', waGroupId, true, groupName);

      expect(dbMock.addMember).toHaveBeenCalledTimes(2);
      expect(fonnteMock.sendMessage).toHaveBeenCalledWith(
        phone,
        expect.stringContaining('✅ *2 anggota ditambahkan:*')
      );
    });

    it('should prevent duplicates or show warning if already exists', async () => {
      dbMock.getGroupByWaId.mockResolvedValue({ id: 1 });
      dbMock.addMember.mockResolvedValue(null); // Simulated already exists

      await handleCommand(phone, '/tambah_anggota Budi', waGroupId, true, groupName);

      expect(fonnteMock.sendMessage).toHaveBeenCalledWith(
        phone,
        expect.stringContaining('⚠️ Semua nama sudah terdaftar.')
      );
    });
  });

  describe('/kocok', () => {
    it('should not allow kocok if < 2 members', async () => {
      dbMock.getGroupByWaId.mockResolvedValue({ id: 1 });
      dbMock.getMembers.mockResolvedValue([{ id: 1, name: 'Budi' }]);

      await handleCommand(phone, '/kocok', waGroupId, true, groupName);

      expect(fonnteMock.sendMessage).toHaveBeenCalledWith(
        phone,
        expect.stringContaining('❌ Minimal 2 anggota untuk kocok.')
      );
    });

    it('should draw a random winner and save it', async () => {
      dbMock.getGroupByWaId.mockResolvedValue({ id: 1, nominal: 50000 });
      dbMock.getMembers.mockResolvedValue([{ id: 1, name: 'Budi' }, { id: 2, name: 'Andi' }]);
      dbMock.getWinners.mockResolvedValue([]);
      dbMock.addWinner.mockResolvedValue({ id: 1, member_id: 1, month: 1, year: 2024 });

      await handleCommand(phone, '/kocok', waGroupId, true, groupName);

      expect(fonnteMock.sendMessage).toHaveBeenCalledWith(
        waGroupId,
        expect.stringContaining('🎲 *KOCAK ARISAN* 🎲')
      );
      // It draws one of the 2 members
      expect(dbMock.addWinner).toHaveBeenCalled();
      expect(fonnteMock.sendMessage).toHaveBeenCalledWith(
        waGroupId,
        expect.stringContaining('🎉🎉🎉 *PEMENANG BULAN')
      );
    });

    it('should reset rotation if all members have won', async () => {
      dbMock.getGroupByWaId.mockResolvedValue({ id: 1, nominal: 50000 });
      dbMock.getMembers.mockResolvedValue([{ id: 1, name: 'Budi' }, { id: 2, name: 'Andi' }]);
      // Both won
      dbMock.getWinners.mockResolvedValue([{ member_id: 1 }, { member_id: 2 }]);
      dbMock.resetWinners.mockResolvedValue();

      await handleCommand(phone, '/kocok', waGroupId, true, groupName);

      expect(dbMock.resetWinners).toHaveBeenCalledWith(1);
      expect(dbMock.addWinner).toHaveBeenCalled(); // Should draw a new winner from full pool
    });
  });

  describe('/bayar', () => {
    it('should mark member as paid', async () => {
      dbMock.getGroupByWaId.mockResolvedValue({ id: 1 });
      dbMock.markPaid.mockResolvedValue({ verified: true });

      await handleCommand(phone, '/bayar Budi', waGroupId, true, groupName);

      expect(dbMock.markPaid).toHaveBeenCalled();
      expect(fonnteMock.sendMessage).toHaveBeenCalledWith(
        phone,
        expect.stringContaining('✅ *Budi* sudah ditandai bayar')
      );
    });

    it('should handle member not found', async () => {
      dbMock.getGroupByWaId.mockResolvedValue({ id: 1 });
      dbMock.markPaid.mockResolvedValue(null);

      await handleCommand(phone, '/bayar Budi', waGroupId, true, groupName);

      expect(fonnteMock.sendMessage).toHaveBeenCalledWith(
        phone,
        expect.stringContaining('❌ Anggota *Budi* tidak ditemukan.')
      );
    });
  });

  describe('/rekap', () => {
    it('should display summary of paid and unpaid members', async () => {
      dbMock.getGroupByWaId.mockResolvedValue({ id: 1, nominal: 50000 });
      dbMock.getMembers.mockResolvedValue([{ id: 1, name: 'Budi' }, { id: 2, name: 'Andi' }]);
      // Only Budi has paid
      dbMock.getPayments.mockResolvedValue([{ name: 'Budi', verified: true }]);

      await handleCommand(phone, '/rekap', waGroupId, true, groupName);

      expect(fonnteMock.sendMessage).toHaveBeenCalledWith(
        waGroupId,
        expect.stringMatching(/✅ \*Sudah bayar.*Budi/s)
      );
      expect(fonnteMock.sendMessage).toHaveBeenCalledWith(
        waGroupId,
        expect.stringMatching(/❌ \*Belum bayar.*Andi/s)
      );
    });
  });

  describe('/status', () => {
    it('should show arisan status', async () => {
      dbMock.getGroupByWaId.mockResolvedValue({ id: 1, group_name: 'Grup Arisan Keluarga', nominal: 50000, draw_day: 10 });
      dbMock.getMembers.mockResolvedValue([{ id: 1, name: 'Budi' }, { id: 2, name: 'Andi' }]);
      dbMock.getWinners.mockResolvedValue([{ member_id: 1, name: 'Budi', month: 7, year: 2024 }]);

      await handleCommand(phone, '/status', waGroupId, true, groupName);

      expect(fonnteMock.sendMessage).toHaveBeenCalledWith(
        waGroupId,
        expect.stringContaining('ℹ️ *STATUS ARISAN*')
      );
      expect(fonnteMock.sendMessage).toHaveBeenCalledWith(
        waGroupId,
        expect.stringContaining('Budi')
      );
    });
  });
});
