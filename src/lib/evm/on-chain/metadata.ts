import axios from 'axios';
import { pickBy } from 'lodash';
import { erc20Abi, erc721Abi, parseAbi, PublicClient } from 'viem';

import { erc1155Abi } from 'lib/abi/erc1155';
import { NftCollectionAttribute } from 'lib/apis/temple/endpoints/evm/api.interfaces';
import { fromAssetSlug } from 'lib/assets';
import { buildHttpLinkFromUri } from 'lib/images-uri';
import { EvmCollectibleMetadata, EvmTokenMetadata } from 'lib/metadata/types';
import { getReadOnlyEvm } from 'temple/evm';
import { EvmNetworkEssentials } from 'temple/networks';

import { EvmAssetStandard } from '../types';

import { detectEvmTokenStandard } from './utils/common.utils';

export const fetchEvmTokensMetadataFromChain = async (network: EvmNetworkEssentials, tokenSlugs: string[]) =>
  Promise.all(tokenSlugs.map(slug => fetchEvmTokenMetadataFromChain(network, slug))).then(fetchedMetadata =>
    handleFetchedMetadata<EvmTokenMetadata | undefined>(fetchedMetadata, tokenSlugs)
  );

export const fetchEvmCollectiblesMetadataFromChain = async (
  network: EvmNetworkEssentials,
  collectibleSlugs: string[]
) =>
  Promise.all(collectibleSlugs.map(slug => fetchEvmCollectibleMetadataFromChain(network, slug))).then(fetchedMetadata =>
    handleFetchedMetadata<EvmCollectibleMetadata | undefined>(fetchedMetadata, collectibleSlugs)
  );

export const fetchEvmAssetMetadataFromChain = async (network: EvmNetworkEssentials, assetSlug: string) => {
  const [contractAddress, tokenIdStr] = fromAssetSlug<HexString>(assetSlug);

  const tokenId = BigInt(tokenIdStr ?? 0);

  const publicClient = getReadOnlyEvm(network.rpcBaseURL);

  const standard = await detectEvmTokenStandard(network.rpcBaseURL, assetSlug);

  try {
    switch (standard) {
      case EvmAssetStandard.ERC1155:
        return await getERC1155Metadata(publicClient, contractAddress, tokenId);
      case EvmAssetStandard.ERC721:
        return await getERC721Metadata(publicClient, contractAddress, tokenId);
      default:
        return await getERC20Metadata(publicClient, contractAddress);
    }
  } catch {
    console.error(`ChainId: ${network.chainId}. Failed to get metadata for: ${assetSlug}.`);

    return undefined;
  }
};

export const fetchEvmTokenMetadataFromChain = async (network: EvmNetworkEssentials, tokenSlug: string) => {
  const [contractAddress] = fromAssetSlug<HexString>(tokenSlug);

  const publicClient = getReadOnlyEvm(network.rpcBaseURL);

  try {
    return await getERC20Metadata(publicClient, contractAddress);
  } catch {
    console.error(`ChainId: ${network.chainId}. Failed to get metadata for: ${tokenSlug}.`);

    return undefined;
  }
};

export const fetchEvmCollectibleMetadataFromChain = async (network: EvmNetworkEssentials, collectibleSlug: string) => {
  const [contractAddress, tokenIdStr] = fromAssetSlug<HexString>(collectibleSlug);

  const tokenId = BigInt(tokenIdStr ?? 0);

  const publicClient = getReadOnlyEvm(network.rpcBaseURL);

  const standard = await detectEvmTokenStandard(network.rpcBaseURL, collectibleSlug);

  try {
    switch (standard) {
      case EvmAssetStandard.ERC1155:
        return await getERC1155Metadata(publicClient, contractAddress, tokenId);
      case EvmAssetStandard.ERC721:
        return await getERC721Metadata(publicClient, contractAddress, tokenId);
      default: {
        console.error(
          `ChainId: ${network.chainId}. Slug: ${collectibleSlug}. Standard: ${standard}. Failed to load metadata. Standard is not ERC721 or ERC1155`
        );

        return undefined;
      }
    }
  } catch (error) {
    console.error(`ChainId: ${network.chainId}. Failed to get metadata for: ${collectibleSlug}.`, error);

    return undefined;
  }
};

const getERC20Metadata = async (publicClient: PublicClient, contractAddress: HexString) => {
  const results = await getERC20Properties(publicClient, contractAddress);

  const metadata: EvmTokenMetadata = {
    address: contractAddress,
    standard: EvmAssetStandard.ERC20,
    name: getValue<string>(results[0]),
    symbol: getValue<string>(results[1]),
    decimals: getValue<number>(results[2])
  };

  return metadata;
};

