import { gql } from '@apollo/client';

export const buildGetCollectiblesQuery = () => gql`
  query MyQuery($where: token_bool_exp) {
    token(where: $where) {
      fa_contract
      token_id
      listings_active(order_by: { price_xtz: asc }) {
        currency_id
        price
      }
      description
      creators {
        holder {
          address
          tzdomain
        }
      }
      fa {
        name
        logo
      }
      galleries {
        gallery {
          name
        }
      }
      offers_active(distinct_on: price_xtz) {
        buyer_address
        price
        currency_id
        bigmap_key
        marketplace_contract
      }
    }
  }
`;
