import { TopUpProviderId } from './top-up-provider-id.enum';

export interface TopUpInputInterface {
  name: string;
  code: string;
  codeToDisplay?: string;
  icon: string;
  minAmount?: number;
  maxAmount?: number;
  precision: number;
}

export interface TopUpOutputInterface extends TopUpInputInterface {
  slug: string;
}

export interface PaymentProviderInterface {
  name: string;
  id: TopUpProviderId;
  kycRequired: boolean;
  isBestPrice: boolean;
  minInputAmount?: number;
  maxInputAmount?: number;
  inputAmount?: number;
  inputDecimals?: number;
  inputSymbol?: string;
  outputAmount?: number;
  outputSymbol?: string;
}

export interface TopUpProviderPairLimits {
  min: number;
  max: number;
}
