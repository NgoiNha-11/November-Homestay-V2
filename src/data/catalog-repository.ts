import data from './catalog.json';
import { validateCatalog, type Catalog, type CatalogRepository } from '../domain/catalog';
/** Replace this adapter with an API adapter when the backend is ready. No UI changes required. */
export class StaticCatalogRepository implements CatalogRepository {
  async load(): Promise<Catalog> {
    const catalog = structuredClone(data) as Catalog;
    validateCatalog(catalog);
    return catalog;
  }
}
