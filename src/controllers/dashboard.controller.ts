// src/controllers/dashboard.controller.ts
import { Request, Response } from 'express';
import prisma from '../db/prisma';

type DailySales = {
  date: string;         // ISO date string
  total: string | null; // Prisma returns numeric as string (especially with PostgreSQL)
};

export const getDashboard = async (req: Request, res: Response) => {
  const {
    user_id,
    start_date,
    end_date,
    token /* ignore or validate as needed */,
  } = req.body;

  const start = new Date(start_date);
  const end = new Date(end_date);
  if (isNaN(start as any) || isNaN(end as any)) {
     res.status(400).json({ message: 'Invalid date format' });
     return
  }

  try {
    // Products sold count in timeframe (total quantity in orders)
    const productsSoldRes = await prisma.orderItem.aggregate({
      _sum: { quantity: true },
      where: {
        order: {
          createdAt: { gte: start, lte: end },
          // userId: Number(user_id),
        },
      },
    });
    const products_sold = productsSoldRes._sum?.quantity ?? 0;

    // New customers count in timeframe
    const new_customer_count = await prisma.user.count({
      where: {
        createdAt: { gte: start, lte: end },
        role: 'USER',
      },
    });

    const inactiveCustomers = await prisma.user.count({
      where: {
        role: 'USER',
        orders: {
          none: {}, // No orders
        },
      },
    });

    // Average order value
    const orderAgg = await prisma.order.aggregate({
      _avg: { totalAmount: true },
      where: {
        createdAt: { gte: start, lte: end },
        // userId: Number(user_id),
      },
    });
    const avgVal = orderAgg._avg?.totalAmount ?? 0;

    // User summary
    const [staffUsers, custUsers] = await Promise.all([
      prisma.user.aggregate({
        _count: { id: true },
        where: { role: 'ADMIN' },
      }),
      prisma.user.aggregate({
        _count: { id: true },
        where: { role: 'USER' },
      }),
    ]);

    // Product summary
    const [prodAgg, stockAgg] = await Promise.all([
      prisma.product.aggregate({
        _count: { id: true },
        where: { isDeleted: false },
      }),
      prisma.product.aggregate({
        _count: { id: true },
        _sum: { stock: true },
        where: { isDeleted: false },
      }),
    ]);

    // Order summary
    const orderSummary = await prisma.order.groupBy({
      by: ['status'],
      _count: true,
      where: {
        createdAt: { gte: start, lte: end },
        userId: Number(user_id),
      },
    });

    // Revenue & payment breakdown
    const payments = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        createdAt: { gte: start, lte: end },
        // userId: Number(user_id),
      },
    });

    // Top customers
    const topByOrders = await prisma.order.groupBy({
      by: ['userId'],
      _count: { id: true },
      where: {
        createdAt: { gte: start, lte: end },
      },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });
    const topBySpending = await prisma.order.groupBy({
      by: ['userId'],
      _sum: { totalAmount: true },
      where: {
        createdAt: { gte: start, lte: end },
      },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 5,
    });

    // Order sale graph (daily revenue)
    const daily = await prisma.$queryRaw<DailySales[]>`
      SELECT 
        DATE("createdAt") as date, 
        SUM("totalAmount") as total 
      FROM "Order"
      WHERE "createdAt" BETWEEN ${start} AND ${end} 
        AND "userId" = ${Number(user_id)}
      GROUP BY DATE("createdAt")
      ORDER BY DATE("createdAt") ASC;
    `;

    const outOfStockProducts = await prisma.product.count({
      where: {
        isDeleted: false,
        stock: 0,
      },
    });
    const companySettings = await prisma.companySettings.findFirst();
    const threshold = companySettings?.product_low_stock_threshold ?? 5;

    const lowStockProducts = await prisma.product.count({
      where: {
        isDeleted: false,
        stock: {
          lt: threshold,
          gt: 0,
        },
      },
    });

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        userId: Number(user_id),
      },
      include: {
        payment: true,
      },
    });
    let online_payment_amount = 0;
    let cash_on_delivery_payment_amount = 0;
    let payment_not_done_amount = 0;

    for (const order of orders) {
      if (!order.payment) {
        payment_not_done_amount += order.totalAmount;
      } else if (order.payment.status === 'SUCCESS') {
        const method = order.payment.method.toLowerCase();
        if (method.includes('online')) {
          online_payment_amount += order.totalAmount;
        } else if (method.includes('cash')) {
          cash_on_delivery_payment_amount += order.totalAmount;
        }
      }
    }

    res.json({
      message: '',
      products_sold,
      new_customer_count,
      average_order_value: parseFloat(avgVal.toFixed(2)),
      user_summary: {
        total_staff_users: staffUsers._count.id,
        active_staff_users: staffUsers._count.id, // adapt if status exists
        inactive_staff_users: 0,
        total_customers: custUsers._count.id,
        active_customers: custUsers._count.id,
        inactive_customers: inactiveCustomers,
      },
      product_summary: {
        total_products: prodAgg._count.id,
        active_products: prodAgg._count.id,
        inactive_products: 0,
        products_in_stock: stockAgg._sum?.stock ?? 0,
        products_out_of_stock: outOfStockProducts,
        products_about_to_go_out_of_stock: lowStockProducts,
      },
      order_summary: orderSummary.reduce((acc, grp) => {
        acc.total_orders = (acc.total_orders || 0) + grp._count;
        acc[grp.status.toLowerCase() + '_orders'] = grp._count;
        return acc;
      }, {} as any),
      revenue_summary: {
        total_revenue: payments._sum.totalAmount ?? 0,
        total_tax_collected: 0,
        total_delivery_charge_collected: 0,
        total_discount_given: 0,
      },
      order_payment_summary: {
        total_payment_estimate: payments._sum.totalAmount ?? 0,
        online_payment_amount,
        cash_on_delivery_payment_amount,
        payment_not_done_amount,
      },
      top_customers: {
        by_orders: topByOrders,
        by_spending: topBySpending,
      },
      order_sale_graph: daily.map(d => ({
        date: d.date,
        total: d.total ? parseFloat(d.total) : 0,
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUserDashboardSections = async (req: Request, res: Response) => {
  try {
    const { user_id, token } = req.body;

    if (typeof user_id !== "number" ) {
       res
        .status(400)
        .json({ message: "user_id (number) is required." });
        return
    }

    const sections = [
      "order_data",
      "order_sale_graph",
      "recent_payment_transactions_data",
      "least_selling_products_data",
      "user_data",
      "product_data",
      "recent_orders_data",
      "unsold_products_data",
      "top_selling_products_data",
      "top_customers_data",
      "low_stock_products_data",
      "order_payment_data",
      "new_customer_count",
      "average_order_value",
      "products_sold",
      "revenue_data"
    ];

    res.status(200).json({ succes:true, sections });
  } catch (error: any) {
    console.error("Error returning dashboard sections:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};