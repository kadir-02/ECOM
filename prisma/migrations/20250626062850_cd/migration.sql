-- AlterTable
ALTER TABLE "CompanySettings" ALTER COLUMN "country" DROP NOT NULL,
ALTER COLUMN "currency" DROP NOT NULL,
ALTER COLUMN "currency_symbol" DROP NOT NULL,
ALTER COLUMN "product_low_stock_threshold" DROP NOT NULL,
ALTER COLUMN "minimum_order_quantity" DROP NOT NULL;
