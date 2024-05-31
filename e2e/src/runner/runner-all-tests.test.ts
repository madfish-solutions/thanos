import { test } from '../utils/extension.fixtures'

import { ImportExistingWallet } from 'src/scenarios/import-existing-wallet.scenario';
import { beforeAllHook } from "src/hooks/before-all.hook";
import { afterEachHook } from "src/hooks/after-each.hook";
import { beforeEachHook } from "src/hooks/before-each.hook";

// Hooks

test.beforeAll(async () => {
 await beforeAllHook()
});

test.beforeEach(async () => {
  await beforeEachHook()
})

test.afterEach(async () => {
  await afterEachHook()
})


// Scenarios

test.describe('Import existing wallet feature ',  () => {

test('import existing wallet', async () => {
   await ImportExistingWallet()
  });

test('import existing wallet 2', async () => {
  await ImportExistingWallet()
});

test('import existing wallet 3', async () => {
  await ImportExistingWallet()
});

test('import existing wallet 4', async () => {
  await ImportExistingWallet()
});

})
