const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const packageRoot = path.resolve(__dirname, '..');
const hostRoot = path.resolve(packageRoot, '..', 'final-main');
const requireFromHost = Module.createRequire(path.join(hostRoot, 'package.json'));
const ts = requireFromHost('typescript');
const mongoose = requireFromHost('mongoose');

function loadModel(file) {
    const filename = path.join(packageRoot, 'src', 'server', 'models', file);
    const source = fs.readFileSync(filename, 'utf8');
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
        fileName: filename,
    }).outputText;
    const loaded = new Module(filename, module);
    loaded.filename = filename;
    loaded.paths = Module._nodeModulePaths(path.dirname(filename));
    loaded._compile(compiled, filename);
    return loaded.exports.default;
}

async function run() {
const models = {
    CreatorProfile: loadModel('CreatorProfile.ts'),
    Product: loadModel('Product.ts'),
    Order: loadModel('Order.ts'),
    Entitlement: loadModel('Entitlement.ts'),
    Review: loadModel('Review.ts'),
    EarningsLedgerEntry: loadModel('EarningsLedger.ts'),
    Payout: loadModel('Payout.ts'),
};

assert.equal(mongoose.connection.readyState, 0, 'self-check must not connect to MongoDB');
for (const [name, Model] of Object.entries(models)) {
    assert.equal(Model.base, mongoose, `${name} uses the host Mongoose instance`);
    assert.match(Model.collection.collectionName, /^connect_/, `${name} has a separate Connect collection`);
    assert.equal(Model.schema.options.autoCreate, false);
    assert.equal(Model.schema.options.autoIndex, false);
}

const profile = new models.CreatorProfile({ user_id: 'logical-user-id', display_name: 'Creator', application_status: 'draft' });
assert.equal(profile.validateSync(), undefined);
assert.equal(new models.CreatorProfile({ user_id: 'u', display_name: 'Creator', application_status: 'super_admin' }).validateSync().errors.application_status.name, 'ValidatorError');

const product = new models.Product({ creator_id: 'logical-user-id', slug: 'sample', title: 'Sample', type: 'practice', status: 'draft', price_paisa: 1250 });
assert.equal(product.validateSync(), undefined);
assert.ok(new models.Product({ creator_id: 'u', slug: 'x', title: 'X', type: 'practice', price_paisa: 1.5 }).validateSync().errors.price_paisa);
assert.ok(new models.Product({ creator_id: 'u', slug: 'x', title: 'X', type: 'practice', status: 'paid', price_paisa: 1 }).validateSync().errors.status);

const order = new models.Order({ buyer_id: 'logical-user-id', product_id: 'product-id', product_version: 1, amount_paisa: 1250 });
assert.equal(order.validateSync(), undefined);
assert.ok(new models.Order({ buyer_id: 'u', product_id: 'p', product_version: 1, amount_paisa: Number.MAX_SAFE_INTEGER + 1 }).validateSync().errors.amount_paisa);
assert.ok(models.Order.schema.indexes().some(([keys, options]) => keys.payment_reference === 1 && options.unique && options.partialFilterExpression));
assert.ok(models.Product.schema.indexes().some(([keys, options]) => keys.creator_id === 1 && keys.slug === 1 && options.unique));

const entitlement = new models.Entitlement({ buyer_id: 'buyer-id', product_id: 'product-id', order_id: 'order-id', product_version: 1 });
assert.equal(entitlement.validateSync(), undefined);
const review = new models.Review({ buyer_id: 'buyer-id', product_id: 'product-id', rating: 5 });
assert.equal(review.validateSync(), undefined);
assert.ok(new models.Review({ buyer_id: 'b', product_id: 'p', rating: 5.5 }).validateSync().errors.rating);
const payout = new models.Payout({ creator_id: 'creator-id', request_key: 'req-1', amount_paisa: 100 });
assert.equal(payout.validateSync(), undefined);
assert.ok(new models.Payout({ creator_id: 'c', request_key: 'r', amount_paisa: 0 }).validateSync().errors.amount_paisa);

const Ledger = models.EarningsLedgerEntry;
const ledger = new Ledger({ creator_id: 'creator-id', event_key: 'sale:order-id', entry_type: 'sale', amount_paisa: 100 });
assert.equal(ledger.validateSync(), undefined);
assert.equal(Ledger.schema.options.collection, 'connect_earnings_ledger');
assert.ok(!Object.hasOwn(Ledger.schema.obj, 'balance_paisa'), 'ledger stores entries, not a mutable balance');
ledger.isNew = false;
await assert.rejects(ledger.save(), /append-only/, 'saving an existing ledger document is rejected');
await assert.rejects(ledger.deleteOne(), /append-only/, 'document deleteOne is rejected');
await assert.rejects(Ledger.updateOne({}, { $set: { amount_paisa: 1 } }).exec(), /append-only/, 'updateOne is rejected');
await assert.rejects(Ledger.updateMany({}, { $set: { amount_paisa: 1 } }).exec(), /append-only/, 'updateMany is rejected');
await assert.rejects(Ledger.findOneAndUpdate({}, { $set: { amount_paisa: 1 } }).exec(), /append-only/, 'findOneAndUpdate is rejected');
await assert.rejects(Ledger.replaceOne({}, {}).exec(), /append-only/, 'replaceOne is rejected');
await assert.rejects(Ledger.findOneAndReplace({}, {}).exec(), /append-only/, 'findOneAndReplace is rejected');
await assert.rejects(Ledger.deleteOne({}).exec(), /append-only/, 'deleteOne is rejected');
await assert.rejects(Ledger.deleteMany({}).exec(), /append-only/, 'deleteMany is rejected');
await assert.rejects(Ledger.findOneAndDelete({}).exec(), /append-only/, 'findOneAndDelete is rejected');
await assert.rejects(Ledger.bulkWrite([{ updateOne: { filter: {}, update: { $set: { amount_paisa: 1 } } } }]), /append-only/, 'bulkWrite is rejected');

console.log('Marketplace model regression checks passed. No database connection was opened.');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
