import BigNumber from 'bignumber.js';
import type { TransactionSerializable } from 'viem';
import { kavaTestnet } from 'viem/chains';

import { EVM_TOKEN_SLUG } from 'lib/assets/defaults';
import { toEvmAssetSlug } from 'lib/assets/utils';
import { EvmAssetStandard } from 'lib/evm/types';
import { stripZeroBalancesChanges } from 'lib/utils/balances-changes';
import { getReadOnlyEvmForNetwork } from 'temple/evm';
import { AssetsAmounts, TempleChainKind } from 'temple/types';

import { detectEvmTokenStandard } from './common.utils.mock';
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

import { getEvmBalancesChanges } from '.';

const testClient = getReadOnlyEvmForNetwork({
  kind: TempleChainKind.EVM,
  chainId: kavaTestnet.id,
  rpcBaseURL: kavaTestnet.rpcUrls.default.http[0],
  name: kavaTestnet.name,
  currency: {
    standard: EvmAssetStandard.NATIVE,
    address: EVM_TOKEN_SLUG,
    ...kavaTestnet.nativeCurrency
  },
  default: false,
  allBlockExplorers: [{ id: 'defaultBE', default: false, ...kavaTestnet.blockExplorers.default }],
  rpc: {
    chain: TempleChainKind.EVM,
    chainId: kavaTestnet.id,
    id: 'defaultRPC',
    rpcBaseURL: kavaTestnet.rpcUrls.default.http[0],
    name: kavaTestnet.name,
    color: '#000000'
  },
  allRpcs: [
    {
      chain: TempleChainKind.EVM,
      chainId: kavaTestnet.id,
      id: 'defaultRPC',
      rpcBaseURL: kavaTestnet.rpcUrls.default.http[0],
      name: kavaTestnet.name,
      color: '#000000'
    }
  ]
});

const simulateContractMock = jest.fn();

testClient.simulateContract = simulateContractMock;

const aliceAddress = '0x253C35f10766E8A5115c89AB8cE50282FdC1ceC8';
const bobAddress = '0x4D85A924B1b137abf7acb9B0c07355a97460637E';
const carolAddress = '0x8E2C8F793F927B0FB600661C292817bc5fbDC931';

const testFxtzAddress = '0x3B008D8F1AcB7a56B5fE505007eE196ad7d1b7A4';
const testFxtzTokenSlug = '0x3B008D8F1AcB7a56B5fE505007eE196ad7d1b7A4_0';
const testUsdcAddress = '0x43D8814FdFB9B8854422Df13F1c66e34E4fa91fD';
const testUsdcTokenSlug = '0x43D8814FdFB9B8854422Df13F1c66e34E4fa91fD_0';

const testErc721Address = '0x0b4b8dC0d6E8Ef35d1B48717c29a968664238F06';
const testErc1155Address = '0xbd176E60DEF79f956E91F97e0cE54E6fC4Ac83aD';

const getTestErc721TokenSlug = (tokenId: number) => toEvmAssetSlug(testErc721Address, String(tokenId));
const getTestErc1155TokenSlug = (tokenId: number) => toEvmAssetSlug(testErc1155Address, String(tokenId));

const checkEvmBalancesChanges = async (tx: TransactionSerializable, sender: HexString, expected: AssetsAmounts) => {
  const actualValue = stripZeroBalancesChanges(await getEvmBalancesChanges(tx, sender, testClient));
  expect(actualValue).toEqual(expected);
};

