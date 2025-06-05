import { SearchQueryDto } from '../dto/search-query.dto';

export async function buildFullTextQuery(query: SearchQueryDto) {
  // Simulate different search scopes. Replace with real repository queries.
  const results = [];

  if (!query.type || query.type === 'message') {
    results.push(...mockSearch('message', query.q));
  }

  if (!query.type || query.type === 'user') {
    results.push(...mockSearch('user', query.q));
  }

  if (!query.type || query.type === 'group') {
    results.push(...mockSearch('group', query.q));
  }

  if (!query.type || query.type === 'transaction') {
    results.push(...mockSearch('transaction', query.q));
  }

  return results;
}

export function buildFilters(results: any[], query: SearchQueryDto) {
  let filtered = results;

  if (query.transactionType) {
    filtered = filtered.filter(r => r.type === 'transaction' && r.transactionType === query.transactionType);
  }

  // Apply more filters as needed
  return filtered;
}

function mockSearch(type: string, term: string) {
  return Array(3).fill(null).map((_, i) => ({
    id: i + 1,
    type,
    content: `${type} content for ${term}`,
    score: Math.random()
  }));
}
