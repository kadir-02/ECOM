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
    const shippingRateEntry = await prisma.shippingRate.findFirst({
      where: {
        state: {
          equals: deliveryState,
          mode: "insensitive",
        },
        is_active: true,
      },
    });

    if (!shippingRateEntry) {
       res.status(404).json({
        message: `Shipping rate not configured for state: ${deliveryStateRaw}`,
      });
      return
    }

    const shippingRate = isInterState
      ? shippingRateEntry.inter_state_rate
      : shippingRateEntry.intra_state_rate;

    if (isTaxInclusive) {
     res.status(200).json({
        taxType: null,
        taxPercentage: 0,
        taxDetails: [],
        shippingRate,
        isTaxInclusive,
      });
       return 
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
