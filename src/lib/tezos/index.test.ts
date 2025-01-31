import BigNumber from 'bignumber.js';

import { TEZ_TOKEN_SLUG } from 'lib/assets';
import { stripZeroBalancesChanges } from 'lib/utils/balances-changes';

import {
  xtzKusdSwap,
  sendTezOperation,
  stakeOperation,
  contractWithBalanceOrigination,
  templeWalletSirsXtzSwap,
  kusdSirsSwapWithTkeyCashback,
  objktComMintArtistCall,
  henMintObjktCall,
  raribleMintCall,
  quipuswapArbitragingOperations,
  wXtzMintAndBurnOperations,
  wtzArbitraging
} from './mock-data';

import { isValidTezosAddress, isTezosContractAddress, isValidTezosChainId, getBalancesChanges } from './index';

let address: string;

describe('Tezos Helpers', () => {
  it('isValidTezosChainId', () => {
    expect(isValidTezosChainId('NetXdQprcVkpaWU')).toBeTruthy();
    expect(isValidTezosChainId('NetXo8SqH1c38SS')).toBeTruthy();
    expect(isValidTezosChainId('asdasd')).toBeFalsy();
    expect(isValidTezosChainId('NetXo8SqH1c38SSasdasd')).toBeFalsy();
  });

  it('isValidTezosAddress', async () => {
    address = 'asdasdasd';
    expect(isValidTezosAddress(address)).toBeFalsy();

    address = 'tz1asdasd';
    expect(isValidTezosAddress(address)).toBeFalsy();

    address = 'tz1ZfrERcALBwmAqwonRXYVQBDT9BjNjBHJu';
    expect(isValidTezosAddress(address)).toBeTruthy();

    address = 'tz2Ch1abG7FNiibmV26Uzgdsnfni9XGrk5wD';
    expect(isValidTezosAddress(address)).toBeTruthy();

    address = 'tz3Lfm6CyfSTZ7EgMckptZZGiPxzs9GK59At';
    expect(isValidTezosAddress(address)).toBeTruthy();

    address = 'KT1EyH6KR9STvgiet4ahrtBf7WCnmJovvJa1';
    expect(isValidTezosAddress(address)).toBeTruthy();
  });

  it('isTezosContractAddress', async () => {
    address = 'tz3Lfm6CyfSTZ7EgMckptZZGiPxzs9GK59At';
    expect(isTezosContractAddress(address)).toBeFalsy();

    address = 'KT1EyH6KR9STvgiet4ahrtBf7WCnmJovvJa1';
    expect(isTezosContractAddress(address)).toBeTruthy();
  });

  // TODO: add more tests for better code coverage
  describe('getBalancesChanges', () => {
    describe('operations without results', () => {
      it('should work correctly for staking 4 TEZ', () => {
        expect(getBalancesChanges(stakeOperation, 'tz1XQzfabXm4LZNKnok6W41rdp35qYbti9uE')).toEqual({
          [TEZ_TOKEN_SLUG]: { atomicAmount: new BigNumber(-4000000), isNft: false }
        });
        expect(getBalancesChanges(stakeOperation, 'tz1UNUZffw6EJvVtboLHNKETvMbezGLxhESs')).toEqual({});
      });

      it('should work correctly for sending 1 TEZ', () => {
        expect(getBalancesChanges(sendTezOperation, 'tz1XQzfabXm4LZNKnok6W41rdp35qYbti9uE')).toEqual({
          [TEZ_TOKEN_SLUG]: { atomicAmount: new BigNumber(-1000000), isNft: false }
        });
        expect(getBalancesChanges(sendTezOperation, 'tz1UNUZffw6EJvVtboLHNKETvMbezGLxhESs')).toEqual({
          [TEZ_TOKEN_SLUG]: { atomicAmount: new BigNumber(1000000), isNft: false }
        });
        expect(getBalancesChanges(sendTezOperation, 'tz1eSbADvrQzhH6vWP6MUy6VoEiGPJJZj696')).toEqual({});
      });

      it('should work correctly for originating a contract', () => {
        expect(getBalancesChanges(contractWithBalanceOrigination, 'tz1cFVkBAgJGbLqie5MVEXy4pjNTbsQYzNky')).toEqual({
          [TEZ_TOKEN_SLUG]: { atomicAmount: new BigNumber(-6), isNft: false }
        });
      });

      describe('wrapped TEZ tokens mints', () => {
        it('should return correct expenses for arbitraging when WTZ are minted', () => {
          expect(getBalancesChanges(wtzArbitraging, 'tz1codeYURj5z49HKX9zmLHms2vJN2qDjrtt')).toEqual({
            KT1PnUZCp3u2KzWr93pn4DD7HAJnm3rWVrgn_0: {
              atomicAmount: new BigNumber(1337845),
              isNft: false
            },
            KT1UQVEDf4twF2eMbrCKQAxN7YYunTAiCTTm_0: {
              atomicAmount: new BigNumber('370621295338967'),
              isNft: undefined
            },
            [TEZ_TOKEN_SLUG]: {
              atomicAmount: new BigNumber(-2719998),
              isNft: false
            }
          });
        });

        it('should return correct expenses for Quipuswap arbitraging when wTEZ are minted', () => {
          expect(
            stripZeroBalancesChanges(
              getBalancesChanges(quipuswapArbitragingOperations, 'tz1e52JwM8fUedsr1hEnNgjKHYRBpvV6QVG5')
            )
          ).toEqual({
            [TEZ_TOKEN_SLUG]: { atomicAmount: new BigNumber(507056), isNft: false },
            KT1UpeXdK6AJbX58GJ92pLZVCucn2DR8Nu4b_0: { atomicAmount: new BigNumber(1), isNft: false },
            KT1XnTn74bUtxHfDtBmm2bGZAQfhPbvKWR8o_0: { atomicAmount: new BigNumber(1), isNft: undefined }
          });
        });

        it('should work correctly for wXTZ mint', () => {
          expect(getBalancesChanges(wXtzMintAndBurnOperations, 'tz1PQ6wH8iPSwesLF2u2QShYc31YuuAcmT1t')).toEqual({
            KT1VYsVfmobT7rsMVivvZ4J8i3bPiqz12NaH_0: { atomicAmount: new BigNumber(2100000), isNft: false }
          });
        });
      });

      describe('wrapped TEZ tokens burns', () => {
        it('should work correctly for wXTZ burn', () => {
          expect(getBalancesChanges(wXtzMintAndBurnOperations, 'tz1N4UfQCahHkRShBanv9QP9TnmXNgCaqCyZ')).toEqual({
            KT1VYsVfmobT7rsMVivvZ4J8i3bPiqz12NaH_0: { atomicAmount: new BigNumber(-218400000), isNft: false },
            [TEZ_TOKEN_SLUG]: { atomicAmount: new BigNumber(210000000), isNft: false }
          });
        });
      });
    });

    describe('operations with results', () => {
      describe('swaps', () => {
        it('should parse XTZ -> KUSD 3route swap with fee transfer correctly', () => {
          expect(getBalancesChanges(xtzKusdSwap, 'tz1XQzfabXm4LZNKnok6W41rdp35qYbti9uE')).toEqual({
            [TEZ_TOKEN_SLUG]: { atomicAmount: new BigNumber(-10000), isNft: false },
            KT1K9gCRgaLRFKTErYt1wVxA3Frb9FjasjTV_0: { atomicAmount: new BigNumber('12184209723114067'), isNft: false }
          });
        });

        it('should parse SIRS burn and 3route tzBTC -> XTZ swap correctly', () => {
          expect(getBalancesChanges(templeWalletSirsXtzSwap, 'tz1L7QjtFG4KJBMZ8tppwMmTjMGwqxPFCSXM')).toEqual({
            [TEZ_TOKEN_SLUG]: { atomicAmount: new BigNumber(9733046), isNft: false },
            KT1AafHA1C1vk959wvHWBispY9Y2f3fxBUUo_0: { atomicAmount: new BigNumber(-84), isNft: undefined },
            KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn_0: { atomicAmount: new BigNumber(1), isNft: false }
          });
        });

        it('should parse Temple Wallet swap KUSD -> SIRS with TKEY cashback correctly', () => {
          expect(getBalancesChanges(kusdSirsSwapWithTkeyCashback, 'tz1L7QjtFG4KJBMZ8tppwMmTjMGwqxPFCSXM')).toEqual({
            [TEZ_TOKEN_SLUG]: { atomicAmount: new BigNumber(56395), isNft: false },
            KT1K9gCRgaLRFKTErYt1wVxA3Frb9FjasjTV_0: {
              atomicAmount: new BigNumber('-12366265012840152868'),
              isNft: false
            },
            KT1VaEsVNiBoA56eToEK6n6BcPgh1tdx9eXi_0: {
              atomicAmount: new BigNumber('1250187829990618908'),
              isNft: undefined
            },
            KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn_0: { atomicAmount: new BigNumber(99), isNft: false },
            KT1AafHA1C1vk959wvHWBispY9Y2f3fxBUUo_0: { atomicAmount: new BigNumber(84), isNft: undefined }
          });
        });
      });

      describe('NFT mints', () => {
        it('should work correctly for mint_artist call in objkt.com Minting Factory', () => {
          expect(
            stripZeroBalancesChanges(getBalancesChanges(objktComMintArtistCall, 'tz1XQzfabXm4LZNKnok6W41rdp35qYbti9uE'))
          ).toEqual({
            KT1UYSCQusTGcMUrQ2FWi9pmWm9YdUxh1uA5_45: { atomicAmount: new BigNumber(10), isNft: true }
          });
        });

        it('should work correctly for mint_OBJKT call in hic et nunc Minter', () => {
          expect(
            stripZeroBalancesChanges(getBalancesChanges(henMintObjktCall, 'tz1YokFzMR1hX4m4aBqgutxLSUKFDdNoYGEN'))
          ).toEqual({
            KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton_864429: { atomicAmount: new BigNumber(15), isNft: true }
          });
        });

        it('should work correctly for Rarible mint', () => {
          expect(
            stripZeroBalancesChanges(getBalancesChanges(raribleMintCall, 'tz1XQzfabXm4LZNKnok6W41rdp35qYbti9uE'))
          ).toEqual({
            KT18pVpRXKPY2c4U2yFEGSH3ZnhB2kL8kwXS_58076: { atomicAmount: new BigNumber(3), isNft: true }
          });
        });
      });
    });
  });
});
