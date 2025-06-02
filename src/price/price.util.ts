export async function convertToUSD(symbol: string, amount: number, priceFeed: any) {
  const price = await priceFeed.getTokenPrice(symbol);
  return amount * price;
}