import { OpKind, OperationContents, OperationContentsAndResult } from '@taquito/rpc';

import rawHenMintObjkt from './hen-mint-objkt.json';
import rawKusdSirsSwapWithTkeyCashback from './kusd-sirs-swap-tkey-cashback.json';
import rawObjktComMintArtistCall from './objkt-mint-artist.json';
import rawQuipuswapArbitraging from './quipuswap-arbitraging.json';
import rawRaribleMintCall from './rarible-mint.json';
import rawTempleWalletSirsXtzSwap from './temple-wallet-sirs-xtz-swap.json';
import rawWtzArbitraging from './wtz-arbitraging.json';
import rawWxtzMintAndBurn from './wxtz-mint-and-burn.json';
import rawXtzKusdSwap from './xtz-kusd-swap.json';

export const stakeOperation: OperationContents[] = [
  {
    kind: OpKind.TRANSACTION,
    source: 'tz1XQzfabXm4LZNKnok6W41rdp35qYbti9uE',
    fee: '827',
    counter: '47709016',
    gas_limit: '3930',
    storage_limit: '0',
    amount: '4000000',
    destination: 'tz1XQzfabXm4LZNKnok6W41rdp35qYbti9uE',
    parameters: { entrypoint: 'stake', value: { prim: 'Unit' } }
  }
];

export const sendTezOperation: OperationContents[] = [
  {
    kind: OpKind.TRANSACTION,
    source: 'tz1XQzfabXm4LZNKnok6W41rdp35qYbti9uE',
    fee: '442',
    counter: '33947',
    gas_limit: '169',
    storage_limit: '0',
    amount: '1000000',
    destination: 'tz1UNUZffw6EJvVtboLHNKETvMbezGLxhESs'
  }
];

// https://tzkt.io/opRnZMSuEoEETtUgxwqAuBCTEZR4nMWiBirXwab77MRtt2D7Cde/47709009
export const xtzKusdSwap = rawXtzKusdSwap as OperationContentsAndResult[];

// https://ghostnet.tzkt.io/opFjzCMjGHSa23mkhMgbSPArtpJCLCbv2B55PMoSonBmyxLpCoR/40798051
export const contractWithBalanceOrigination: OperationContents = {
  kind: OpKind.ORIGINATION,
  source: 'tz1cFVkBAgJGbLqie5MVEXy4pjNTbsQYzNky',
  fee: '701',
  counter: '40798051',
  gas_limit: '621',
  storage_limit: '463',
  balance: '6',
  script: {
    code: [
      {
        prim: 'storage',
        args: [
          {
            prim: 'pair',
            args: [
              { prim: 'int', annots: ['%error_code'] },
              { prim: 'string', annots: ['%message'] }
            ]
          }
        ]
      },
      { prim: 'parameter', args: [{ prim: 'string', annots: ['%add_text'] }] },
      {
        prim: 'code',
        args: [
          [
            { prim: 'UNPAIR' },
            { prim: 'PUSH', args: [{ prim: 'nat' }, { int: '0' }] },
            { prim: 'DUP', args: [{ int: '2' }] },
            { prim: 'SIZE' },
            { prim: 'COMPARE' },
            { prim: 'GT' },
            {
              prim: 'IF',
              args: [
                [
                  { prim: 'PUSH', args: [{ prim: 'nat' }, { int: '10' }] },
                  { prim: 'DUP', args: [{ int: '2' }] },
                  { prim: 'SIZE' },
                  { prim: 'COMPARE' },
                  { prim: 'LE' }
                ],
                [{ prim: 'PUSH', args: [{ prim: 'bool' }, { prim: 'False' }] }]
              ]
            },
            {
              prim: 'IF',
              args: [
                [],
                [
                  { prim: 'PUSH', args: [{ prim: 'string' }, { string: 'Invalid string length' }] },
                  { prim: 'FAILWITH' }
                ]
              ]
            },
            { prim: 'PUSH', args: [{ prim: 'string' }, { string: 'We are ' }] },
            { prim: 'CONCAT' },
            { prim: 'UPDATE', args: [{ int: '2' }] },
            { prim: 'NIL', args: [{ prim: 'operation' }] },
            { prim: 'PAIR' }
          ]
        ]
      }
    ],
    storage: { prim: 'Pair', args: [{ int: '500' }, { string: '' }] }
  }
};

// https://tzkt.io/opVPAJHe3cfNwgvM2FFpztvoUeM5HNPNV9ZQsimrnTZNjc65GZb/67860711
export const templeWalletSirsXtzSwap = rawTempleWalletSirsXtzSwap as OperationContentsAndResult[];

// https://tzkt.io/oo8bUFnWXTCP1GP5bCPC9iYF3aXSWZXuYZ1Mb8rBSEd3v544ukB/67860702
export const kusdSirsSwapWithTkeyCashback = rawKusdSirsSwapWithTkeyCashback as OperationContentsAndResult[];

// https://tzkt.io/oowmw3ocmKcW1PaCBkPqh8Fijn5kmHJqxZretw6XC2YyE7MFpLz/47706676
export const objktComMintArtistCall = rawObjktComMintArtistCall as OperationContentsAndResult[];

// https://tzkt.io/ontaYBhBF3V18CjUUgyBgdjY8o1uDMm7Yp7jDuPkJ6W5Ciz1jdK/11302326
export const henMintObjktCall = rawHenMintObjkt as OperationContentsAndResult[];

// https://tzkt.io/ooyjJHdrsP8qhddEtqyXEBDhrxCqf7Epq6ivc7GM1UJFg6qB8dD/47700238
export const raribleMintCall = rawRaribleMintCall as OperationContentsAndResult[];

// https://tzkt.io/opBwkhpjPu5Xb5awwABVry3mtGa7zFhpfHcpnuk47emmqmVWJrs/111639985
export const quipuswapArbitragingOperations = rawQuipuswapArbitraging as OperationContentsAndResult[];

// https://tzkt.io/onenxe2DdsbYpqbHNdQ3C45LHoL7GBwtbGF4RaTUTc46b4P1Rq3/7117410
export const wXtzMintAndBurnOperations = rawWxtzMintAndBurn as OperationContentsAndResult[];

// https://tzkt.io/onhvtQ4eYJCXNiyCGErbkGWSUMqA1zimNs1NgEnLxCNwzRgz3sV/4628654
export const wtzArbitraging = rawWtzArbitraging as OperationContentsAndResult[];
