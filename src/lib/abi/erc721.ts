export const erc721TransferEvent = {
  anonymous: false,
  type: 'event',
  name: 'Transfer',
  inputs: [
    {
      indexed: true,
      name: 'from',
      type: 'address'
    },
    {
      indexed: true,
      name: 'to',
      type: 'address'
    },
    {
      indexed: true,
      name: 'tokenId',
      type: 'uint256'
    }
  ]
} as const;

export const erc721SafeTransferFromPayableAbi = {
  type: 'function',
  name: 'safeTransferFrom',
  stateMutability: 'payable',
  inputs: [
    {
      name: 'from',
      type: 'address'
    },
    {
      name: 'to',
      type: 'address'
    },
    {
      name: 'tokenId',
      type: 'uint256'
    }
  ],
  outputs: []
} as const;

export const erc721SafeTransferFromNonpayableAbi = {
  type: 'function',
  name: 'safeTransferFrom',
  stateMutability: 'nonpayable',
  inputs: [
    {
      name: 'from',
      type: 'address'
    },
    {
      name: 'to',
      type: 'address'
    },
    {
      name: 'id',
      type: 'uint256'
    },
    {
      name: 'data',
      type: 'bytes'
    }
  ],
  outputs: []
} as const;

export const erc721TransferFromAbi = {
  type: 'function',
  name: 'transferFrom',
  stateMutability: 'payable',
  inputs: [
    {
      name: 'sender',
      type: 'address'
    },
    {
      name: 'recipient',
      type: 'address'
    },
    {
      name: 'tokeId',
      type: 'uint256'
    }
  ],
  outputs: []
} as const;

export const erc721MintAbi = {
  type: 'function',
  name: 'mint',
  stateMutability: 'nonpayable',
  inputs: [
    {
      name: 'to',
      type: 'address'
    },
    {
      name: 'uri',
      type: 'string'
    }
  ],
  outputs: [{ type: 'uint256' }]
} as const;

export const erc721SafeMintAbi = {
  type: 'function',
  name: 'safeMint',
  stateMutability: 'nonpayable',
  inputs: [
    {
      name: 'to',
      type: 'address'
    },
    {
      name: 'uri',
      type: 'string'
    }
  ],
  outputs: [{ type: 'uint256' }]
} as const;

export const erc721SafeMintWithDataAbi = {
  type: 'function',
  name: 'safeMint',
  stateMutability: 'nonpayable',
  inputs: [
    {
      name: 'to',
      type: 'address'
    },
    {
      name: 'uri',
      type: 'string'
    },
    {
      name: 'data',
      type: 'bytes'
    }
  ],
  outputs: [{ type: 'uint256' }]
} as const;

export const erc721BurnAbi = {
  type: 'function',
  name: 'burn',
  stateMutability: 'nonpayable',
  inputs: [
    {
      name: 'tokenId',
      type: 'uint256'
    }
  ],
  outputs: []
} as const;
