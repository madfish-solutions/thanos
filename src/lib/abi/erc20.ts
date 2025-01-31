export const erc20TransferEvent = {
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
      indexed: false,
      name: 'value',
      type: 'uint256'
    }
  ]
} as const;

export const erc20MintAbi = {
  type: 'function',
  name: 'mint',
  stateMutability: 'nonpayable',
  inputs: [
    {
      name: 'account',
      type: 'address'
    },
    {
      name: 'value',
      type: 'uint256'
    }
  ],
  outputs: []
} as const;

export const erc20BurnAbi = {
  type: 'function',
  name: 'burn',
  stateMutability: 'nonpayable',
  inputs: [
    {
      name: 'value',
      type: 'uint256'
    }
  ],
  outputs: []
} as const;

export const erc20BurnFromAbi = {
  type: 'function',
  name: 'burnFrom',
  stateMutability: 'nonpayable',
  inputs: [
    {
      name: 'account',
      type: 'address'
    },
    {
      name: 'value',
      type: 'uint256'
    }
  ],
  outputs: []
} as const;

export const erc20TransferAbi = {
  type: 'function',
  name: 'transfer',
  stateMutability: 'nonpayable',
  inputs: [
    {
      name: 'recipient',
      type: 'address'
    },
    {
      name: 'amount',
      type: 'uint256'
    }
  ],
  outputs: [
    {
      type: 'bool'
    }
  ]
} as const;

export const erc20TransferFromAbi = {
  type: 'function',
  name: 'transferFrom',
  stateMutability: 'nonpayable',
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
      name: 'amount',
      type: 'uint256'
    }
  ],
  outputs: [
    {
      type: 'bool'
    }
  ]
} as const;
