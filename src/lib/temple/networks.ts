import { getMessage } from "lib/i18n";
import { TempleNetwork } from "lib/temple/types";

export const NETWORKS: TempleNetwork[] = [
  {
    id: "mainnet",
    name: getMessage("tezosMainnet"),
    nameI18nKey: "tezosMainnet",
    description: "Tezos mainnet",
    lambdaContract: "KT1CPuTzwC7h7uLXd5WQmpMFso1HxrLBUtpE",
    type: "main",
    rpcBaseURL: "https://mainnet-node.madfish.solutions",
    color: "#83b300",
    disabled: false,
  },
  {
    id: "giganode-mainnet",
    name: "Tezos Mainnet @giganode",
    description: "Highly available Tezos Mainnet nodes operated by Giganode",
    type: "main",
    rpcBaseURL: "https://mainnet-tezos.giganode.io",
    color: "#83b300",
    disabled: false,
  },
  {
    id: "smartpy-mainnet",
    name: "SmartPy Mainnet",
    description: "SmartPy Mainnet",
    type: "main",
    rpcBaseURL: "https://mainnet.smartpy.io",
    color: "#83b300",
    disabled: false,
  },
  {
    id: "tzbeta-mainnet",
    name: "Tezos Mainnet @rpc.tzbeta.net",
    description: "Highly available Tezos Mainnet nodes operated by Blockscale",
    type: "main",
    rpcBaseURL: "https://rpc.tzbeta.net",
    color: "#83b300",
    disabled: false,
  },
  {
    id: "tezie-mainnet",
    name: "Tezos Mainnet @api.tez.ie",
    description: "Highly available Tezos Mainnet nodes operated by ECAD Labs",
    type: "main",
    rpcBaseURL: "https://api.tez.ie/rpc/mainnet",
    color: "#83b300",
    disabled: false,
  },
  // Hidden
  {
    id: "giganode-mainnet",
    name: "Tezos Mainnet @giganode",
    description: "Highly available Tezos Mainnet nodes operated by Giganode",
    type: "main",
    rpcBaseURL: "https://mainnet-tezos.giganode.io",
    color: "#83b300",
    disabled: false,
    hidden: true,
  },
  {
    id: "giganode-testnet",
    name: "Florence Testnet @giganode",
    description: "Highly available Tezos Mainnet nodes operated by Giganode",
    type: "test",
    rpcBaseURL: "https://testnet-tezos.giganode.io",
    color: "#83b300",
    disabled: false,
    hidden: true,
  },
  {
    id: "tzbeta-mainnet",
    name: "Tezos Mainnet @rpc.tzbeta.net",
    description: "Highly available Tezos Mainnet nodes operated by Blockscale",
    type: "main",
    rpcBaseURL: "https://rpc.tzbeta.net",
    color: "#83b300",
    disabled: false,
    hidden: true,
  },
  {
    id: "tzbeta-testnet",
    name: "Florence Testnet @rpctest.tzbeta.net",
    description: "Highly available Delphi Testnet nodes operated by Blockscale",
    type: "test",
    rpcBaseURL: "https://rpctest.tzbeta.net",
    color: "#ed6663",
    disabled: false,
    hidden: true,
  },
  {
    id: "tzbeta-rpczero",
    name: "Edo Testnet @rpczero.tzbeta.net",
    description: "Highly available Edo Testnet nodes operated by Blockscale",
    type: "test",
    rpcBaseURL: "https://rpczero.tzbeta.net",
    color: "#FBBF24",
    disabled: false,
    hidden: true,
  },
  {
    id: "tezie-mainnet",
    name: "Tezos Mainnet @api.tez.ie",
    description: "Highly available Tezos Mainnet nodes operated by ECAD Labs",
    type: "main",
    rpcBaseURL: "https://api.tez.ie/rpc/mainnet",
    color: "#83b300",
    disabled: false,
    hidden: true,
  },
  {
    id: "tezie-delphinet",
    name: "Delphi Testnet @api.tez.ie",
    description: "Highly available Delphi Testnet nodes operated by ECAD Labs",
    type: "test",
    rpcBaseURL: "https://api.tez.ie/rpc/delphinet",
    color: "#ed6663",
    disabled: false,
    hidden: true,
  },
  {
    id: "tezie-edonet",
    name: "Edo Testnet @api.tez.ie",
    description: "Highly available Edo Testnet nodes operated by ECAD Labs",
    type: "test",
    rpcBaseURL: "https://api.tez.ie/rpc/edonet",
    color: "#FBBF24",
    disabled: false,
    hidden: true,
  },
  {
    id: "pointninja-mainnet",
    name: "Tezos Mainnet @mainnet.point.ninja",
    description: "Highly available Tezos Mainnet nodes operated by Point Ninja",
    type: "main",
    rpcBaseURL: "https://mainnet.point.ninja",
    color: "#83b300",
    disabled: false,
    hidden: true,
  },
  {
    id: "madfish-mainnet",
    name: "Tezos Mainnet @mainnet-node.madfish.solutions",
    description:
      "Highly available Tezos Mainnet nodes operated by Madfish Solutions",
    type: "main",
    rpcBaseURL: "https://mainnet-node.madfish.solutions",
    color: "#83b300",
    disabled: false,
    hidden: true,
  },
];
