import type { SourceProvider } from './types.js';
import { PirateBayProvider } from './piratebay-provider.js';
import { logger } from '../logger.js';

// Registry of all available providers
const providers = new Map<string, SourceProvider>();

// Register built-in providers
const pirateBayProvider = new PirateBayProvider();
providers.set(pirateBayProvider.name, pirateBayProvider);

/**
 * Get a provider by name
 */
export function getProvider(name: string): SourceProvider | undefined {
  return providers.get(name);
}

/**
 * Get all available providers
 */
export function getAllProviders(): SourceProvider[] {
  return Array.from(providers.values());
}

/**
 * Get provider names
 */
export function getProviderNames(): string[] {
  return Array.from(providers.keys());
}

/**
 * Register a new provider
 */
export function registerProvider(provider: SourceProvider): void {
  if (providers.has(provider.name)) {
    logger.warn({ provider: provider.name }, 'Overwriting existing provider');
  }
  providers.set(provider.name, provider);
  logger.info({ provider: provider.name }, 'Provider registered');
}

// Re-export types
export type { SourceProvider } from './types.js';
export { parseMagnetUri } from './validation.js';

