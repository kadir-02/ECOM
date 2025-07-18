import { Request, Response } from "express";
import prisma from "../db/prisma";

export const getOrderSummaryByPincode = async (req: Request, res: Response) => {
  const { pincode } = req.body;

  if (!pincode) {
     res.status(400).json({ message: "Pincode is required" });
     return
  }

  try {
    // Get delivery state from pincode
    const pincodeEntry = await prisma.pincode.findUnique({
      where: { zipcode: Number(pincode) },
    });

    if (!pincodeEntry) {
       res.status(404).json({ message: "Invalid pincode" });
       return
    }

    const deliveryStateRaw = pincodeEntry.state;
    const deliveryState = deliveryStateRaw.trim().toLowerCase();

    // Get company settings
    const companySettings = await prisma.companySettings.findFirst();
    if (!companySettings) {
       res.status(500).json({ message: "Company settings not found" });
       return
    }

    const companyState = companySettings.company_state?.trim().toLowerCase();
    const isTaxInclusive = companySettings.is_tax_inclusive;
    const isInterState = deliveryState !== companyState;

    // Fetch shipping rate for delivery state
    // Fetch all shipping rate entries
const allShippingRates = await prisma.shippingRate.findMany({
  where: {
    is_active: true,
  },
});

// Try to find matching state (case-insensitive)
const matchingEntry = allShippingRates.find(
  (entry) => entry.state.trim().toLowerCase() === deliveryState
);

let shippingRate = 0;

if (matchingEntry) {
  shippingRate =
    deliveryState === matchingEntry.state.trim().toLowerCase()
      ? matchingEntry.intra_state_rate
      : matchingEntry.inter_state_rate;
} else {
  // No match found: fallback to default interstate rate from any entry
  if (allShippingRates.length > 0) {
    shippingRate = allShippingRates[0].inter_state_rate;
  } else {
    return res
      .status(404)
      .json({ message: "No shipping rate configured in the system" });
  }
}


    // Fetch tax rates if tax is exclusive
    const taxRates = await prisma.tax.findMany({
      where: { is_active: true },
    });

    let taxType = "";
    let taxPercentage = 0;
    let taxDetails: { name: string; percentage: number }[] = [];

    if (isInterState) {
      const igst = taxRates.find((t) => t.name.toUpperCase() === "IGST");
      if (!igst) {
         res.status(500).json({ message: "IGST tax rate not configured" });
         return
      }
      taxType = "IGST";
      taxPercentage = igst.percentage;
      taxDetails = [{ name: igst.name, percentage: igst.percentage }];
    } else {
      const cgst = taxRates.find((t) => t.name.toUpperCase() === "CGST");
      const sgst = taxRates.find((t) => t.name.toUpperCase() === "SGST");
      if (!cgst || !sgst) {
         res
          .status(500)
          .json({ message: "CGST/SGST tax rates not configured" });
          return
      }
      taxType = "CGST+SGST";
      taxPercentage = cgst.percentage + sgst.percentage;
      taxDetails = [
        { name: cgst.name, percentage: cgst.percentage },
        { name: sgst.name, percentage: sgst.percentage },
      ];
    }

   res.status(200).json({
      taxType,
      taxPercentage,
      taxDetails,
      shippingRate,
      isTaxInclusive,
    });
  } catch (error) {
    console.error("Order summary error:", error);
   res.status(500).json({ message: "Internal server error", error });
  }
};
