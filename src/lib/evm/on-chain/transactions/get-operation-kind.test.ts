import {
  burnErc20Data,
  mintBatchErc1155Data,
  mintErc1155Data,
  mintErc20Data,
  mintErc721Data,
  safeBatchTransferFromErc1155Data,
  safeMintErc721Data,
  safeTransferFromErc1155Data,
  safeTransferFromErc721Data,
  safeTransferFromErc721WithBytesData,
  transferErc20Data,
  transferFromErc20Data,
  transferFromErc721Data
} from './data.mock';
import { EvmOperationKind, getOperationKind } from './get-operation-kind';

const mockDestination = '0x253C35f10766E8A5115c89AB8cE50282FdC1ceC8';

describe('getOperationKind', () => {
  it('should detect contract deployment', () => {
    expect(
      getOperationKind({
        data: '0x6080604052348015600f57600080fd5b50608b8061001e6000396000f3fe6080604052610fff3411600e57fe5b3373ff\
ffffffffffffffffffffffffffffffffffffff166108fc349081150290604051600060405180830381858888f193505050501580156053573\
d6000803e3d6000fd5b5000fea265627a7a72315820631b0dbb6b871cdbfdec2773af15ebfb8e52c794cf836fe27ec21f1aed17180f64736f\
6c634300050c0032'
      })
    ).toEqual(EvmOperationKind.DeployContract);
  });

  it('should label operations without data and with zero value as unknown', () => {
    expect(getOperationKind({ to: mockDestination })).toEqual(EvmOperationKind.Other);
    expect(getOperationKind({ to: mockDestination, value: BigInt(0) })).toEqual(EvmOperationKind.Other);
    expect(getOperationKind({ to: mockDestination, value: BigInt(0), data: '0x' })).toEqual(EvmOperationKind.Other);
  });

  it('should detect sending ETH operations', () => {
    expect(getOperationKind({ to: mockDestination, value: BigInt(1) })).toEqual(EvmOperationKind.Send);
    expect(getOperationKind({ to: mockDestination, value: BigInt(1), data: '0x' })).toEqual(EvmOperationKind.Send);
  });

  describe('should detect mint operations', () => {
    const testMintOperationsData: StringRecord<HexString> = {
      mintErc20Data,
      mintErc721Data,
      safeMintErc721Data,
      mintErc1155Data,
      mintBatchErc1155Data
    };

    test.each(Object.keys(testMintOperationsData))('for %s', name => {
      const data = testMintOperationsData[name];
      expect(getOperationKind({ to: mockDestination, data })).toEqual(EvmOperationKind.Mint);
    });
  });

  describe('should detect sending operations', () => {
    const testSendingOperationsData: StringRecord<HexString> = {
      transferErc20Data,
      transferFromErc20Data,
      transferFromErc721Data,
      safeTransferFromErc721Data,
      safeTransferFromErc721WithBytesData,
      safeBatchTransferFromErc1155Data,
      safeTransferFromErc1155Data
    };

    test.each(Object.keys(testSendingOperationsData))('for %s', name => {
      const data = testSendingOperationsData[name];
      expect(getOperationKind({ to: mockDestination, data })).toEqual(EvmOperationKind.Send);
    });
  });

  describe('approval operations', () => {
    it('should mark setApprovalForAll operations as transfers', () => {
      expect(
        getOperationKind({
          to: mockDestination,
          data: '0xa22cb465000000000000000000000000253c35f10766e8a5115c89ab8ce50282fdc1cec8000000000000000000000000\
0000000000000000000000000000000000000001'
        })
      ).toEqual(EvmOperationKind.Transfer);
    });

    describe('should mark other approvals as approvals', () => {
      const txDataVariants: StringRecord<HexString> = {
        erc20Approve:
          '0x095ea7b3000000000000000000000000253c35f10766e8a5115c89ab8ce50282fdc1cec8000000000000000000000000\
0000000000000000000000000000000000000064',
        erc721Approve:
          '0x095ea7b3000000000000000000000000253c35f10766e8a5115c89ab8ce50282fdc1cec8000000000000000000000000\
0000000000000000000000000000000000000002',
        erc20IncreaseAllowance:
          '0x395093510000000000000000000000004d85a924b1b137abf7acb9b0c07355a97460637e000000000000000000000000\
00000000000000000000000000000000000f4240'
      };

      test.each(Object.keys(txDataVariants))('for %s', name => {
        const data = txDataVariants[name];
        expect(getOperationKind({ to: mockDestination, data })).toEqual(EvmOperationKind.Approval);
      });
    });
  });

  it('should return EvmOperationKind.Other for other operations', () => {
    expect(getOperationKind({ to: mockDestination, data: burnErc20Data })).toEqual(EvmOperationKind.Other);
  });
});
