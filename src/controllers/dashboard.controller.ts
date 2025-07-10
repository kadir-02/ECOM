// src/controllers/dashboard.controller.ts
import { Request, Response } from 'express';
import prisma from '../db/prisma';

type DailySales = {
  date: string;
  total: string | null;
};

export const getDashboard = async (req: Request, res: Response) => {
  const { user_id, start_date, end_date } = req.body;
  const start = new Date(start_date), end = new Date(end_date);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ message: 'Invalid date format' });
    return
  }

  const dbSettings = await prisma.dashboardSetting.findMany({
    where: { userId: user_id },
  });
  const settings = Object.fromEntries(dbSettings.map((s: any) => [s.key, s.value ? 1 : 0]));

  // Default response skeleton
  const resp: any = {
    message: '',
    products_sold: 0,
    new_customer_count: 0,
    average_order_value: 0,
    user_summary: {
      total_staff_users: 0,
      active_staff_users: 0,
      inactive_staff_users: 0,
      total_customers: 0,
      active_customers: 0,
      inactive_customers: 0,
    },
    product_summary: {
      total_products: 0,
      active_products: 0,
      inactive_products: 0,
      products_in_stock: 0,
      products_out_of_stock: 0,
      products_about_to_go_out_of_stock: 0,
    },
    order_summary: {
      total_orders: 0,
      pending_orders: 0,
      confirmed_orders: 0,
      shipped_orders: 0,
      delivered_orders: 0,
      cancelled_orders: 0,
    },
    revenue_summary: {
      total_revenue: 0,
      total_tax_collected: 0,
      total_delivery_charge_collected: 0,
      total_discount_given: 0,
    },
    order_payment_summary: {
      total_payment_estimate: 0,
      online_payment_amount: 0,
      cash_on_delivery_payment_amount: 0,
      payment_not_done_amount: 0,
    },
    top_customers: {
      by_orders: [],
      by_spending: [],
    },
    // recent_payment_transactions: [],
    recent_orders: [],
    top_selling_products: [],
    least_selling_products: [],
    unsold_products: [],
    low_stock_products: [],
    order_sale_graph: [],
  };

  try {
    if (settings['products_sold'] !== undefined) {
      const agg = await prisma.orderItem.aggregate({
        _sum: { quantity: true },
        where: { order: { createdAt: { gte: start, lte: end } } },
      });
      resp.products_sold = agg._sum?.quantity ?? 0;
    }

    if (settings['new_customer_count'] !== undefined) {
      resp.new_customer_count = await prisma.user.count({
        where: { createdAt: { gte: start, lte: end }, role: 'USER' },
      });
    }

    if (settings['average_order_value'] !== undefined) {
      const [itemAgg, orderCount] = await Promise.all([
        prisma.orderItem.aggregate({
          _sum: { quantity: true },
          where: {
            order: {
              createdAt: { gte: start, lte: end },
            },
          },
        }),
        prisma.order.count({
          where: {
            createdAt: { gte: start, lte: end },
          },
        }),
      ]);

      const totalItems = itemAgg._sum?.quantity ?? 0;
      const avgItemsPerOrder = orderCount > 0 ? totalItems / orderCount : 0;
      resp.average_order_value = parseFloat(avgItemsPerOrder.toFixed(2)); // or rename field
    }

    if (settings['user_data'] !== undefined) {
      const [
        activeStaff,
        inactiveStaff,
        activeCustomers,
        inactiveCustomers,
      ] = await Promise.all([
        prisma.user.count({ where: { role: 'ADMIN', isDeleted: false } }),
        prisma.user.count({ where: { role: 'ADMIN', isDeleted: true } }),
        prisma.user.count({ where: { role: 'USER', isDeleted: false } }),
        prisma.user.count({ where: { role: 'USER', isDeleted: true } }),
      ]);

      resp.user_summary = {
        total_staff_users: activeStaff + inactiveStaff,
        active_staff_users: activeStaff,
        inactive_staff_users: inactiveStaff,
        total_customers: activeCustomers + inactiveCustomers,
        active_customers: activeCustomers,
        inactive_customers: inactiveCustomers,
      };

    }

    if (settings['product_data'] !== undefined) {
      const [total, sumStock] = await Promise.all([
        prisma.product.count({ where: { isDeleted: false } }),
        prisma.product.aggregate({
          _sum: { stock: true },
          where: { isDeleted: false },
        }),
      ]);
      const company = await prisma.companySettings.findFirst();
      const threshold = company?.product_low_stock_threshold ?? 5;
      const outOfStock = await prisma.product.count({
        where: { isDeleted: false, stock: 0 },
      });
      const lowStock = await prisma.product.count({
        where: { isDeleted: false, stock: { gt: 0, lt: threshold } },
      });
      const [activeCount, inactiveCount] = await Promise.all([
        prisma.product.count({ where: { isDeleted: false, isActive: true } }),
        prisma.product.count({ where: { isDeleted: false, isActive: false } }),
      ]);
      resp.product_summary = {
        total_products: total,
        active_products: activeCount,
        inactive_products: inactiveCount,
        products_in_stock: sumStock._sum?.stock ?? 0,
        products_out_of_stock: outOfStock,
        products_about_to_go_out_of_stock: lowStock,
      };
    }

    if (settings['order_data'] !== undefined) {
      resp.order_summary.total_orders = 0; // initialize total_orders

      const groups = await prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
        where: {
          createdAt: {
            gte: start,
            lt: new Date(end.getTime() + 24 * 60 * 60 * 1000), // include entire end date
          },
          // no userId filter here to get all users' orders
        },
      });

      // Initialize each order status count to 0 (optional, but safer)
      const statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
      statuses.forEach(s => {
        resp.order_summary[`${s}_orders`] = 0;
      });

      groups.forEach(g => {
        const key = `${g.status.toLowerCase()}_orders`;
        resp.order_summary[key] = g._count.id;
        resp.order_summary.total_orders += g._count.id;
      });
    }

    if (settings['revenue_data'] !== undefined || settings['order_payment_data'] !== undefined) {
      // Fetch all orders within date range (not user-specific)
      const orders = await prisma.order.findMany({
        where: {
          createdAt: { gte: start, lte: end },
        },
        include: { payment: true },
      });

      let total = 0;
      let online = 0;
      let cod = 0;
      let notdone = 0;

      for (const o of orders) {
        const amount = o.totalAmount ?? 0;
        total += amount;

        const payment = o.payment;
        if (!payment || payment.status.toLowerCase() !== 'success') {
          notdone += amount;
          continue;
        }

        const method = payment.method.toLowerCase();

        if (method.includes('razor') || method.includes('online')) {
          online += amount;
        } else if (method.includes('COD') || method.includes('cash')) {
          cod += amount;
        } else {
          notdone += amount;
        }
      }

      resp.revenue_summary.total_revenue = total;
      resp.order_payment_summary = {
        total_payment_estimate: total,
        online_payment_amount: online,
        cash_on_delivery_payment_amount: cod,
        payment_not_done_amount: notdone,
      };
    }

    if (settings['top_customers_data'] !== undefined) {
      // 🔹 Top by orders
      const topByOrders = await prisma.order.groupBy({
        by: ['userId'],
        _count: { id: true },
        where: { createdAt: { gte: start, lte: end } },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      });

      // 🔹 Top by spending
      const topBySpending = await prisma.order.groupBy({
        by: ['userId'],
        _sum: { totalAmount: true },
        where: { createdAt: { gte: start, lte: end } },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 5,
      });

      // Combine all unique userIds
      const userIds = Array.from(
        new Set([
          ...topByOrders.map(o => o.userId),
          ...topBySpending.map(o => o.userId),
        ])
      );

      // Fetch users
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        include: { profile: true },
      });

      const userMap = new Map<number, {
        id: number;
        name: string;
        email: string;
        profile_picture: string;
      }>();

      for (const user of users) {
        const profileName = `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim();

        let name = profileName;
        if (!name) {
          const lastOrder = await prisma.order.findFirst({
            where: {
              userId: user.id,
              addressId: { not: undefined },
            },
            orderBy: { createdAt: 'desc' },
            include: {
              address: true,
            },
          });

          name = lastOrder?.address?.fullName || user.email || 'Guest';
        }

        userMap.set(user.id, {
          id: user.id,
          name,
          email: user.email,
          profile_picture: user.profile?.imageUrl || '',
        });
      }

      // Enrich results
      resp.top_customers.by_orders = topByOrders.map(o => ({
        ...userMap.get(o.userId),
        total_orders: o._count.id,
      }));

      resp.top_customers.by_spending = topBySpending.map(o => ({
        ...userMap.get(o.userId),
        total_spent: o._sum.totalAmount ?? 0,
      }));
    }

    if (settings['order_sale_graph'] !== undefined) {
      const daily = await prisma.$queryRaw<DailySales[]>`
        SELECT DATE("createdAt") AS date, SUM("totalAmount") AS total
        FROM "Order"
        WHERE "createdAt" BETWEEN ${start} AND ${end} AND "userId" = ${user_id}
        GROUP BY DATE("createdAt")
        ORDER BY DATE("createdAt")
      `;
      resp.order_sale_graph = daily.map(d => ({
        date: d.date,
        total: parseFloat(d.total ?? '0'),
      }));
    }

    if (settings['unsold_products_data'] !== undefined) {
      const soldProds = await prisma.orderItem.findMany({
        select: { productId: true },
        distinct: ['productId'],
      });
      const soldIds = soldProds.map(p => p.productId).filter((x): x is number => x != null);

      const unsold = await prisma.product.findMany({
        where: {
          isDeleted: false,
          id: { notIn: soldIds },
        },
        include: {
          category: true,
          images: {
            orderBy: { sequence: 'asc' }, // Get primary image first
            take: 1
          }
        },
      });

      resp.unsold_products = unsold.map(product => ({
        id: product.id,
        name: product.name,
        image: product.images?.[0]?.image ?? null,
        category: product.category?.name ?? 'Uncategorized',
        stock: product.stock,
        selling_price: product.sellingPrice,
        cost_price: product.basePrice,
      }));
    }


    if (
      settings['least_selling_products_data'] !== undefined ||
      settings['top_selling_products_data'] !== undefined
    ) {
      const groupedItems = await prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
      });

      // Sort by quantity sold descending
      groupedItems.sort((a, b) => (b._sum.quantity ?? 0) - (a._sum.quantity ?? 0));

      const topIds = groupedItems
        .slice(0, 5)
        .map(item => item.productId)
        .filter((id): id is number => id !== null);

      const leastIds = groupedItems
        .slice(-5)
        .map(item => item.productId)
        .filter((id): id is number => id !== null);

      const allIds = [...new Set([...topIds, ...leastIds])];

      const products = await prisma.product.findMany({
        where: {
          id: { in: allIds },
        },
        include: {
          category: true,
          orderItems: true,
          images: {
            orderBy: { sequence: 'asc' },
            take: 1,
          },
        },
      });

      const formatProduct = (product: any) => {
        const totalQty = product.orderItems.reduce(
          (sum: number, item: any) => sum + item.quantity,
          0
        );
        const totalRevenue = product.orderItems.reduce(
          (sum: number, item: any) => sum + item.quantity * item.price,
          0
        );

        return {
          id: product.id,
          name: product.name,
          image: product.images?.[0]?.image ?? null,
          category: product.category?.name ?? 'Uncategorized',
          sellingPrice: product.sellingPrice,
          stock: product.stock,
          total_quantity_sold: totalQty,
          revenue_generated: totalRevenue,
        };
      };

      if (settings['top_selling_products_data'] !== undefined) {
        resp.top_selling_products = products
          .filter(p => topIds.includes(p.id))
          .map(formatProduct);
      }

      if (settings['least_selling_products_data'] !== undefined) {
        resp.least_selling_products = products
          .filter(p => leastIds.includes(p.id))
          .map(formatProduct);
      }
    }

    if (settings['recent_orders_data'] !== undefined) {
      const recentOrders = await prisma.order.findMany({
        where: { userId: user_id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: {
            include: { profile: true }
          },
          items: true,
          address: true,
        }
      });

      resp.recent_orders = recentOrders.map(order => {
        const hasProfile = order.user?.profile;
        const name = hasProfile
          ? `${order.user?.profile?.firstName ?? ''} ${order.user?.profile?.lastName ?? ''}`.trim()
          : order.address?.fullName ?? order.user?.email ?? 'Guest';

        return {
          id: order.id,
          total_amount: order.totalAmount,
          status: order.status,
          created_at: order.createdAt,
          customer_name: name,
          item_count: order.items.reduce((sum, item) => sum + item.quantity, 0),
        };
      });
    }

    // if (settings['recent_payment_transactions_data'] !== undefined) {
    //   resp.recent_payment_transactions = await prisma.order.findMany({
    //     where: { userId: user_id, payment: { isNot: null } },
    //     include: { payment: true },
    //     orderBy: { updatedAt: 'desc' },
    //     take: 5,
    //   }).then(list => list.map(o => o.payment));
    // }

    if (settings['recent_payment_transactions_data'] !== undefined) {
      const recentPayments = await prisma.order.findMany({
        where: {
          payment: { isNot: null },
          createdAt: { gte: start, lte: end },
        },
        include: {
          payment: true,
          user: {
            include: { profile: true },
          },
          address: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      });

      resp.recent_payment_transactions = recentPayments.map(order => {
        const hasProfile = order.user?.profile;
        const name = hasProfile
          ? `${order.user?.profile?.firstName ?? ''} ${order.user?.profile?.lastName ?? ''}`.trim()
          : order.address?.fullName ?? order.user?.email ?? 'Guest';

        return {
          id: order.payment?.id,
          method: order.payment?.method,
          status: order.payment?.status,
          transactionId: order.payment?.transactionId,
          amount: order?.totalAmount,
          paidAt: order.payment?.paidAt,
          createdAt: order.payment?.createdAt,
          user_id: order.userId,
          customer_name: name,
          customer_email: order.user?.email ?? '',
          // updated_at: order.payment?.updatedAt,
        };
      });
    }

    if (settings['low_stock_products_data'] !== undefined) {
      const company = await prisma.companySettings.findFirst();
      const threshold = company?.product_low_stock_threshold ?? 5;

      const lowStockProducts = await prisma.product.findMany({
        where: { isDeleted: false, stock: { gt: 0, lt: threshold } },
        include: {
          category: true,
          images: {
            orderBy: { sequence: 'asc' },
            take: 1
          }
        }
      });

      resp.low_stock_products = lowStockProducts.map(product => ({
        id: product.id,
        name: product.name,
        stock: product.stock,
        image: product.images?.[0]?.image ?? null,
        category: product.category?.name ?? 'Uncategorized'
      }));
    }

    res.json(resp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUserDashboardSections = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;

    if (typeof user_id !== "number") {
      res.status(400).json({ message: "user_id (number) is required." });
      return
    }

    const sections = [
      "order_data",
      "recent_payment_transactions_data",
      "least_selling_products_data",
      "user_data",
      "product_data",
      "recent_orders_data",
      "unsold_products_data",
      "top_selling_products_data",
      "top_customers_data",
      "low_stock_products_data",
      "new_customer_count",
      "average_order_value",
      "products_sold",
      "revenue_data",
    ];

    res.status(200).json({ succes: true, sections });
  } catch (error: any) {
    console.error("Error returning dashboard sections:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const upsertDashboardSetting = async (req: Request, res: Response) => {
  const { user_id, components } = req.body;

  if (typeof user_id !== 'number' || typeof components !== 'object') {
    res.status(400).json({ message: 'Invalid input' });
    return
  }

  try {
    const operations = Object.entries(components).map(([key, value]) =>
      prisma.dashboardSetting.upsert({
        where: { userId_key: { userId: user_id, key } },
        update: { value: Boolean(value) },
        create: { userId: user_id, key, value: Boolean(value) },
      })
    );

    await prisma.$transaction(operations);

    res.status(200).json({
      success: true,
      message: 'Dashboard settings saved',
      settings: components,
    });
  } catch (error) {
    console.error("Upsert dashboard settings error:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
};