const getERC721Metadata = async (publicClient: PublicClient, contractAddress: HexString, tokenId: bigint) => {
  const results = await getERC721Properties(publicClient, contractAddress, tokenId);

  const metadataUri = getValue<string>(results[2]);

  if (!metadataUri) throw new Error();

  const collectibleMetadata = await getCollectiblePropertiesFromUri(metadataUri);

  const metadata: EvmCollectibleMetadata = {
    address: contractAddress,
    tokenId: tokenId.toString(),
    standard: EvmAssetStandard.ERC721,
    name: getValue<string>(results[0]),
    symbol: getValue<string>(results[1]),
    metadataUri,
    ...collectibleMetadata
  };

  return metadata;
};

const getERC1155Metadata = async (publicClient: PublicClient, contractAddress: HexString, tokenId: bigint) => {
  const results = await getERC1155Properties(publicClient, contractAddress, tokenId);

  const metadataUri = getValue<string>(results[2]);

  if (!metadataUri) throw new Error();

  const actualMetadataUri = metadataUri.replace('{id}', tokenId.toString().padStart(64, '0'));
  const collectibleMetadata = await getCollectiblePropertiesFromUri(actualMetadataUri);

  const metadata: EvmCollectibleMetadata = {
    address: contractAddress,
    tokenId: tokenId.toString(),
    standard: EvmAssetStandard.ERC1155,
    // ERC1155 specification does not include `symbol` or `name` view methods, see
    // https://eips.ethereum.org/EIPS/eip-1155#metadata-choices but let's assign their values if a contract has them
    name: collectibleMetadata.collectibleName ?? getValue<string>(results[0]),
    symbol: getValue<string>(results[1]) ?? collectibleMetadata.collectibleName,
    metadataUri: actualMetadataUri,
    ...collectibleMetadata
  };

  return metadata;
};

const getCommonPromises = (
  publicClient: PublicClient,
  contractAddress: HexString
): [Promise<string>, Promise<string>] => [
  publicClient.readContract({
    address: contractAddress,
    abi: parseAbi(['function name() public view returns (string)']),
    functionName: 'name'
  }),
  publicClient.readContract({
    address: contractAddress,
    abi: parseAbi(['function symbol() public view returns (string)']),
    functionName: 'symbol'
  })
];

const getERC20Properties = async (publicClient: PublicClient, contractAddress: HexString) =>
  Promise.allSettled([
    ...getCommonPromises(publicClient, contractAddress),
    publicClient.readContract({
      address: contractAddress,
      abi: erc20Abi,
      functionName: 'decimals'
    })
  ]);

const getERC721Properties = async (publicClient: PublicClient, contractAddress: HexString, tokenId: bigint) =>
  Promise.allSettled([
    ...getCommonPromises(publicClient, contractAddress),
    publicClient.readContract({
      address: contractAddress,
      abi: erc721Abi,
      functionName: 'tokenURI',
      args: [tokenId]
    })
  ]);

const getERC1155Properties = async (publicClient: PublicClient, contractAddress: HexString, tokenId: bigint) =>
  Promise.allSettled([
    ...getCommonPromises(publicClient, contractAddress),
    publicClient.readContract({
      address: contractAddress,
      abi: erc1155Abi,
      functionName: 'uri',
      args: [tokenId]
    })
  ]);

const handleFetchedMetadata = <T>(fetchedMetadata: T[], assetSlugs: string[]) =>
  fetchedMetadata.reduce<Record<string, T | undefined>>((acc, metadata, index) => {
    const slug = assetSlugs[index];

    return { ...acc, [slug]: metadata };
  }, {});

const getValue = <T>(result: PromiseSettledResult<T>) => (result.status === 'fulfilled' ? result.value : undefined);

interface CollectibleMetadata {
  image?: string;
  name?: string;
  decimals?: number;
  description?: string;
  attributes?: NftCollectionAttribute[];
  external_url?: string;
  animation_url?: string;
}

const getCollectiblePropertiesFromUri = async (
  metadataUri?: string
): Promise<
  Pick<
    EvmCollectibleMetadata,
    'image' | 'collectibleName' | 'description' | 'attributes' | 'externalUrl' | 'animationUrl'
  >
> => {
  const uri = buildHttpLinkFromUri(metadataUri);

  if (!uri) throw new Error();

  const { data } = await axios.get<CollectibleMetadata>(uri);

  if (typeof data !== 'object' || !data.image || !data.name || !data.description) throw new Error();

  const {
    name,
    description,
    decimals,
    image,
    attributes,
    external_url: externalUrl,
    animation_url: animationUrl
  } = data;

  return {
    image,
    collectibleName: name,
    description,
    ...pickBy({ attributes, externalUrl, animationUrl, decimals }, value => value !== undefined && value !== '')
  };
};
