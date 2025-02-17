import {
  PaymentProviderInterface,
  TopUpInputInterface,
  TopUpOutputInterface
} from 'lib/buy-with-credit-card/topup.interface';

export interface BuyWithCreditCardFormData {
  inputCurrency: TopUpInputInterface;
  outputToken: TopUpOutputInterface;
  provider?: PaymentProviderInterface;
  inputAmount?: number;
  outputAmount?: number;
}
