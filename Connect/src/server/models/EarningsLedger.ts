import mongoose, { Document, Schema } from 'mongoose';

export type LedgerEntryType = 'sale' | 'commission' | 'fee' | 'refund' | 'adjustment' | 'payout';

export interface IEarningsLedgerEntry extends Document {
    creator_id: string;
    order_id?: string;
    payout_id?: string;
    event_key: string;
    entry_type: LedgerEntryType;
    amount_paisa: number;
    currency: 'PKR';
    created_at: Date;
}

const mutationRejected = () => {
    throw new Error('Earnings ledger entries are append-only');
};

const EarningsLedgerSchema = new Schema<IEarningsLedgerEntry>({
    creator_id: { type: String, required: true, trim: true },
    order_id: { type: String, trim: true },
    payout_id: { type: String, trim: true },
    event_key: { type: String, required: true, trim: true },
    entry_type: { type: String, enum: ['sale', 'commission', 'fee', 'refund', 'adjustment', 'payout'], required: true },
    amount_paisa: { type: Number, required: true, validate: { validator: Number.isSafeInteger, message: 'amount_paisa must be a safe integer' } },
    currency: { type: String, enum: ['PKR'], default: 'PKR', required: true },
    created_at: { type: Date, default: Date.now, immutable: true },
}, { versionKey: false, timestamps: { createdAt: 'created_at', updatedAt: false }, collection: 'connect_earnings_ledger', autoCreate: false, autoIndex: false });

EarningsLedgerSchema.index({ creator_id: 1, created_at: -1 });
EarningsLedgerSchema.index({ event_key: 1 }, { unique: true });
EarningsLedgerSchema.pre('save', function () {
    if (!this.isNew) mutationRejected();
});
EarningsLedgerSchema.pre('updateOne', mutationRejected);
EarningsLedgerSchema.pre('updateMany', mutationRejected);
EarningsLedgerSchema.pre('findOneAndUpdate', mutationRejected);
EarningsLedgerSchema.pre('replaceOne', mutationRejected);
EarningsLedgerSchema.pre('findOneAndReplace', mutationRejected);
EarningsLedgerSchema.pre('deleteOne', mutationRejected);
EarningsLedgerSchema.pre('deleteOne', { document: true, query: false }, mutationRejected);
EarningsLedgerSchema.pre('deleteMany', mutationRejected);
EarningsLedgerSchema.pre('findOneAndDelete', mutationRejected);
EarningsLedgerSchema.pre('bulkWrite', mutationRejected);

export default mongoose.models.ConnectEarningsLedgerEntry || mongoose.model<IEarningsLedgerEntry>('ConnectEarningsLedgerEntry', EarningsLedgerSchema);
