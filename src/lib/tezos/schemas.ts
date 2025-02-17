import { Schema } from '@taquito/michelson-encoder';

export const fa2TransferParamsSchema = new Schema({
  prim: 'list',
  args: [
    {
      prim: 'pair',
      args: [
        {
          prim: 'address',
          annots: ['%from_']
        },
        {
          prim: 'list',
          args: [
            {
              prim: 'pair',
              args: [
                {
                  prim: 'address',
                  annots: ['%to_']
                },
                {
                  prim: 'nat',
                  annots: ['%token_id']
                },
                {
                  prim: 'nat',
                  annots: ['%amount']
                }
              ]
            }
          ],
          annots: ['%txs']
        }
      ]
    }
  ]
});

export const fa12TransferParamsSchema = new Schema({
  prim: 'pair',
  args: [
    {
      prim: 'address',
      annots: ['%from']
    },
    {
      prim: 'pair',
      args: [
        {
          prim: 'address',
          annots: ['%to']
        },
        {
          prim: 'nat',
          annots: ['%value']
        }
      ]
    }
  ]
});

export const objktComMintParamsSchema = new Schema({
  prim: 'pair',
  args: [
    {
      prim: 'pair',
      args: [
        {
          prim: 'address',
          annots: ['%address']
        },
        {
          prim: 'nat',
          annots: ['%amount']
        }
      ]
    },
    {
      prim: 'map',
      args: [
        {
          prim: 'string'
        },
        {
          prim: 'bytes'
        }
      ],
      annots: ['%metadata']
    },
    {
      prim: 'nat',
      annots: ['%token_id']
    }
  ]
});

export const henMintParamsSchema = new Schema({
  prim: 'pair',
  args: [
    {
      prim: 'pair',
      args: [
        {
          prim: 'address',
          annots: ['%address']
        },
        {
          prim: 'nat',
          annots: ['%amount']
        }
      ]
    },
    {
      prim: 'pair',
      args: [
        {
          prim: 'nat',
          annots: ['%token_id']
        },
        {
          prim: 'map',
          args: [
            {
              prim: 'string'
            },
            {
              prim: 'bytes'
            }
          ],
          annots: ['%token_info']
        }
      ]
    }
  ]
});

export const raribleMintParamsSchema = new Schema({
  prim: 'pair',
  args: [
    {
      prim: 'nat',
      annots: ['%itokenid']
    },
    {
      prim: 'pair',
      args: [
        {
          prim: 'address',
          annots: ['%iowner']
        },
        {
          prim: 'pair',
          args: [
            {
              prim: 'nat',
              annots: ['%iamount']
            },
            {
              prim: 'pair',
              args: [
                {
                  prim: 'map',
                  args: [
                    {
                      prim: 'string'
                    },
                    {
                      prim: 'bytes'
                    }
                  ],
                  annots: ['%itokenMetadata']
                },
                {
                  prim: 'list',
                  args: [
                    {
                      prim: 'pair',
                      args: [
                        {
                          prim: 'address',
                          annots: ['%partAccount']
                        },
                        {
                          prim: 'nat',
                          annots: ['%partValue']
                        }
                      ]
                    }
                  ],
                  annots: ['%iroyalties']
                }
              ]
            }
          ]
        }
      ]
    }
  ]
});

export const raribleBurnParamsSchema = new Schema({
  prim: 'pair',
  args: [
    {
      prim: 'nat',
      annots: ['%itokenid']
    },
    {
      prim: 'nat',
      annots: ['%iamount']
    }
  ]
});

export const mintOrBurnOneEntrypointParamsSchema = new Schema({
  prim: 'pair',
  args: [
    {
      prim: 'int',
      annots: ['%quantity']
    },
    {
      prim: 'address',
      annots: ['%target']
    }
  ]
});

export const wXTZMintParamsSchema = new Schema({
  prim: 'pair',
  args: [
    {
      prim: 'address',
      annots: ['%to']
    },
    {
      prim: 'nat',
      annots: ['%value']
    }
  ]
});

export const wXTZBurnParamsSchema = new Schema({
  prim: 'pair',
  args: [
    {
      prim: 'address',
      annots: ['%from']
    },
    {
      prim: 'nat',
      annots: ['%value']
    }
  ]
});

export const wtzMintOrBurnParamsSchema = new Schema({
  prim: 'pair',
  args: [
    {
      prim: 'pair',
      args: [
        {
          prim: 'address'
        },
        {
          prim: 'nat'
        }
      ]
    },
    {
      prim: 'nat'
    }
  ]
});

export const wtezMintParamsSchema = new Schema({
  prim: 'address'
});

export const wtezBurnParamsSchema = new Schema({
  prim: 'pair',
  args: [
    {
      prim: 'address',
      annots: ['%from_']
    },
    {
      prim: 'address',
      annots: ['%receiver']
    },
    {
      prim: 'nat',
      annots: ['%amount']
    }
  ]
});