describe('getEvmBalancesChanges', () => {
  it('should return amount of spent ETH if a transaction has no data', async () => {
    const emptyDataValues = [undefined, '0x'] as const;
    await Promise.all(
      emptyDataValues.map(data =>
        checkEvmBalancesChanges({ to: bobAddress, value: BigInt(5e18), data }, aliceAddress, {
          [EVM_TOKEN_SLUG]: { atomicAmount: new BigNumber(-5e18), isNft: false }
        })
      )
    );
  });

  describe('ERC20 methods', () => {
    beforeAll(() => detectEvmTokenStandard.mockResolvedValue(EvmAssetStandard.ERC20));

    afterAll(() => detectEvmTokenStandard.mockReset());

    describe('mint(address account, uint256 value)', () => {
      // https://testnet.bscscan.com/tx/0xc48f590c30aa660c947d47b5096d44469267922a5cc4431b1a3fec3453de11f0
      const testTransaction: TransactionSerializable = {
        to: testFxtzAddress,
        data: mintErc20Data
      };

      it('should return the amount of minted tokens if `account` is the address of the sender', async () => {
        await checkEvmBalancesChanges(testTransaction, aliceAddress, {
          [testFxtzTokenSlug]: { atomicAmount: new BigNumber(1e7), isNft: false }
        });
      });

      it('should return no changes if `account` is not the address of the sender', async () => {
        await checkEvmBalancesChanges(testTransaction, bobAddress, {});
      });
    });

    describe('burn(uint256 value)', () => {
      // https://testnet.bscscan.com/tx/0x89ed4b740a10c11d4f66e7efc21e7bfd9f4cdb1e793b7b87e49885e820135ff9
      const testTransaction: TransactionSerializable = {
        to: testFxtzAddress,
        data: burnErc20Data
      };

      it('should return the negated amount of burned tokens', async () => {
        await checkEvmBalancesChanges(testTransaction, aliceAddress, {
          [testFxtzTokenSlug]: { atomicAmount: new BigNumber(-1e6), isNft: false }
        });
      });
    });

    describe('burnFrom(address account, uint256 value)', () => {
      // https://testnet.bscscan.com/tx/0x94bc40123d6825256c64f229cc721cce724f35cd92c49b0a019fe16744e55937
      const testTransaction: TransactionSerializable = {
        to: testFxtzAddress,
        data: '0x79cc6790000000000000000000000000253c35f10766e8a5115c89ab8ce50282fdc1cec8000000000000000000000000\
00000000000000000000000000000000000f4240'
      };
      it('should return the negated amount of burned tokens if `account` is the address of the sender', async () => {
        await checkEvmBalancesChanges(testTransaction, aliceAddress, {
          [testFxtzTokenSlug]: { atomicAmount: new BigNumber(-1e6), isNft: false }
        });
      });

      it('should return no changes if `account` is not the address of the sender', async () => {
        await checkEvmBalancesChanges(testTransaction, bobAddress, {});
      });
    });

    describe('transfer(address recipient, uint256 amount)', () => {
      // https://testnet.kavascan.com/tx/0x40db4721522dd60aba5233da6bc7ecee338c53a3e18fcdf6b2e4ab8b1d3b469c
      const testTransaction: TransactionSerializable = {
        to: testUsdcAddress,
        data: transferErc20Data
      };

      it('should return correct balance changes', async () => {
        await checkEvmBalancesChanges(testTransaction, aliceAddress, {
          [testUsdcTokenSlug]: { atomicAmount: new BigNumber(-1500000), isNft: false }
        });
      });
    });

    describe('transferFrom(address sender, address recipient, uint256 amount)', () => {
      // https://testnet.kavascan.com/tx/0xa05e196400221601fbc6faab4865854339e6f3e842662b3f3623480cdca484e7
      const testTransaction: TransactionSerializable = {
        to: testUsdcAddress,
        data: transferFromErc20Data
      };

      it('should return correct balance changes', async () => {
        await checkEvmBalancesChanges(testTransaction, aliceAddress, {
          [testUsdcTokenSlug]: { atomicAmount: new BigNumber(-1000000), isNft: false }
        });
        await checkEvmBalancesChanges(testTransaction, bobAddress, {
          [testUsdcTokenSlug]: { atomicAmount: new BigNumber(1000000), isNft: false }
        });
        await checkEvmBalancesChanges(testTransaction, carolAddress, {});
      });
    });
  });

  describe('ERC721 methods', () => {
    beforeAll(() => detectEvmTokenStandard.mockResolvedValue(EvmAssetStandard.ERC721));

    afterAll(() => detectEvmTokenStandard.mockReset());

    describe('safeTransferFrom(address from, address to, uint256 tokenId)', () => {
      // https://testnet.bscscan.com/tx/0xb1c0ee461dd3e7caafc3c676170f9f54f925e9f293ea8feff7a7d1cce4a73d29
      const testTransaction: TransactionSerializable = {
        to: testErc721Address,
        data: safeTransferFromErc721Data
      };

      it('should return correct balance changes', async () => {
        await checkEvmBalancesChanges(testTransaction, aliceAddress, {
          [getTestErc721TokenSlug(0)]: { atomicAmount: new BigNumber(-1), isNft: true }
        });
        await checkEvmBalancesChanges(testTransaction, bobAddress, {
          [getTestErc721TokenSlug(0)]: { atomicAmount: new BigNumber(1), isNft: true }
        });
        await checkEvmBalancesChanges(testTransaction, carolAddress, {});
      });
    });

    describe('safeTransferFrom(address from, address to, uint256 tokenId, bytes data)', () => {
      // https://testnet.bscscan.com/tx/0x647c4c24b2deb894d86f92b74a6135634f8df4185aa26d9a6becc57edc8349eb
      const testTransaction: TransactionSerializable = {
        to: testErc721Address,
        data: safeTransferFromErc721WithBytesData
      };

      it('should return correct balance changes', async () => {
        await checkEvmBalancesChanges(testTransaction, aliceAddress, {
          [getTestErc721TokenSlug(1)]: { atomicAmount: new BigNumber(-1), isNft: true }
        });
        await checkEvmBalancesChanges(testTransaction, bobAddress, {
          [getTestErc721TokenSlug(1)]: { atomicAmount: new BigNumber(1), isNft: true }
        });
        await checkEvmBalancesChanges(testTransaction, carolAddress, {});
      });
    });

    describe('transferFrom(address from, address to, uint256 tokenId)', () => {
      // https://testnet.bscscan.com/tx/0x8812f80daf04bbdcd17d5c7a92fc346d8c157878e076255a38777390c6103d97
      const testTransaction: TransactionSerializable = {
        to: testErc721Address,
        data: transferFromErc721Data
      };

      it('should return correct balance changes', async () => {
        await checkEvmBalancesChanges(testTransaction, aliceAddress, {
          [getTestErc721TokenSlug(1)]: { atomicAmount: new BigNumber(-1), isNft: true }
        });
        await checkEvmBalancesChanges(testTransaction, carolAddress, {
          [getTestErc721TokenSlug(1)]: { atomicAmount: new BigNumber(1), isNft: true }
        });
        await checkEvmBalancesChanges(testTransaction, bobAddress, {});
      });
    });

    describe('mint(address to, string uri)', () => {
      // https://testnet.bscscan.com/tx/0x7cec721f550fc3c593e4343f80652adf841db05b7b3540644dc180d75224999d
      const testTransaction: TransactionSerializable = {
        to: testErc721Address,
        data: mintErc721Data
      };

      it('should return correct balance changes if simulation passes', async () => {
        simulateContractMock.mockResolvedValue({
          request: testTransaction,
          result: BigInt(3)
        });
        await checkEvmBalancesChanges(testTransaction, aliceAddress, {
          [getTestErc721TokenSlug(3)]: { atomicAmount: new BigNumber(1), isNft: true }
        });
        await checkEvmBalancesChanges(testTransaction, bobAddress, {});
        simulateContractMock.mockReset();
      });

      it('should return no changes if simulation fails', async () => {
        simulateContractMock.mockRejectedValueOnce(new Error());
        await checkEvmBalancesChanges(testTransaction, aliceAddress, {});
      });
    });

    describe('safeMint(address to, string uri)', () => {
      // https://testnet.bscscan.com/tx/0xf2f693067f47d4069114dde545cfc1f80a675daf6aabbd77a11d75657843fd42
      const testTransaction: TransactionSerializable = {
        to: testErc721Address,
        data: safeMintErc721Data
      };

      it('should return correct balance changes if simulation passes', async () => {
        simulateContractMock.mockResolvedValue({
          request: testTransaction,
          result: BigInt(3)
        });
        await checkEvmBalancesChanges(testTransaction, aliceAddress, {
          [getTestErc721TokenSlug(3)]: { atomicAmount: new BigNumber(1), isNft: true }
        });
        await checkEvmBalancesChanges(testTransaction, bobAddress, {});
        simulateContractMock.mockReset();
      });

      it('should return no changes if simulation fails', async () => {
        simulateContractMock.mockRejectedValueOnce(new Error());
        await checkEvmBalancesChanges(testTransaction, aliceAddress, {});
      });
    });

    describe('burn(uint256 tokenId)', () => {
      // https://testnet.bscscan.com/tx/0x1c38aadaf84c5ce3ed186338895aeb4c022a67f9988282130ccc3b12c9fab4cf
      const testTransaction: TransactionSerializable = {
        to: testErc721Address,
        data: '0x42966c680000000000000000000000000000000000000000000000000000000000000001'
      };

      it('should return the negated amount of burned tokens', async () => {
        await checkEvmBalancesChanges(testTransaction, carolAddress, {
          [getTestErc721TokenSlug(1)]: { atomicAmount: new BigNumber(-1), isNft: true }
        });
      });
    });
  });

  describe('ERC1155 methods', () => {
    describe('safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data)', () => {
      // https://sepolia.etherscan.io/tx/0xb44652c879f1c16d1126f293ad76a9f4411c753ac6c1f3ef53f7271d271d8891
      const testTransaction: TransactionSerializable = {
        to: testErc1155Address,
        data: safeBatchTransferFromErc1155Data
      };
      it('should return correct balance changes', async () => {
        await checkEvmBalancesChanges(testTransaction, aliceAddress, {
          [getTestErc1155TokenSlug(0)]: { atomicAmount: new BigNumber(-1), isNft: true },
          [getTestErc1155TokenSlug(2)]: { atomicAmount: new BigNumber(-5), isNft: true }
        });
        await checkEvmBalancesChanges(testTransaction, bobAddress, {
          [getTestErc1155TokenSlug(0)]: { atomicAmount: new BigNumber(1), isNft: true },
          [getTestErc1155TokenSlug(2)]: { atomicAmount: new BigNumber(5), isNft: true }
        });
        await checkEvmBalancesChanges(testTransaction, carolAddress, {});
      });
    });

    describe('safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)', () => {
      // https://sepolia.etherscan.io/tx/0x31d4d37f5431942f44e934d41ca55334992e495149a2dac90a8d7b4ba357a05b
      const testTransaction: TransactionSerializable = {
        to: testErc1155Address,
        data: safeTransferFromErc1155Data
      };

      it('should return correct balance changes', async () => {
        await checkEvmBalancesChanges(testTransaction, aliceAddress, {
          [getTestErc1155TokenSlug(2)]: { atomicAmount: new BigNumber(-4), isNft: true }
        });
        await checkEvmBalancesChanges(testTransaction, bobAddress, {
          [getTestErc1155TokenSlug(2)]: { atomicAmount: new BigNumber(4), isNft: true }
        });
        await checkEvmBalancesChanges(testTransaction, carolAddress, {});
      });
    });

    describe('mintBatch(address to, uint256[] ids, uint256[] amounts, bytes data)', () => {
      // https://sepolia.etherscan.io/tx/0xd9ad7ef43d23f7db76119c0d255f6458ea5fafe52264ae5d60b9ca1ae22658ff
      const testTransaction: TransactionSerializable = {
        to: testErc1155Address,
        data: mintBatchErc1155Data
      };

      it('should return the amounts of minted tokens if `to` is the address of the sender', async () => {
        await checkEvmBalancesChanges(testTransaction, aliceAddress, {
          [getTestErc1155TokenSlug(0)]: { atomicAmount: new BigNumber(2), isNft: true },
          [getTestErc1155TokenSlug(1)]: { atomicAmount: new BigNumber(3), isNft: true },
          [getTestErc1155TokenSlug(2)]: { atomicAmount: new BigNumber(4), isNft: true }
        });
      });

      it('should return no changes if `to` is not the address of the sender', async () => {
        await checkEvmBalancesChanges(testTransaction, bobAddress, {});
      });
    });

    describe('mint(address to, uint256 id, uint256 amount, bytes data)', () => {
      // https://sepolia.etherscan.io/tx/0x3671bfecaf87fb06ce4c8fc2263cd26a87ce9dc081d22f74a832499094005596
      const testTransaction: TransactionSerializable = {
        to: testErc1155Address,
        data: mintErc1155Data
      };

      it('should return the amounts of minted tokens if `to` is the address of the sender', async () => {
        await checkEvmBalancesChanges(testTransaction, aliceAddress, {
          [getTestErc1155TokenSlug(0)]: { atomicAmount: new BigNumber(3), isNft: true }
        });
      });

      it('should return no changes if `to` is not the address of the sender', async () => {
        await checkEvmBalancesChanges(testTransaction, bobAddress, {});
      });
    });

    describe('burnBatch(address account, uint256[] ids, uint256[] values)', () => {
      // https://sepolia.etherscan.io/tx/0x49595a7167a288d7248485fdadd75ee86aa1b117b7f3c6ada28317c43691aa47
      const testTransaction: TransactionSerializable = {
        to: testErc1155Address,
        data: '0x6b20c454000000000000000000000000253c35f10766e8a5115c89ab8ce50282fdc1cec8000000000000000000000000\
000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000e0000000000\
00000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000\
00000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000\
00000000000000000000200000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000\
00000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000010000000000000\
000000000000000000000000000000000000000000000000004'
      };
      it('should return the negated amounts of burned tokens if `from` is the address of the sender', async () => {
        await checkEvmBalancesChanges(testTransaction, aliceAddress, {
          [getTestErc1155TokenSlug(0)]: { atomicAmount: new BigNumber(-3), isNft: true },
          [getTestErc1155TokenSlug(1)]: { atomicAmount: new BigNumber(-1), isNft: true },
          [getTestErc1155TokenSlug(2)]: { atomicAmount: new BigNumber(-4), isNft: true }
        });
      });

      it('should return no changes if `to` is not the address of the sender', async () => {
        await checkEvmBalancesChanges(testTransaction, bobAddress, {});
      });
    });

    describe('burn(address account, uint256 id, uint256 value)', () => {
      // https://sepolia.etherscan.io/tx/0x0c80936461d8dd08bbc4f7eabffe7014e18703aeaae3ead5f9ac199a9fa2e9d1
      const testTransaction: TransactionSerializable = {
        to: testErc1155Address,
        data: '0xf5298aca000000000000000000000000253c35f10766e8a5115c89ab8ce50282fdc1cec8000000000000000000000000\
00000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000003'
      };

      it('should return the negated amount of burned tokens if `from` is the address of the sender', async () => {
        await checkEvmBalancesChanges(testTransaction, aliceAddress, {
          [getTestErc1155TokenSlug(2)]: { atomicAmount: new BigNumber(-3), isNft: true }
        });
      });

      it('should return no changes if `to` is not the address of the sender', async () => {
        await checkEvmBalancesChanges(testTransaction, bobAddress, {});
      });
    });
  });
});
