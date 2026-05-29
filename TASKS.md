# Tasks

## ResourceLoader / Postgres node

### Typed `LoaderContext` — [spec](SPECS/resource-loader-typed-context.md)

- [ ] **node-sdk:** make `RuntimeNode.LoaderContext` / `LoaderFn` generic over `B extends Blueprint`; add typed `fieldValues` (`InferFields<B>`), `credentials` (`InferCredentials<B>`), and a `credentialsAPI` (`getInstance` + `getDecryptedValue`) mirroring `ExecutionContext.credentialsAPI`.
- [ ] **node-sdk:** add curried `defineLoaders<B>()` helper (plain string keys); export from `index`.
- [ ] **nodes:** migrate `ResourceLoaderTest/node.ts` to `defineLoaders<typeof Blueprint>()` and drop the `as { value?: string }` casts (`fieldValues.schema?.value`).
- [ ] **verify:** `CatalogueService.getLoader` still resolves loaders unchanged (static-map contract intact).

### Follow-ups (separate specs, not yet written)

- [ ] Credential injection: frontend sends `credentialInstanceIds` in `LoadOptions.Request`; `workbench.service.ts` fetches encrypted instances via Vault DB and builds the `credentialsAPI` injected into the loader. → `resource-loader-credential-injection.md`
- [ ] Connection layer: abstract `ConnectionManager` base (cache + value-hash key + TTL reap) + `SqlConnectionManager` subclass with `withConnection` / `DISCARD ALL` reset seam; Postgres adapter. → Postgres node spec.
- [ ] Query-key composition: include `dependsOn` field values in the resource-loader query key so editing an upstream field auto-invalidates dependent loaders.
