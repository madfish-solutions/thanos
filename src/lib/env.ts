export const IS_DEV_ENV = process.env.NODE_ENV === 'development';

export const BACKGROUND_IS_WORKER = process.env.BACKGROUND_IS_WORKER === 'true';

const RequiredEnvVars = {
  TEMPLE_WALLET_API_URL: process.env.TEMPLE_WALLET_API_URL,
  TEMPLE_WALLET_METADATA_API_URL: process.env.TEMPLE_WALLET_METADATA_API_URL,
  TEMPLE_WALLET_DEXES_API_URL: process.env.TEMPLE_WALLET_DEXES_API_URL,
  TEMPLE_WALLET_JITSU_TRACKING_HOST: process.env.TEMPLE_WALLET_JITSU_TRACKING_HOST,
  TEMPLE_WALLET_JITSU_WRITE_KEY: process.env.TEMPLE_WALLET_JITSU_WRITE_KEY,
  TEMPLE_WALLET_EXOLIX_API_KEY: process.env.TEMPLE_WALLET_EXOLIX_API_KEY,
  TEMPLE_WALLET_EVERSTAKE_API_KEY: process.env.TEMPLE_WALLET_EVERSTAKE_API_KEY,
  TEMPLE_WALLET_EVERSTAKE_LINK_ID: process.env.TEMPLE_WALLET_EVERSTAKE_LINK_ID,
  TEMPLE_WALLET_UTORG_SID: process.env.TEMPLE_WALLET_UTORG_SID,
  TEMPLE_WALLET_ROUTE3_CONTRACT: process.env.TEMPLE_WALLET_ROUTE3_CONTRACT
} as const;

Object.entries(RequiredEnvVars).forEach(([key, val]) => {
  if (!val) throw new Error(`process.env.${key} is not set`);
});

type RequiredEnvVarName = keyof typeof RequiredEnvVars;

type EnvVarsType = {
  readonly [key in RequiredEnvVarName]: string;
};

export const EnvVars = RequiredEnvVars as EnvVarsType;
